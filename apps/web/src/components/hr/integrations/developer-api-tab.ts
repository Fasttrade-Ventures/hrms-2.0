export type DeveloperApiTab = "api" | "bukucloud" | "virtual-hirix" | "hirix-core";

export function parseDeveloperApiTab(raw: string | null | undefined): DeveloperApiTab {
  if (raw === "bukucloud" || raw === "virtual-hirix" || raw === "hirix-core" || raw === "api") return raw;
  return "api";
}
