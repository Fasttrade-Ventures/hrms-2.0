export type PolicyAckState = {
  policyId: string;
  policyVersion: number;
  acknowledgedVersion: number | null;
};

export function needsAcknowledgement(state: PolicyAckState): boolean {
  return state.acknowledgedVersion !== state.policyVersion;
}

export function employeesMissingAcknowledgement<T extends { id: string; status: string }>(
  employees: T[],
  acknowledgements: { employeeId: string; version: number }[],
  policyVersion: number,
): T[] {
  const acknowledged = new Set(
    acknowledgements
      .filter((row) => row.version === policyVersion)
      .map((row) => row.employeeId),
  );

  return employees.filter((employee) => employee.status === "active" && !acknowledged.has(employee.id));
}
