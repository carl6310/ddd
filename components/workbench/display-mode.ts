export type WorkbenchDisplayMode = "writing" | "debug";

export const workbenchDisplayModeStorageKey = "workbench-display-mode";

export function normalizeWorkbenchDisplayMode(value: string | null): WorkbenchDisplayMode {
  return value === "debug" ? "debug" : "writing";
}
