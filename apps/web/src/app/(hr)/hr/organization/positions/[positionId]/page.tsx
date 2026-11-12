import { redirect } from "next/navigation";

export default async function PositionDetailPage({
  params,
}: {
  params: Promise<{ positionId: string }>;
}) {
  const { positionId } = await params;
  redirect(`/hr/organization/positions/${positionId}/edit`);
}

