import { apiRequest } from "@/api/apiRequest";
import {
  businessDeskBase,
  type BusinessDeskRecordKind,
  type BusinessDeskRequestOptions,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { sha256Utf8, utf8Bytes } from "@/utils/sha256Utf8";

export const BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION =
  "business-desk-artifact-projection-v1" as const;

export const BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES = {
  quote_copy: "quote_customer_copy_v1",
  quote_csv: "quote_customer_csv_v1",
  expense_csv_batch: "expense_private_csv_v1",
  lead_private_csv: "lead_private_csv_v1",
  job_redacted_csv: "job_redacted_csv_v1",
  cash_flow_full: "cash_flow_full_v1",
  cash_flow_facility_manager: "cash_flow_facility_manager_v1"
} as const;

export type BusinessDeskArtifactKind =
  | "quote_copy"
  | "quote_csv"
  | "expense_csv_batch"
  | "lead_private_csv"
  | "job_redacted_csv"
  | "cash_flow_csv";

export type BusinessDeskArtifactRedactionProfile =
  (typeof BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES)[keyof typeof BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES];

export type BusinessDeskArtifactRevisionSelection = {
  recordId: string;
  revisionNumber: number;
};

export type BusinessDeskArtifactRecordPin = {
  recordId: string;
  revisionId: string;
  recordKind: BusinessDeskRecordKind;
  version: number;
};

export type BusinessDeskTransientArtifact = {
  mode: "copy" | "csv";
  contentType: "text/plain; charset=utf-8" | "text/csv; charset=utf-8";
  filename: string;
  content: string;
  projectionVersion: typeof BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION;
  redactionProfile: BusinessDeskArtifactRedactionProfile;
  fieldManifest: string[];
  checksumSha256: string;
  bytes: number;
  rowCount: number;
  recordCount: number;
  deliveryStatus: "not_observed";
};

export type BusinessDeskPreparedArtifactMetadata = Omit<
  BusinessDeskTransientArtifact,
  "content"
>;

export type BusinessDeskArtifactPreview = {
  artifactKind: BusinessDeskArtifactKind;
  artifact: BusinessDeskTransientArtifact;
  recordPins: BusinessDeskArtifactRecordPin[];
  previewConfirmationSha256: string;
};

export type BusinessDeskArtifactReceipt = {
  id: string;
  artifactKind: BusinessDeskArtifactKind;
  exportKind: BusinessDeskArtifactKind;
  recordPins: BusinessDeskArtifactRecordPin[];
  preparedArtifact: BusinessDeskPreparedArtifactMetadata;
  actorRelationship: { prepared: true };
  createdAt: string;
};

export type BusinessDeskPreparedArtifactPacket = {
  artifactKind: BusinessDeskArtifactKind;
  receipt: BusinessDeskArtifactReceipt;
  artifact: BusinessDeskTransientArtifact;
  recordPins: BusinessDeskArtifactRecordPin[];
  idempotentReplay: boolean;
};

export type PreviewBusinessDeskArtifactInput = {
  artifactKind: BusinessDeskArtifactKind;
  revisionSelections: BusinessDeskArtifactRevisionSelection[];
  expectedRedactionProfile?: BusinessDeskArtifactRedactionProfile;
};

export type PrepareBusinessDeskArtifactInput = PreviewBusinessDeskArtifactInput & {
  previewConfirmationSha256: string;
  confirmed: true;
  idempotencyKey: string;
  expectedPreview: BusinessDeskArtifactPreview;
};

const SHA_256 = /^[a-f0-9]{64}$/;
const MAX_ARTIFACT_BYTES = 150_000;
const MAX_ARTIFACT_ROWS = 30_000;

const ARTIFACT_SPECS: Record<
  BusinessDeskArtifactKind,
  {
    mode: BusinessDeskTransientArtifact["mode"];
    contentType: BusinessDeskTransientArtifact["contentType"];
    recordKind: BusinessDeskRecordKind;
    maxRecords: number;
    redactionProfiles: readonly BusinessDeskArtifactRedactionProfile[];
  }
> = {
  quote_copy: {
    mode: "copy",
    contentType: "text/plain; charset=utf-8",
    recordKind: "quote",
    maxRecords: 1,
    redactionProfiles: [BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.quote_copy]
  },
  quote_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    recordKind: "quote",
    maxRecords: 1,
    redactionProfiles: [BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.quote_csv]
  },
  expense_csv_batch: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    recordKind: "expense",
    maxRecords: 100,
    redactionProfiles: [BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.expense_csv_batch]
  },
  lead_private_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    recordKind: "lead",
    maxRecords: 1,
    redactionProfiles: [BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.lead_private_csv]
  },
  job_redacted_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    recordKind: "job",
    maxRecords: 1,
    redactionProfiles: [BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.job_redacted_csv]
  },
  cash_flow_csv: {
    mode: "csv",
    contentType: "text/csv; charset=utf-8",
    recordKind: "cash_flow_snapshot",
    maxRecords: 1,
    redactionProfiles: [
      BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.cash_flow_full,
      BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.cash_flow_facility_manager
    ]
  }
};

