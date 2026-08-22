import {
  businessAskAttestationMatchesResult,
  type BusinessAskAttestation,
  type BusinessAskCitation,
  type BusinessAskCitationEvidence,
  type BusinessAskResult
} from "@/api/businessDeskProvider";
import { businessDeskProviderSignatureSha256 } from "@/features/businessDesk/providerOperationPersistence";

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const entry = (value as Record<string, unknown>)[key];
        if (entry !== undefined) result[key] = canonicalValue(entry);
        return result;
      }, {});
  }
  return value;
}

export function canonicalBusinessAskProjection(value: unknown): string {
  const serialized = JSON.stringify(canonicalValue(value));
  if (typeof serialized !== "string") {
    throw new Error("The Business Ask source projection was not valid JSON.");
  }
  return serialized;
}

export function businessAskProjectionDigest(value: unknown) {
  return businessDeskProviderSignatureSha256(canonicalBusinessAskProjection(value));
}

export function businessAskCitationsMatch(
  left: BusinessAskCitation,
  right: BusinessAskCitation
) {
  return (
    left.id === right.id &&
    left.sourceType === right.sourceType &&
    left.recordId === right.recordId &&
    left.parentRecordId === right.parentRecordId &&
    left.recordKind === right.recordKind &&
    left.title === right.title &&
    left.version === right.version &&
    left.sourceDate === right.sourceDate &&
    left.dateRange.from === right.dateRange.from &&
    left.dateRange.to === right.dateRange.to
  );
}

export function businessAskCitationEvidenceMatches(
  operationId: string,
  result: BusinessAskResult,
  citation: BusinessAskCitation,
  attestation: BusinessAskAttestation,
  packet: BusinessAskCitationEvidence
) {
  let projectionDigest = "";
  try {
    projectionDigest = businessAskProjectionDigest(packet.providerSourceProjection);
  } catch {
    return false;
  }
  return (
    businessAskAttestationMatchesResult(attestation, result) &&
    packet.operationId === operationId &&
    businessAskCitationsMatch(packet.citation, citation) &&
    packet.evidence.providerSourceProjectionDigestSha256 === projectionDigest &&
    packet.evidence.providerInputDigestSha256 === attestation.providerInputDigestSha256 &&
    packet.evidence.sourceManifestDigestSha256 ===
      attestation.sourceManifestDigestSha256 &&
    packet.evidence.resultDigestSha256 === result.resultDigestSha256 &&
    packet.evidence.resultDigestSha256 === attestation.resultDigestSha256 &&
    packet.evidence.schemaVersion === attestation.schemaVersion &&
    packet.evidence.promptVersion === attestation.promptVersion
  );
}
