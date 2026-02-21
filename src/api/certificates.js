import { apiRequest } from "./apiRequest";
import apiRoutes from "./routes.js";

export function getMyCertificates() {
  return apiRequest(apiRoutes.CERTIFICATES.MINE);
}

export function downloadCertificate(certificateId) {
  return apiRequest(apiRoutes.CERTIFICATES.DETAIL(certificateId));
}

export function verifyCertificate(certificateId) {
  return apiRequest(apiRoutes.CERTIFICATES.VERIFY(certificateId));
}
