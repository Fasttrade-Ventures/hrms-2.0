export function rolesCanAccessFolder(
  accessRoles: string[] | null | undefined,
  userRoles: string[],
): boolean {
  if (userRoles.includes("hr_administrator")) return true;
  if (!accessRoles || accessRoles.length === 0) return true;
  return accessRoles.some((role) => userRoles.includes(role));
}
