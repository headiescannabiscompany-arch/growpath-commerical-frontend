// verifyCertificate.js
// Utility to verify a certificate by ID using the backend API

export async function verifyCertificate(certificateId) {
  if (!certificateId) throw new Error("certificateId is required");
  const res = await fetch(`/api/courses/verify/${certificateId}`);
  if (!res.ok) {
    // 404 or error
    return { valid: false };
  }
  const data = await res.json();
  return data;
}
