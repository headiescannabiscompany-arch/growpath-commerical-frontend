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

  // rooms
  rooms: (facilityId: string) => facilityPath(facilityId, "/rooms"),
  room: (facilityId: string, id: string) => facilityPath(facilityId, `/rooms/${id}`),

  // team
  team: (facilityId: string) => facilityPath(facilityId, "/team")
};
