import { api } from "./client";

export type Room = {
  id: string;
  name: string;
  createdAt: string;
};

export async function fetchRooms(facilityId: string): Promise<Room[]> {
  const res = await api.get(`/facilities/${facilityId}/rooms`);
  return res.data;
}

export async function createRoom(facilityId: string, data: { name: string }) {
  const res = await api.post(`/facilities/${facilityId}/rooms`, data);
  return res.data;
}