function ownKeysExactly(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function envelope(response: unknown): any {
  const value = response as any;
  return value?.data && typeof value.data === "object" ? value.data : value;
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.charCodeAt(0);
    return codePoint < 32 || codePoint === 127;
  });
}

function isCanonicalIsoInstant(value: unknown) {
  if (typeof value !== "string") return false;
  const instant = new Date(value);
  return Number.isFinite(instant.getTime()) && instant.toISOString() === value;
}

function normalizedRevisionSelections(
  artifactKind: BusinessDeskArtifactKind,
  selections: BusinessDeskArtifactRevisionSelection[]
) {
  const spec = ARTIFACT_SPECS[artifactKind];
  if (
    !spec ||
    !Array.isArray(selections) ||
    selections.length < 1 ||
    selections.length > spec.maxRecords
  ) {
    throw new Error(
      artifactKind === "expense_csv_batch"
        ? "Choose between 1 and 100 exact reviewed Expense revisions."
        : "Choose one exact saved Business Desk revision."
    );
  }
  const normalized = selections.map((selection) => ({
    recordId: String(selection?.recordId || "")
      .trim()
      .toLowerCase(),
    revisionNumber: Number(selection?.revisionNumber)
  }));
  if (
    normalized.some(
      (selection) =>
        !/^[a-f0-9]{24}$/.test(selection.recordId) ||
        !Number.isSafeInteger(selection.revisionNumber) ||
        selection.revisionNumber < 1
    ) ||
    new Set(normalized.map((selection) => selection.recordId)).size !== normalized.length
  ) {
    throw new Error(
      "Every artifact selection must name one unique exact saved revision."
    );
  }
  return normalized.sort((left, right) => left.recordId.localeCompare(right.recordId));
}

function recordPinsFrom(
  value: unknown,
  artifactKind: BusinessDeskArtifactKind,
  selections: BusinessDeskArtifactRevisionSelection[]
) {
  const spec = ARTIFACT_SPECS[artifactKind];
  const expected = new Map(
    selections.map((selection) => [selection.recordId, selection.revisionNumber])
  );
  if (
    !Array.isArray(value) ||
    value.length !== selections.length ||
    new Set(value.map((pin) => String(pin?.recordId || ""))).size !== selections.length ||
    value.some(
      (pin, index) =>
        !ownKeysExactly(pin, ["recordId", "revisionId", "recordKind", "version"]) ||
        typeof pin.recordId !== "string" ||
        !/^[a-f0-9]{24}$/.test(pin.recordId) ||
        pin.recordId !== selections[index].recordId ||
        expected.get(pin.recordId) !== pin.version ||
        typeof pin.revisionId !== "string" ||
        !/^[a-f0-9]{24}$/.test(pin.revisionId) ||
        pin.recordKind !== spec.recordKind
    )
  ) {
    throw new Error(
      "The reviewed artifact response did not pin the requested revisions."
    );
  }
  return value as BusinessDeskArtifactRecordPin[];
}

