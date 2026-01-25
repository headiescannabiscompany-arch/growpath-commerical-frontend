import type { FacilityAction } from "./actions";

export type FacilityRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";

const ALL: FacilityAction[] = [
  "task.view",
  "task.create",
  "task.edit",
  "task.assign",
  "task.complete",
  "team.view",
  "team.invite",
  "team.role.change",
  "team.remove",
  "compliance.view",
  "compliance.create",
  "compliance.signoff",
  "compliance.export",
  "facility.settings.view",
  "facility.settings.edit"
];

export const RolePolicy: Record<FacilityRole, Set<FacilityAction>> = {
  OWNER: new Set(ALL),
  ADMIN: new Set(ALL),
  MANAGER: new Set([
    "task.view",
    "task.create",
    "task.edit",
    "task.assign",
    "task.complete",
    "team.view",
    "team.invite",
    "compliance.view",
    "compliance.create",
    "compliance.signoff",
    "facility.settings.view"
  ]),
  STAFF: new Set([
    "task.view",
    "task.create",
    "task.edit",
    "task.complete",
    "team.view",
    "compliance.view",
    "compliance.create"
  ]),
  VIEWER: new Set(["task.view", "team.view", "compliance.view", "facility.settings.view"])
};
