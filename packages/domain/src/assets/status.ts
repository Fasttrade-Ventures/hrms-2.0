export type AssetStatus = "available" | "assigned" | "returned" | "disposed";
export type AssetAction = "assign" | "return" | "dispose" | "reassign";
export type ReturnDestination = "to_inventory" | "pending_inspection";

const ALLOWED: Record<AssetStatus, Partial<Record<AssetAction, AssetStatus>>> = {
  available: { assign: "assigned", dispose: "disposed" },
  assigned: { return: "returned", dispose: "disposed", reassign: "assigned" },
  returned: { assign: "assigned", dispose: "disposed" },
  disposed: {},
};

export function assertAssetStatusTransition(
  from: AssetStatus,
  to: AssetStatus,
  action: AssetAction,
): void {
  const expected = ALLOWED[from]?.[action];
  if (expected !== to) {
    throw new Error(`Cannot ${action} asset while status is ${from}.`);
  }
}

export function assertAssetActionAllowed(from: AssetStatus, action: AssetAction): void {
  if (!ALLOWED[from]?.[action]) {
    throw new Error(`Cannot ${action} asset while status is ${from}.`);
  }
}

export function nextAssetStatusAfterReturn(
  destination: ReturnDestination,
): "available" | "returned" {
  return destination === "to_inventory" ? "available" : "returned";
}