function artifactFrom(
  value: unknown,
  artifactKind: BusinessDeskArtifactKind,
  recordCount: number,
  expectedRedactionProfile?: BusinessDeskArtifactRedactionProfile
) {
  const artifact = value as any;
  const spec = ARTIFACT_SPECS[artifactKind];
  if (
    !ownKeysExactly(artifact, [
      "mode",
      "contentType",
      "filename",
      "content",
      "projectionVersion",
      "redactionProfile",
      "fieldManifest",
      "checksumSha256",
      "bytes",
      "rowCount",
      "recordCount",
      "deliveryStatus"
    ]) ||
    artifact.mode !== spec.mode ||
    artifact.contentType !== spec.contentType ||
    typeof artifact.filename !== "string" ||
    !artifact.filename.trim() ||
    artifact.filename.length > 240 ||
    /[\\/]/.test(artifact.filename) ||
    hasControlCharacter(artifact.filename) ||
    (artifact.mode === "csv" && !artifact.filename.toLowerCase().endsWith(".csv")) ||
    typeof artifact.content !== "string" ||
    !artifact.content.length ||
    artifact.projectionVersion !== BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION ||
    !spec.redactionProfiles.includes(artifact.redactionProfile) ||
    (expectedRedactionProfile &&
      artifact.redactionProfile !== expectedRedactionProfile) ||
    !Array.isArray(artifact.fieldManifest) ||
    artifact.fieldManifest.length < 1 ||
    artifact.fieldManifest.length > 128 ||
    new Set(artifact.fieldManifest).size !== artifact.fieldManifest.length ||
    artifact.fieldManifest.some(
      (field: unknown) =>
        typeof field !== "string" ||
        !field.trim() ||
        field.length > 120 ||
        hasControlCharacter(field)
    ) ||
    !SHA_256.test(String(artifact.checksumSha256 || "")) ||
    !Number.isSafeInteger(artifact.bytes) ||
    artifact.bytes < 1 ||
    artifact.bytes > MAX_ARTIFACT_BYTES ||
    artifact.bytes !==
      utf8Bytes(artifact.content, { replaceUnpairedSurrogates: true }).length ||
    sha256Utf8(artifact.content, { replaceUnpairedSurrogates: true }) !==
      artifact.checksumSha256 ||
    !Number.isSafeInteger(artifact.rowCount) ||
    artifact.rowCount < 1 ||
    artifact.rowCount > MAX_ARTIFACT_ROWS ||
    artifact.recordCount !== recordCount ||
    artifact.deliveryStatus !== "not_observed"
  ) {
    throw new Error("The transient reviewed artifact response was invalid.");
  }
  return artifact as BusinessDeskTransientArtifact;
}

function artifactMetadata(artifact: BusinessDeskTransientArtifact) {
  const { content: _transientContent, ...metadata } = artifact;
  return metadata;
}

function equalJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function previewFrom(
  response: unknown,
  input: PreviewBusinessDeskArtifactInput,
  selections: BusinessDeskArtifactRevisionSelection[]
) {
  const value = envelope(response);
  if (
    !ownKeysExactly(value, [
      "artifactKind",
      "artifact",
      "recordPins",
      "previewConfirmationSha256"
    ]) ||
    value.artifactKind !== input.artifactKind
  ) {
    throw new Error("The reviewed artifact preview response was invalid.");
  }
  const pins = recordPinsFrom(value.recordPins, input.artifactKind, selections);
  const artifact = artifactFrom(
    value.artifact,
    input.artifactKind,
    pins.length,
    input.expectedRedactionProfile
  );
  if (!SHA_256.test(String(value.previewConfirmationSha256 || ""))) {
    throw new Error("The reviewed artifact preview confirmation was invalid.");
  }
  return { ...value, artifact, recordPins: pins } as BusinessDeskArtifactPreview;
}

