export type DeveloperApiTab = "api" | "bukucloud" | "virtual-hirix";

export function parseDeveloperApiTab(raw: string | null | undefined): DeveloperApiTab {
  if (raw === "bukucloud" || raw === "virtual-hirix" || raw === "api") return raw;
  return "api";
}
