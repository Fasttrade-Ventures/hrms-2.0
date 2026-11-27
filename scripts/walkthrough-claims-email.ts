import fs from "fs";
import path from "path";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.resolve("apps/web/.env.local"));
loadEnvFile(path.resolve("apps/web/.env"));

import { createAdminClient } from "../apps/web/src/lib/supabase/admin";
import { submitForApproval, actOnApproval } from "../apps/web/src/lib/approvals/service";

async function runLiveWalkthrough() {
  const admin = createAdminClient();
  const orgId = "00000000-0000-0000-0000-000000000001";
  const employeeId = "4cae812d-a2f0-4fa8-9e58-6923b7ff804e"; // Employee Demo
  const managerEmployeeId = "db9fa00c-b26a-4952-b88a-360e201b1b01"; // Manager Demo
  const claimTypeId = "11111111-0000-0000-0000-000000000001"; // Medical

  console.log("================================================================================");
  console.log("             HIRIX HR TRANSACTIONAL EMAIL NOTIFICATION WALKTHROUGH              ");
  console.log("================================================================================\n");

  // Step 1: Create a test claim in database
  console.log("▶ [STEP 1/3] Employee 'Employee Demo' submits a claim for RM 150.00 (Medical)");
  const { data: claim, error: claimErr } = await admin
    .from("claims")
    .insert({
      organization_id: orgId,
      employee_id: employeeId,
      claim_type_id: claimTypeId,
      amount: "150.00",
      receipt_date: new Date().toISOString().slice(0, 10),
      description: "General health screening and medication",
      status: "draft",
    })
    .select("id")
    .single();

  if (claimErr || !claim) {
    throw new Error(`Failed to create claim: ${claimErr?.message}`);
  }
  console.log(`  ✓ Claim record created: ID = ${claim.id}`);

  // Fetch actor user id for the employee
  const { data: empMem } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("employee_id", employeeId)
    .single();

  const actorUserId = empMem?.user_id ?? "00000000-0000-0000-0000-000000000002";

  // Submit for approval
  console.log("  → Submitting claim to approval engine (submitForApproval)...");
  const requestId = await submitForApproval({
    organizationId: orgId,
    requesterEmployeeId: employeeId,
    requestType: "claim",
    sourceTable: "claims",
    sourceId: claim.id,
    payload: {
      claimTypeName: "Medical",
      amount: "150.00",
      receiptDate: new Date().toISOString().slice(0, 10),
      attachmentFileName: "medical-invoice.pdf",
      description: "General health screening and medication",
    },
    actorUserId,
    client: admin,
  });
  console.log(`  ✓ Approval request created: ID = ${requestId}`);

  // Query notification_outbox
  console.log("\n▶ [STEP 2/3] Checking 'notification_outbox' entries dispatched on submission:");
  const { data: outboxOnSubmit } = await admin
    .from("notification_outbox")
    .select("id, channel, template, status, payload")
    .eq("organization_id", orgId)
    .like("idempotency_key", `%${requestId}%`)
    .order("created_at", { ascending: true });

  for (const n of outboxOnSubmit ?? []) {
    const p = n.payload as Record<string, unknown>;
    console.log(`\n  📬 [Channel: ${n.channel.toUpperCase()}] Template: ${n.template}`);
    console.log(`     • Recipient: ${p.recipientName ?? p.employeeName ?? "User"} (${p.recipientEmail ?? "system-resolved"})`);
    console.log(`     • Summary:   ${p.requestSummary}`);
    console.log(`     • Status:    ${n.status}`);
    if (p.href) console.log(`     • Action URL: ${p.href}`);
  }

  // Get the pending step id
  const { data: step } = await admin
    .from("approval_steps")
    .select("id, approver_employee_id")
    .eq("approval_request_id", requestId)
    .eq("status", "pending")
    .single();

  if (!step) {
    throw new Error("No pending approval step found.");
  }

  // Fetch manager user id
  const { data: mgrMem } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("employee_id", managerEmployeeId)
    .single();

  console.log("\n▶ [STEP 3/3] Line Manager 'Manager Demo' reviews and APPROVES the claim:");
  console.log(`  → Calling actOnApproval(stepId: ${step.id}, event: 'approve')...`);
  await actOnApproval({
    stepId: step.id,
    actorEmployeeId: managerEmployeeId,
    actorUserId: mgrMem?.user_id ?? actorUserId,
    organizationId: orgId,
    event: "approve",
    comment: "Approved - medical claims within annual entitlement.",
  });
  console.log("  ✓ Step approved and claim marked 'approved'!");

  // Query outcome notifications in outbox
  const { data: outboxOnApprove } = await admin
    .from("notification_outbox")
    .select("id, channel, template, status, payload")
    .eq("organization_id", orgId)
    .eq("template", "approval.approve")
    .like("idempotency_key", `%${requestId}%`)
    .order("created_at", { ascending: true });

  for (const n of outboxOnApprove ?? []) {
    const p = n.payload as Record<string, unknown>;
    console.log(`\n  🎉 [Channel: ${n.channel.toUpperCase()}] Template: ${n.template}`);
    console.log(`     • Recipient: ${p.employeeName} (${p.recipientEmail ?? "system-resolved"})`);
    console.log(`     • Summary:   ${p.requestSummary}`);
    console.log(`     • Decision:  Status = APPROVED`);
    if (p.comment) console.log(`     • Remarks:   "${p.comment}"`);
    console.log(`     • Portal:    ${p.href}`);
  }

  // Cleanup test claim & notifications so database is clean
  console.log("\n🧹 Cleaning up test walkthrough data...");
  await admin.from("notification_outbox").delete().like("idempotency_key", `%${requestId}%`);
  await admin.from("approval_steps").delete().eq("approval_request_id", requestId);
  await admin.from("approval_requests").delete().eq("id", requestId);
  await admin.from("claims").delete().eq("id", claim.id);
  console.log("  ✓ Test artifacts cleaned up. Database is pristine.\n");

  console.log("================================================================================");
  console.log("                        LIVE WALKTHROUGH COMPLETE ✅                           ");
  console.log("================================================================================");
}

runLiveWalkthrough().catch((err) => {
  console.error("Walkthrough failed:", err);
  process.exit(1);
});
