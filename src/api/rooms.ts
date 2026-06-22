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

export async function updateRoom(
  facilityId: string,
  id: string,
  patch: Partial<Pick<Room, "name" | "roomType" | "trackingMode" | "stage">>
): Promise<Room> {
  const updateRes = await apiRequest(endpoints.room(facilityId, id), {
    method: "PATCH",
    body: patch
  });
  return updateRes?.updated ?? updateRes?.room ?? updateRes;
}

export async function deleteRoom(facilityId: string, id: string) {
  const deleteRes = await apiRequest(endpoints.room(facilityId, id), {
    method: "DELETE"
  });
  return deleteRes?.deleted ?? deleteRes?.ok ?? deleteRes;
}
