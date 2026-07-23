const employeeTabs = [
  { id: "personal", label: "Personal" },
  { id: "address", label: "Address" },
  { id: "emergency", label: "Emergency" },
  { id: "employment", label: "Employment" },
  { id: "bank", label: "Bank" },
  { id: "security", label: "Security" },
] as const;

export type EmployeeTabId = (typeof employeeTabs)[number]["id"];

export function isEmployeeTab(value: string | undefined): value is EmployeeTabId {
  return employeeTabs.some((tab) => tab.id === value);
}

export { employeeTabs };
