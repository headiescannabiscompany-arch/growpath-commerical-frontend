const BASE = "/api";

export function facilityPath(facilityId: string, path: string) {
  if (!facilityId) throw new Error("facilityId required");
  return `${BASE}/facility/${facilityId}${path}`;
}

export const endpoints = {
  // user
  me: `${BASE}/me`,

  // facilities
  facilities: `${BASE}/facilities`,

  // plants
  plants: (facilityId: string) => facilityPath(facilityId, "/plants"),
  plant: (facilityId: string, id: string) => facilityPath(facilityId, `/plants/${id}`),

  // tasks
  tasks: (facilityId: string) => facilityPath(facilityId, "/tasks"),
  task: (facilityId: string, id: string) => facilityPath(facilityId, `/tasks/${id}`),

  // inventory
  inventory: (facilityId: string) => facilityPath(facilityId, "/inventory"),
  inventoryItem: (facilityId: string, id: string) =>
    facilityPath(facilityId, `/inventory/${id}`),

  // grows
  grows: (facilityId: string) => facilityPath(facilityId, "/grows"),
  grow: (facilityId: string, id: string) => facilityPath(facilityId, `/grows/${id}`),

  // growlogs
  growlogs: (facilityId: string) => facilityPath(facilityId, "/growlogs"),
  growlog: (facilityId: string, id: string) =>
    facilityPath(facilityId, `/growlogs/${id}`),

  // green waste
  greenWaste: (facilityId: string) => facilityPath(facilityId, "/green-waste"),
  greenWasteLog: (facilityId: string, id: string) =>
    facilityPath(facilityId, `/green-waste/${id}`),

  // rooms
  rooms: (facilityId: string) => facilityPath(facilityId, "/rooms"),
  room: (facilityId: string, id: string) => facilityPath(facilityId, `/rooms/${id}`),

  // deviations
  deviations: (facilityId: string) => facilityPath(facilityId, "/deviations"),
  deviation: (facilityId: string, id: string) =>
    facilityPath(facilityId, `/deviations/${id}`),

  // verification
  verification: (facilityId: string) => `${BASE}/facilities/${facilityId}/verification`,
  verificationRecord: (facilityId: string, id: string) =>
    `${BASE}/facilities/${facilityId}/verification/${id}`,
  verificationReject: (facilityId: string, id: string) =>
    `${BASE}/facilities/${facilityId}/verification/${id}/reject`,

  // SOP templates
  sopTemplates: (facilityId: string) => `${BASE}/facilities/${facilityId}/sop-templates`,
  sopTemplate: (facilityId: string, id: string) =>
    `${BASE}/facilities/${facilityId}/sop-templates/${id}`,

  // vendors (facility scoped via query)
  vendors: `${BASE}/vendors`,
  vendor: (id: string) => `${BASE}/vendors/${id}`,

  // vendor signup (public endpoint)
  vendorSignup: `${BASE}/vendors/signup`,

  // feed / global utilities (non facility-scoped)
  feed: `${BASE}/feed`,

  // tasks (global, non facility-scoped)
  tasksGlobal: `${BASE}/tasks`,
  taskGlobal: (id: string) => `${BASE}/tasks/${id}`,

  // alerts (global, non facility-scoped)
  alertsGlobal: `${BASE}/alerts`,
  alertGlobal: (id: string) => `${BASE}/alerts/${id}`,

  // legacy global growlog endpoint (non facility-scoped)
  growlogLegacy: `${BASE}/growlog`,

  // live sessions (non facility-scoped)
  liveHost: `${BASE}/live/host`,
  liveJoin: `${BASE}/live/join`,
  liveEnd: `${BASE}/live/end`,

  // debug / health (non facility-scoped)
  health: `${BASE}/health`,
  debugInfo: `${BASE}/debug/info`,

  // billing
  facilityBillingStatus: `${BASE}/facility-billing/status`,
  facilityBillingCheckout: `${BASE}/facility-billing/checkout-session`,
  facilityBillingCancel: `${BASE}/facility-billing/cancel`,

  // subscription
  subscriptionStatus: `${BASE}/subscribe/status`,

  // team
  team: (facilityId: string) => facilityPath(facilityId, "/team")
};
