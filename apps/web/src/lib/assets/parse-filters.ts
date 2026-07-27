import type { AssetStatus } from "@hrms/domain";

import type { AssetRegisterFilters } from "./types";

export function parseAssetRegisterFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AssetRegisterFilters {
  const read = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const status = read("status");
  const validStatuses: AssetStatus[] = ["available", "assigned", "returned", "disposed"];

  return {
    status: validStatuses.includes(status as AssetStatus) ? (status as AssetStatus) : undefined,
    categoryId: read("categoryId") || undefined,
    branchId: read("branchId") || undefined,
    assigneeId: read("assigneeId") || undefined,
    q: read("q") || undefined,
  };
}

export function buildAssetRegisterHref(filters: AssetRegisterFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.branchId) params.set("branchId", filters.branchId);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.q) params.set("q", filters.q);
  const query = params.toString();
  return query ? `/hr/assets?${query}` : "/hr/assets";
}
