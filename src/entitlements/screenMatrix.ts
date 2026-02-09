import { uiGate } from "./uiGate";

export const CAP = {
  // Facility OS
  FAC_TEAM: "facility.team",
  FAC_COMPLIANCE: "facility.compliance",
  FAC_SOPS: "facility.sops",
  FAC_AUDIT: "facility.audit",
  FAC_METRC: "facility.metrc",
  FAC_TASK_VERIFY: "facility.task_verification",
  FAC_OPS_ANALYTICS: "facility.ops_analytics",

  // Tools
  TOOL_VPD: "tools.vpd",
  TOOL_HARVEST: "tools.harvest_estimator",
  TOOL_PHENO_MATRIX: "tools.pheno_matrix"
} as const;

export const ScreenMatrix = {
  // Core surfaces
  GrowsList: {
    requiredCaps: [],
    actions: {
      createGrow: { type: "facilityRole", allow: ["OWNER", "MANAGER", "STAFF"] }
    }
  },
  GrowDetail: {
    requiredCaps: [],
    actions: {
      editGrow: { type: "facilityRole", allow: ["OWNER", "MANAGER", "STAFF"] },
      deleteGrow: { type: "facilityRole", allow: ["OWNER", "MANAGER"] },
      viewLogs: { type: "none" }
    }
  },
  GrowLogEntries: {
    requiredCaps: [],
    actions: {
      createEntry: { type: "facilityRole", allow: ["OWNER", "MANAGER", "STAFF"] },
      deleteEntry: { type: "facilityRole", allow: ["OWNER", "MANAGER"] }
    }
  },
  Tasks: {
    requiredCaps: [],
    actions: {
      createTask: { type: "facilityRole", allow: ["OWNER", "MANAGER", "STAFF"] },
      completeTask: { type: "facilityRole", allow: ["OWNER", "MANAGER", "STAFF"] }
    }
  },

  // Admin facility surfaces
  FacilityTeam: {
    requiredCaps: [CAP.FAC_TEAM],
    actions: {
      invite: { type: "facilityRole", allow: ["OWNER", "MANAGER"] }
    }
  }
} as const;

export function screenAccessGate(ent: any, screenKey: keyof typeof ScreenMatrix) {
  const req = ScreenMatrix[screenKey].requiredCaps || [];
  for (const cap of req) {
    if (uiGate(ent, cap, { behaviorMissingCap: "hidden" }) !== "enabled") return "hidden";
  }
  return "enabled";
}

export function actionGate(
  ent: any,
  screenKey: keyof typeof ScreenMatrix,
  actionKey: string
) {
  const action: any = (ScreenMatrix as any)[screenKey]?.actions?.[actionKey];
  if (!action) return "enabled";
  if (action.type === "none") return "enabled";

  if (action.type === "facilityRole") {
    if (!ent?.facilityRole) return "cta";
    return action.allow.includes(ent.facilityRole) ? "enabled" : "hidden";
  }

  if (action.type === "cap") {
    return uiGate(ent, action.cap, { behaviorMissingCap: "cta" });
  }

  return "enabled";
}
