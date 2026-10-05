import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { getConfirmationLetter } from "@/lib/employees/probation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ employeeId: string }> },
) {
  await requireRole("hr_administrator");
  const { employeeId } = await context.params;
  const letter = await getConfirmationLetter(employeeId);

  if (!letter) {
    notFound();
  }

  return new Response(Buffer.from(letter.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${letter.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
