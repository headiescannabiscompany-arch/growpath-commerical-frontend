const BASE = "/api";

export function facilityPath(facilityId: string, path: string) {
  if (!facilityId) throw new Error("facilityId required");
  return `${BASE}/facility/${facilityId}${path}`;
}

export const endpoints = {
  me: `${BASE}/me`,
  facilities: `${BASE}/facilities`,
  plants: (facilityId: string) => facilityPath(facilityId, "/plants"),
  plant: (facilityId: string, id: string) => facilityPath(facilityId, `/plants/${id}`),
  tasks: (facilityId: string) => facilityPath(facilityId, "/tasks"),
  task: (facilityId: string, id: string) => facilityPath(facilityId, `/tasks/${id}`),
  inventory: (facilityId: string) => facilityPath(facilityId, "/inventory"),
  grows: (facilityId: string) => facilityPath(facilityId, "/grows"),
  team: (facilityId: string) => facilityPath(facilityId, "/team"),
  rooms: (facilityId: string) => facilityPath(facilityId, "/rooms"),
  room: (facilityId: string, id: string) => facilityPath(facilityId, `/rooms/${id}`)
};
