import { client as api } from "./client.js";
import apiRoutes from "./routes.js";

export function getMyCertificates() {
  return api(apiRoutes.CERTIFICATES.MINE);
}

export function downloadCertificate(certificateId) {
  return api(apiRoutes.CERTIFICATES.DETAIL(certificateId));
}

export function verifyCertificate(certificateId) {
  return api(apiRoutes.CERTIFICATES.VERIFY(certificateId));
}
