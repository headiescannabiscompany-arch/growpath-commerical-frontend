import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type Room = {
  id: string;
  name: string;
  createdAt: string;
  roomType?: string;
  trackingMode?: string;
  zoneName?: string;
  zoneId?: string;
  stage?: string;
  lastActivityAt?: string;
  plantCount?: number;
  lightCount?: number;
  environmentType?: string;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  location?: { city?: string; region?: string; postalCode?: string; country?: string };
  baselines?: Record<string, unknown>;
  roomProfile?: Record<string, unknown>;
};

export type RoomDraft = Omit<Partial<Room>, "id" | "createdAt"> & { name: string };

function normalizeRoom(raw: any): Room | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw._id ?? raw.roomId ?? "");
  if (!id) return null;
  return {
    ...raw,
    id,
    name: String(raw.name ?? raw.title ?? id)
  };
}

function normalizeRoomsResponse(response: any): Room[] {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.rooms)
      ? response.rooms
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data?.rooms)
          ? response.data.rooms
          : Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.data)
              ? response.data
              : [];

  return rows.map(normalizeRoom).filter(Boolean) as Room[];
}

export async function fetchRooms(facilityId: string): Promise<Room[]> {
  const listRes = await apiRequest(endpoints.rooms(facilityId));
  return normalizeRoomsResponse(listRes);
}

export async function createRoom(facilityId: string, data: RoomDraft) {
  const createRes = await apiRequest(endpoints.rooms(facilityId), {
    method: "POST",
    body: data
  });
  return normalizeRoom(createRes?.created ?? createRes?.room ?? createRes);
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