function preparedPacketFrom(
  response: unknown,
  input: PrepareBusinessDeskArtifactInput,
  selections: BusinessDeskArtifactRevisionSelection[]
) {
  const value = envelope(response);
  if (
    !ownKeysExactly(value, [
      "artifactKind",
      "receipt",
      "artifact",
      "recordPins",
      "idempotentReplay"
    ]) ||
    value.artifactKind !== input.artifactKind ||
    typeof value.idempotentReplay !== "boolean"
  ) {
    throw new Error("The prepared reviewed artifact response was invalid.");
  }
  const pins = recordPinsFrom(value.recordPins, input.artifactKind, selections);
  const expectedProfile =
    input.expectedPreview?.artifact.redactionProfile || input.expectedRedactionProfile;
  const artifact = artifactFrom(
    value.artifact,
    input.artifactKind,
    pins.length,
    expectedProfile
  );
  const receipt = value.receipt as any;
  if (
    !ownKeysExactly(receipt, [
      "id",
      "artifactKind",
      "exportKind",
      "recordPins",
      "preparedArtifact",
      "actorRelationship",
      "createdAt"
    ]) ||
    typeof receipt.id !== "string" ||
    !/^[a-f0-9]{24}$/.test(receipt.id) ||
    receipt.artifactKind !== input.artifactKind ||
    receipt.exportKind !== input.artifactKind ||
    !equalJson(receipt.recordPins, pins) ||
    !ownKeysExactly(receipt.preparedArtifact, [
      "mode",
      "contentType",
      "filename",
      "projectionVersion",
      "redactionProfile",
      "fieldManifest",
      "checksumSha256",
      "bytes",
      "rowCount",
      "recordCount",
      "deliveryStatus"
    ]) ||
    Object.prototype.hasOwnProperty.call(receipt.preparedArtifact, "content") ||
    !equalJson(receipt.preparedArtifact, artifactMetadata(artifact)) ||
    !ownKeysExactly(receipt.actorRelationship, ["prepared"]) ||
    receipt.actorRelationship.prepared !== true ||
    !isCanonicalIsoInstant(receipt.createdAt)
  ) {
    throw new Error("The audited reviewed artifact receipt was invalid.");
  }

  if (
    input.expectedPreview.artifactKind !== input.artifactKind ||
    input.expectedPreview.previewConfirmationSha256 !== input.previewConfirmationSha256 ||
    !equalJson(input.expectedPreview.recordPins, pins) ||
    !equalJson(input.expectedPreview.artifact, artifact)
  ) {
    throw new Error("The prepared artifact did not match the exact confirmed preview.");
  }

  return {
    ...value,
    artifact,
    recordPins: pins,
    receipt
  } as BusinessDeskPreparedArtifactPacket;
}

export async function previewBusinessDeskArtifact(
  workspace: BusinessDeskWorkspace,
  input: PreviewBusinessDeskArtifactInput,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskArtifactPreview> {
  const selections = normalizedRevisionSelections(
    input.artifactKind,
    input.revisionSelections
  );
  const response = await apiRequest(`${businessDeskBase(workspace)}/artifacts/preview`, {
    method: "POST",
    body: {
      artifactKind: input.artifactKind,
      revisionSelections: selections
    },
    ...(request.signal ? { signal: request.signal } : {})
  });
  return previewFrom(response, input, selections);
}

export async function prepareBusinessDeskArtifact(
  workspace: BusinessDeskWorkspace,
  input: PrepareBusinessDeskArtifactInput,
  request: BusinessDeskRequestOptions = {}
): Promise<BusinessDeskPreparedArtifactPacket> {
  const selections = normalizedRevisionSelections(
    input.artifactKind,
    input.revisionSelections
  );
  const idempotencyKey =
    typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  if (
    input.confirmed !== true ||
    !SHA_256.test(String(input.previewConfirmationSha256 || "")) ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 200 ||
    hasControlCharacter(idempotencyKey)
  ) {
    throw new Error("Confirm one exact reviewed artifact preview before preparing it.");
  }
  const expectedPreview = previewFrom(input.expectedPreview, input, selections);
  if (expectedPreview.previewConfirmationSha256 !== input.previewConfirmationSha256) {
    throw new Error("The preparation request did not match the confirmed preview.");
  }
  const response = await apiRequest(`${businessDeskBase(workspace)}/artifacts/prepare`, {
    method: "POST",
    body: {
      artifactKind: input.artifactKind,
      revisionSelections: selections,
      previewConfirmationSha256: input.previewConfirmationSha256,
      confirmed: true,
      idempotencyKey
    },
    ...(request.signal ? { signal: request.signal } : {})
  });
  return preparedPacketFrom(response, { ...input, expectedPreview }, selections);
}
