import { requireReportsAccess } from "@/lib/reports/access";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireReportsAccess();
  return children;
}
