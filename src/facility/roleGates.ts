export type FacilityRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER";

export type Action =
  | "GROWS_CREATE"
  | "GROWS_UPDATE"
  | "GROWS_DELETE"
  | "PLANTS_CREATE"
  | "PLANTS_UPDATE"
  | "PLANTS_DELETE"
  | "TASKS_CREATE"
  | "TASKS_UPDATE"
  | "TASKS_DELETE"
  | "INVENTORY_CREATE"
  | "INVENTORY_UPDATE"
  | "INVENTORY_DELETE"
  | "GROWLOGS_CREATE"
  | "GROWLOGS_UPDATE"
  | "GROWLOGS_DELETE"
  | "ROOMS_CREATE"
  | "ROOMS_UPDATE"
  | "ROOMS_DELETE"
  | "TEAM_INVITE"
  | "TEAM_UPDATE_ROLE"
  | "TEAM_REMOVE";

const R = {
  OWNER: 4,
  MANAGER: 3,
  STAFF: 2,
  VIEWER: 1
} as const;

function atLeast(role: FacilityRole, min: FacilityRole) {
  return R[role] >= R[min];
}

// NOTE: mirror docs/ROLE_MATRIX.md exactly.
export function can(role: FacilityRole | null | undefined, action: Action): boolean {
  if (!role) return false;

  switch (action) {
    case "GROWS_CREATE":
      return role === "OWNER" || role === "MANAGER"; // STAFF denied
    case "GROWS_UPDATE":
      return role === "OWNER" || role === "MANAGER";
    case "GROWS_DELETE":
      return role === "OWNER"; // if your matrix differs, change here

    case "PLANTS_CREATE":
      return atLeast(role, "STAFF");
    case "PLANTS_UPDATE":
      return atLeast(role, "STAFF");
    case "PLANTS_DELETE":
      return role === "OWNER";

    case "TASKS_CREATE":
      return atLeast(role, "STAFF");
    case "TASKS_UPDATE":
      return atLeast(role, "STAFF");
    case "TASKS_DELETE":
      return role === "OWNER" || role === "MANAGER";

    case "INVENTORY_CREATE":
      return atLeast(role, "STAFF");
    case "INVENTORY_UPDATE":
      return atLeast(role, "STAFF");
    case "INVENTORY_DELETE":
      return role === "OWNER";

    case "GROWLOGS_CREATE":
      return atLeast(role, "STAFF");
    case "GROWLOGS_UPDATE":
      return atLeast(role, "STAFF");
    case "GROWLOGS_DELETE":
      return role === "OWNER" || role === "MANAGER";

    case "ROOMS_CREATE":
      return atLeast(role, "STAFF");
    case "ROOMS_UPDATE":
      return atLeast(role, "STAFF");
    case "ROOMS_DELETE":
      return role === "OWNER" || role === "MANAGER"; // adjust if needed

    case "TEAM_INVITE":
      return role === "OWNER" || role === "MANAGER";
    case "TEAM_UPDATE_ROLE":
      return role === "OWNER" || role === "MANAGER";
    case "TEAM_REMOVE":
      return role === "OWNER" || role === "MANAGER";

    default:
      return false;
  }
}
