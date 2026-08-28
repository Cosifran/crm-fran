export type NextBestActionWorkMode = "caller" | "closer";

export function availableWorkModes(
  roleId: string | null | undefined,
  permissions: readonly string[],
): NextBestActionWorkMode[] {
  if (permissions.includes("*")) return ["caller", "closer"];
  if (roleId === "role-caller") return ["caller"];
  if (roleId === "role-closer") return ["closer"];
  return [];
}

export function normalizeWorkMode(
  persistedMode: string | null | undefined,
  availableModes: readonly NextBestActionWorkMode[],
): NextBestActionWorkMode {
  if (persistedMode === "caller" && availableModes.includes("caller")) return "caller";
  if (persistedMode === "closer" && availableModes.includes("closer")) return "closer";
  return availableModes[0] ?? "caller";
}
