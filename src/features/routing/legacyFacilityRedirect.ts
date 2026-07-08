export type LegacyFacilitySection =
  | "dashboard"
  | "tasks"
  | "inventory"
  | "rooms"
  | "team"
  | "sops"
  | "compliance";

export function legacyFacilitySectionToRoute(section: LegacyFacilitySection): string {
  switch (section) {
    case "dashboard":
      return "/home/facility/dashboard";
    case "tasks":
      return "/home/facility/tasks";
    case "inventory":
      return "/home/facility/inventory";
    case "rooms":
      return "/home/facility/rooms";
    case "team":
      return "/home/facility/team";
    case "compliance":
      return "/home/facility/compliance";
    case "sops":
      return "/home/facility/sop-runs";
    default:
      return "/home/facility";
  }
}
