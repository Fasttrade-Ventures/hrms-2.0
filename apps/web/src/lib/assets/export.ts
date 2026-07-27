import { rowsToCsv } from "@hrms/domain";

import type { AssetListRow } from "@/lib/assets/types";

export function assetsToCsv(assets: AssetListRow[]): string {
  const headers = ["Name", "Category", "Serial", "Status", "Assignee", "Branch", "Assigned at"];
  const rows = assets.map((asset) => [
    asset.name,
    asset.categoryName ?? "",
    asset.serialNumber ?? "",
    asset.status,
    asset.assigneeName ?? "Unassigned",
    asset.branchName ?? "",
    asset.assignedAt ?? "",
  ]);
  return rowsToCsv(headers, rows);
}
