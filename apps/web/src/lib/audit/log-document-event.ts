import { logAuditEvent } from "@/lib/audit/log-event";

type DocumentAuditInput = {
  organizationId?: string;
  actorUserId: string | null;
  action: "document.uploaded" | "document.replaced" | "document.deleted" | "document.downloaded";
  documentId: string;
  metadata?: Record<string, unknown>;
};

export async function logDocumentEvent(input: DocumentAuditInput): Promise<void> {
  await logAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.action,
    resourceType: "employee_document",
    resourceId: input.documentId,
    metadata: input.metadata,
  });
}
