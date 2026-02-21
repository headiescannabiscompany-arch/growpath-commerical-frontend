import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type GreenWasteLog = {
  id?: string;
  _id?: string;
  date?: string;
  materialType?: string;
  weight?: number;
  unit?: string;
  description?: string;
  disposalMethod?: string;
  approvedBy?: string;
  manifesto?: string;
  createdAt?: string;
};

export async function getGreenWasteLogs(facilityId: string): Promise<GreenWasteLog[]> {
  const res = await apiRequest(endpoints.greenWaste(facilityId));
  return res?.logs ?? res?.data ?? [];
}

export async function createGreenWasteLog(
  facilityId: string,
  data: any
): Promise<GreenWasteLog> {
  const res = await apiRequest(endpoints.greenWaste(facilityId), {
    method: "POST",
    body: data
  });
  return res?.created ?? res?.log ?? res;
}
