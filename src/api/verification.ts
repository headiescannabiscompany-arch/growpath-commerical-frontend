import { api } from "./client";
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
  const res = await api.get(endpoints.verification(facilityId));
  return res?.records ?? res?.verifications ?? res?.data ?? res ?? [];
}

export async function approveVerification(
  facilityId: string,
  recordId: string
): Promise<VerificationRecord> {
  const res = await api.post(endpoints.verificationRecord(facilityId, recordId), {
    verified: true,
    status: "approved"
  });
  return res?.updated ?? res?.record ?? res;
}

export async function rejectVerification(
  facilityId: string,
  recordId: string,
  reason?: string
): Promise<VerificationRecord> {
  const res = await api.put(endpoints.verificationReject(facilityId, recordId), {
    verified: false,
    status: "rejected",
    reason
  });
  return res?.updated ?? res?.record ?? res;
}
