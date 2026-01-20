// useCertificateVerification.js
// Example React hook for verifying a certificate
import { useState } from "react";
import { verifyCertificate } from "./enrollmentApi";

export function useCertificateVerification() {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const verify = async (certificateId) => {
    setVerifying(true);
    setError(null);
    try {
      const res = await verifyCertificate(certificateId);
      setResult(res);
      return res;
    } catch (e) {
      setError(e);
      setResult(null);
      throw e;
    } finally {
      setVerifying(false);
    }
  };

  return { verify, verifying, result, error };
}

// Usage:
// const { verify, verifying, result, error } = useCertificateVerification();
// verify(certificateId);
