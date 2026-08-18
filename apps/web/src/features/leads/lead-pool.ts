export type LeadPoolStatus = "new" | "recovered" | "discarded";

export function getLeadPoolProgress(impactCount: number) {
  return `Impacto ${Math.min(Math.max(impactCount, 1), 3)} de 3`;
}

export function isAssignableLeadPool(poolStatus: LeadPoolStatus) {
  return poolStatus !== "discarded";
}
