import api from "./client";

export function getMyCertificates() {
  return api("/certificates/mine");
}

export function downloadCertificate(certificateId) {
  return api(`/certificates/${certificateId}`);
}

export function verifyCertificate(certificateId) {
  return api(`/certificates/verify/${certificateId}`);
}
