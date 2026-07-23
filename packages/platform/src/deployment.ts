export type DeploymentMode = "standalone" | "saas";

export function getDeploymentMode(): DeploymentMode {
  const mode = process.env.DEPLOYMENT_MODE;
  return mode === "saas" ? "saas" : "standalone";
}

export function isSaasMode(): boolean {
  return getDeploymentMode() === "saas";
}
