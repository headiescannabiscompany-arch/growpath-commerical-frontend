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
      return "/home/facility/(tabs)/dashboard";
    case "tasks":
      return "/home/facility/(tabs)/tasks";
    case "inventory":
      return "/home/facility/(tabs)/inventory";
    case "rooms":
      return "/home/facility/(tabs)/rooms";
    case "team":
      return "/home/facility/(tabs)/team";
    case "compliance":
      return "/home/facility/(tabs)/compliance";
    case "sops":
      return "/home/facility/(tabs)/sop-runs";
    default:
      return "/home/facility";
  }
}
