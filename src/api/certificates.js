import { client as api } from "./client.js";
import ROUTES from "./routes.js";

export function getMyCertificates() {
  return api(ROUTES.CERTIFICATES.MINE);
}

export function downloadCertificate(certificateId) {
  return api(ROUTES.CERTIFICATES.DETAIL(certificateId));
}

export function verifyCertificate(certificateId) {
  return api(ROUTES.CERTIFICATES.VERIFY(certificateId));
}
