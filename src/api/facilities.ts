import { api } from "./client";

export type Facility = {
  id: string;
  name: string;
  // Add other fields as needed
};

export function getFacilities() {
  return api<Facility[]>("/api/facilities");
}
