export type Plan = "free" | "pro" | "commercial" | "facility";
export type Mode = "personal" | "commercial" | "facility";
export type FacilityRole = "OWNER" | "MANAGER" | "TECH" | "VIEWER";
export type CapabilityKey =
  | "FEED_VIEW"
  | "TASKS_VIEW"
  | "TASKS_EDIT"
  | "ALERTS_VIEW"
  | "ALERTS_ACK"
  | "GROWS_VIEW"
  | "GROWS_EDIT"
  | "PLANTS_VIEW"
  | "PLANTS_EDIT"
  | "TEAM_VIEW"
  | "TEAM_MANAGE"
  | "EXPORT_COMPLIANCE"
  | "AI_ASSISTANT";
export type LimitKey =
  | "maxPlants"
  | "maxGrows"
  | "maxFacilities"
  | "maxTeamMembers"
  | "maxCameras"
  | "maxIntegrations";
export type EntitlementsPayload = {
  capabilities: Record<string, boolean>;
  limits: Record<string, number>;
};
export type UserMeResponse = {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  session: {
    mode: Mode;
    plan: Plan;
    facilityId?: string;
    facilityRole?: FacilityRole | string;
  };
  entitlements: EntitlementsPayload;
};
