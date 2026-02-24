import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type VerificationRecord = {
  id?: string;
  _id?: string;
  name?: string;
  description?: string;
  status?: string;
  completedAt?: string;
  verificationDate?: string;
};

export async function getVerifications(
  facilityId: string
): Promise<VerificationRecord[]> {
  const listRes = await apiRequest(endpoints.verification(facilityId));
  return listRes?.records ?? listRes?.verifications ?? listRes?.data ?? listRes ?? [];
}

export async function approveVerification(
  facilityId: string,
  recordId: string
): Promise<VerificationRecord> {
  const approveRes = await apiRequest(
    endpoints.verificationRecord(facilityId, recordId),
    {
      method: "POST",
      body: {
        verified: true,
        status: "approved"
      }
    }
  );
  return approveRes?.updated ?? approveRes?.record ?? approveRes;
}

export async function rejectVerification(
  facilityId: string,
  recordId: string,
  reason?: string
): Promise<VerificationRecord> {
  const rejectRes = await apiRequest(endpoints.verificationReject(facilityId, recordId), {
    method: "PUT",
    body: {
      verified: false,
      status: "rejected",
      reason
    }
  });
  return rejectRes?.updated ?? rejectRes?.record ?? rejectRes;
}
