// src/navigation/buildTabs.js
import { PAGE_REGISTRY } from "./pageRegistry";

export function hasCap(capabilities, key) {
  if (!capabilities || !key) return false;
  return capabilities[key] === true;
}

export function buildVisibleTabs(capabilities, { mode } = {}) {
  const visible = PAGE_REGISTRY.filter((p) => hasCap(capabilities, p.capability));

  // Safety fallback: never render 0 tabs
  if (visible.length === 0) {
    return PAGE_REGISTRY.filter((p) => ["nav.dashboard", "nav.profile"].includes(p.capability));
  }

  // Optional: mode-based preference ordering (does not override capability)
  if (mode === "facility") {
    const priority = new Set([
      "FacilityDashboard",
      "FacilityJobs",
      "Tasks",
      "Grows",
      "Plants",
      "Analytics",
      "Calendar",
      "Courses",
      "Forum",
      "Profile",
    ]);
    return visible.sort((a, b) => (priority.has(b.name) ? 1 : 0) - (priority.has(a.name) ? 1 : 0));
  }

  return visible;
}
