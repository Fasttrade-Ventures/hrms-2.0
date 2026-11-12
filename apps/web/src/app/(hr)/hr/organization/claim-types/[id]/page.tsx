import { redirect } from "next/navigation";

export default async function ClaimTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/hr/organization/claim-types/${id}/edit`);
}

