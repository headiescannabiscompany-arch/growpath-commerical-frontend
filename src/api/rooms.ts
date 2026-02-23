import { apiRequest } from "./apiRequest";
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
  const listRes = await apiRequest(endpoints.rooms(facilityId));
  return listRes?.rooms ?? listRes?.data ?? listRes ?? [];
}

export async function createRoom(
  facilityId: string,
  data: { name: string; roomType?: string; trackingMode?: string }
) {
  const createRes = await apiRequest(endpoints.rooms(facilityId), {
    method: "POST",
    body: data
  });
  return createRes?.created ?? createRes?.room ?? createRes;
}
