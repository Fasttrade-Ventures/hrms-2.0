import { redirect } from "next/navigation";

export default async function HolidayDetailPage({
  params,
}: {
  params: Promise<{ holidayId: string }>;
}) {
  const { holidayId } = await params;
  redirect(`/hr/organization/holidays/${holidayId}/edit`);
}

