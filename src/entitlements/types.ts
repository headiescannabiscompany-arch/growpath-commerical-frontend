export type Plan = "free" | "pro" | "commercial" | "facility";
export type Mode = "personal" | "commercial" | "facility";
export type FacilityRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER" | "TECH";
export type CapabilityKey = import("./capabilityKeys").CapabilityKey;
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
    plan?: Plan | string | null;
  };
  ctx: {
    mode: Mode;
    capabilities: Record<string, boolean>;
    limits: Record<string, number>;
    facilityId?: string | null;
    facilityRole?: FacilityRole | string | null;
    facilityFeaturesEnabled?: boolean;
  };
};
