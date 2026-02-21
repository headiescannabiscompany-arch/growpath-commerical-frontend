import { apiRequest } from "./apiRequest";
export function createFacility(data: { name: string }) {
  return apiRequest("/api/facilities", { method: "POST", body: data });
}

export type Facility = {
  id: string;
  name: string;
  // Add other fields as needed
};

export function getFacilities() {
  return apiRequest<Facility[]>("/api/facilities");
}
