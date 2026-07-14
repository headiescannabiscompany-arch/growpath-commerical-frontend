import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import {
  normalizeFacilityTransfers,
  type FacilityTransfer,
  type FacilityTransferStatus
} from "@/features/facility/transfers";

export async function listFacilityTransfers(facilityId: string) {
  const result = await apiRequest(endpoints.facilityTransfers);
  return normalizeFacilityTransfers(result, facilityId);
}

export async function createFacilityTransfer(input: FacilityTransfer) {
  return apiRequest(endpoints.facilityTransfers, { method: "POST", body: input });
}

export async function updateFacilityTransfer(
  id: string,
  body: Partial<FacilityTransfer> & { status?: FacilityTransferStatus }
) {
  return apiRequest(endpoints.facilityTransfer(id), { method: "PATCH", body });
}
