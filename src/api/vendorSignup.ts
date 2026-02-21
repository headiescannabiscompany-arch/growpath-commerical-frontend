import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";

export interface VendorSignupData {
  companyName: string;
  vendorType: string;
  description?: string;
  websiteUrl?: string;
  contactEmail: string;
  contactPhone?: string;
}

export interface VendorSignupResponse {
  message: string;
  vendorId?: string;
  success?: boolean;
}

export async function signupAsVendor(
  data: VendorSignupData
): Promise<VendorSignupResponse> {
  const res = await apiRequest(endpoints.vendorSignup, {
    method: "POST",
    body: data
  });
  return res?.message ? res : (res?.data ?? res ?? { message: "Signup successful" });
}
