export function formatProfileDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(value: number): string {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatEmploymentType(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    intern: "Intern",
  };
  return value ? labels[value] ?? value : "—";
}

export function formatConfirmationStatus(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    probation: "Probation",
    confirmed: "Confirmed",
    contract: "Contract",
  };
  return value ? labels[value] ?? value : "—";
}

export function formatGender(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
  };
  return value ? labels[value] ?? value : "—";
}

export function formatMaritalStatus(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    single: "Single",
    married: "Married",
    divorced: "Divorced",
    widowed: "Widowed",
  };
  return value ? labels[value] ?? value : "—";
}

export function formatPayBasis(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    monthly: "Monthly",
    daily: "Daily",
    hourly: "Hourly",
  };
  return value ? labels[value] ?? value : "—";
}

export function formatPortalRole(roles: string[] | null | undefined): string {
  if (!roles?.length) return "Employee";
  const labels: Record<string, string> = {
    employee: "Employee",
    manager: "Manager",
    hr_administrator: "HR Administrator",
    organization_owner: "Owner",
    platform_admin: "Platform admin",
    branch_admin: "Branch admin",
    director: "Director",
  };
  return roles.map((role) => labels[role] ?? role).join(", ");
}

export function tenureLabel(joinDate: string): string {
  const start = new Date(`${joinDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "—";

  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return "—";

  const years = Math.floor(months / 12);
  const remainder = months % 12;

  if (years === 0) return `${remainder} mo`;
  if (remainder === 0) return `${years} yr`;
  return `${years} yr ${remainder} mo`;
}

export function formatAddress(profile: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
}): string {
  const lines = [
    profile.addressLine1,
    profile.addressLine2,
    [profile.postcode, profile.city].filter(Boolean).join(" "),
    profile.state,
    profile.country === "MY" ? "Malaysia" : profile.country,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join(", ") : "—";
}
