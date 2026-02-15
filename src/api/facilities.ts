import { api } from "./client";
export function createFacility(data: { name: string }) {
  return api.post("/api/facilities", data);
}

export type Facility = {
  id: string;
  name: string;
  // Add other fields as needed
};

export function getFacilities() {
  return api<Facility[]>("/api/facilities");
}
