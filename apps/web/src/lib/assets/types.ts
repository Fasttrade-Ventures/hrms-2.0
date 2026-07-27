import type { AssetCategoryField } from "@hrms/domain";
import type { AssetStatus } from "@hrms/domain";

export type AssetCondition = "new" | "good" | "fair" | "poor" | "damaged";
export type AssetRequestKind = "issue" | "return" | "replacement";
export type AssetRequestStatus = "open" | "resolved" | "cancelled";
export type ReturnDestination = "to_inventory" | "pending_inspection";

export type AssetCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  fieldSchema: AssetCategoryField[];
  sortOrder: number;
  isActive: boolean;
  assetCount?: number;
};

export type AssetListRow = {
  id: string;
  name: string;
  serialNumber: string | null;
  status: AssetStatus;
  categoryName: string;
  branchName: string | null;
  assigneeName: string | null;
  assignedAt: string | null;
};

export type AssetAssignmentRow = {
  id: string;
  employeeId: string | null;
  employeeName: string;
  employeeNumber: string | null;
  assignedAt: string;
  returnedAt: string | null;
  acknowledgedAt: string | null;
  notes: string | null;
};

export type AssetRequestRow = {
  id: string;
  kind: AssetRequestKind;
  status: AssetRequestStatus;
  message: string | null;
  employeeName: string;
  createdAt: string;
};

export type AssetDetail = AssetListRow & {
  categoryId: string;
  condition: AssetCondition | null;
  notes: string | null;
  purchaseDate: string | null;
  purchaseValue: number | null;
  warrantyExpiresOn: string | null;
  customValues: Record<string, unknown>;
  fieldSchema: AssetCategoryField[];
  activeAssignmentId: string | null;
  acknowledgedAt: string | null;
  assignments: AssetAssignmentRow[];
  openRequests: AssetRequestRow[];
};

export type EmployeeAssetAssignmentRow = {
  assignmentId: string;
  assetId: string;
  assetName: string;
  serialNumber: string | null;
  categoryName: string;
  assignedAt: string;
  acknowledgedAt: string | null;
};

export type AssetRegisterFilters = {
  status?: AssetStatus;
  categoryId?: string;
  branchId?: string;
  assigneeId?: string;
  q?: string;
};

export type MyAssetRow = {
  id: string;
  name: string;
  categoryName: string;
  serialNumber: string | null;
  assignedAt: string;
  acknowledgedAt: string | null;
  hasOpenRequest: boolean;
};

export type MyAssetDetail = MyAssetRow & {
  condition: AssetCondition | null;
  warrantyExpiresOn: string | null;
  customValues: Record<string, unknown>;
  fieldSchema: AssetCategoryField[];
  assignmentId: string;
  notes: string | null;
};
