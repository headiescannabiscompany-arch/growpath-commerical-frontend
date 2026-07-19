import { apiRequest } from "./apiRequest";

export type Facility = {
  id: string;
  name: string;
  facilityId?: string;
  _id?: string;
  [key: string]: unknown;
};

function normalizeFacility(raw: any): Facility | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw._id ?? raw.facilityId ?? "");
  if (!id) return null;
  return {
    ...raw,
    id,
    name: String(raw.name ?? raw.facilityName ?? raw.title ?? id)
  };
}

function normalizeFacilitiesResponse(response: any): Facility[] {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.facilities)
        ? response.facilities
        : Array.isArray(response?.data)
          ? response.data
          : [];

  return rows.map(normalizeFacility).filter(Boolean) as Facility[];
}

export async function createFacility(data: {
  name: string;
  businessType?: string;
}): Promise<Facility> {
  const response = await apiRequest("/api/facilities", {
    method: "POST",
    body: data
  });
  const facility = normalizeFacility((response as any)?.facility ?? response);
  if (!facility) throw new Error("INVALID_FACILITY_RESPONSE");
  return facility;
}

export async function getFacilities(): Promise<Facility[]> {
  const response = await apiRequest("/api/facilities");
  return normalizeFacilitiesResponse(response);
}
