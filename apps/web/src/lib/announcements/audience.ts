export type AnnouncementAudience = {
  branchId: string | null;
  targetRoles: string[];
  targetDepartmentIds: string[];
};

export type AnnouncementViewer = {
  branchId: string | null;
  departmentId: string | null;
  roles: string[];
};

export type AnnouncementVisibility = {
  status: "draft" | "published";
  displayFrom: string | null;
  displayUntil: string | null;
};

export function announcementMatchesAudience(
  announcement: AnnouncementAudience,
  viewer: AnnouncementViewer,
): boolean {
  if (announcement.branchId && announcement.branchId !== viewer.branchId) {
    return false;
  }

  if (announcement.targetRoles.length > 0) {
    const hasRole = announcement.targetRoles.some((role) => viewer.roles.includes(role));
    if (!hasRole) return false;
  }

  if (announcement.targetDepartmentIds.length > 0) {
    if (
      !viewer.departmentId ||
      !announcement.targetDepartmentIds.includes(viewer.departmentId)
    ) {
      return false;
    }
  }

  return true;
}

export function isAnnouncementInDisplayWindow(
  announcement: AnnouncementVisibility,
  today: string,
): boolean {
  if (announcement.status !== "published") return false;
  if (announcement.displayFrom && announcement.displayFrom > today) return false;
  if (announcement.displayUntil && announcement.displayUntil < today) return false;
  return true;
}

export type AnnouncementDisplayStatus = "draft" | "scheduled" | "active" | "expired";

export function getAnnouncementDisplayStatus(
  announcement: AnnouncementVisibility,
  today: string,
): AnnouncementDisplayStatus {
  if (announcement.status === "draft") return "draft";
  if (announcement.displayFrom && announcement.displayFrom > today) return "scheduled";
  if (announcement.displayUntil && announcement.displayUntil < today) return "expired";
  return "active";
}

export function summarizeAnnouncementAudience(input: {
  branchName: string | null;
  departmentNames: string[];
  targetRoles: string[];
}): string {
  const parts: string[] = [];

  if (input.branchName) parts.push(input.branchName);
  if (input.targetRoles.length > 0) {
    parts.push(
      input.targetRoles
        .map((role) => (role === "manager" ? "Managers" : "Employees"))
        .join(", "),
    );
  }
  if (input.departmentNames.length > 0) {
    parts.push(input.departmentNames.join(", "));
  }

  return parts.length > 0 ? parts.join(" · ") : "Everyone";
}
