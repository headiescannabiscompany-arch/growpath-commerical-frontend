import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";
import {
  normalizeFacilityTransfers,
  type FacilityTransfer,
  type FacilityTransferStatus
} from "@/features/facility/transfers";

export async function listFacilityTransfers(facilityId: string) {
  const result = await apiRequest(endpoints.facilityTransfers(facilityId));
  return normalizeFacilityTransfers(result, facilityId);
}

export async function createFacilityTransfer(input: FacilityTransfer) {
  return apiRequest(endpoints.facilityTransfers(input.facilityId), {
    method: "POST",
    body: input
  });
}

export async function transitionFacilityTransfer(
  id: string,
  facilityId: string,
  status: FacilityTransferStatus
) {
  return apiRequest(endpoints.facilityTransferTransition(facilityId, id), {
    method: "POST",
    body: { facilityId, status }
  });
}
