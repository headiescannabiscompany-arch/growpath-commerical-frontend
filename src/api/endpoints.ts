const BASE = "/api";

export function facilityPath(facilityId: string, path: string) {
  if (!facilityId) throw new Error("facilityId required");
  return `${BASE}/facility/${facilityId}${path}`;
}

export const endpoints = {
  facilities: `${BASE}/facilities`,
  plants: (facilityId: string) => facilityPath(facilityId, "/plants"),
  plant: (facilityId: string, id: string) => facilityPath(facilityId, `/plants/${id}`),
  tasks: (facilityId: string) => facilityPath(facilityId, "/tasks"),
  inventory: (facilityId: string) => facilityPath(facilityId, "/inventory"),
  grows: (facilityId: string) => facilityPath(facilityId, "/grows"),
  team: (facilityId: string) => facilityPath(facilityId, "/team"),
  rooms: (facilityId: string) => facilityPath(facilityId, "/rooms"),
  room: (facilityId: string, id: string) => facilityPath(facilityId, `/rooms/${id}`)
};
