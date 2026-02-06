import { api } from "./client";
import { endpoints } from "./endpoints";

export type Room = {
  id: string;
  name: string;
  createdAt: string;
  roomType?: string;
  trackingMode?: string;
  stage?: string;
  lastActivityAt?: string;
};

export async function fetchRooms(facilityId: string): Promise<Room[]> {
  const res = await api.get(endpoints.rooms(facilityId));
  return res?.rooms ?? res?.data ?? res ?? [];
}

export async function createRoom(
  facilityId: string,
  data: { name: string; roomType?: string; trackingMode?: string }
) {
  const res = await api.post(endpoints.rooms(facilityId), data);
  return res?.created ?? res?.room ?? res;
}
