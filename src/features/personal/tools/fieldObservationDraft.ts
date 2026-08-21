import type { FieldObservationInput } from "@/api/fieldStudies";
import type { ToolRun } from "@/api/toolRuns";
import type { PublicCoordinates } from "@/utils/locationSearch";

function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function strings(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,;\n]/)
      : [];
  return values.map((item) => String(item || "").trim()).filter(Boolean);
}

function uniqueStrings(...values: unknown[]): string[] {
  return Array.from(new Set(values.flatMap(strings)));
}

function inputsFor(run: ToolRun): Record<string, any> {
  return record(run.inputs || run.input || run.params);
}

function outputsFor(run: ToolRun): Record<string, any> {
  return record(run.outputs || run.output || run.result);
}

function savedRunId(run: ToolRun) {
  return String(run.id || run._id || "").trim();
}

function isCropIdentificationRun(run: ToolRun) {
  const toolType = String(run.toolType || run.toolName || "")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");
  return toolType === "species_crop_id" || toolType === "species_crop_identification";
}

function finiteCoordinate(value: unknown, min: number, max: number) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function normalizeCoordinates(value: unknown): PublicCoordinates | null {
  const candidate = record(value);
  const latitude = finiteCoordinate(candidate.latitude, -90, 90);
  const longitude = finiteCoordinate(candidate.longitude, -180, 180);
  if (latitude === null || longitude === null) return null;
  const accuracyMeters =
    candidate.accuracyMeters === null ||
    candidate.accuracyMeters === undefined ||
    (typeof candidate.accuracyMeters === "string" && !candidate.accuracyMeters.trim())
      ? null
      : Number(candidate.accuracyMeters);
  const validAccuracyMeters =
    typeof accuracyMeters === "number" &&
    Number.isFinite(accuracyMeters) &&
    accuracyMeters >= 0
      ? accuracyMeters
      : null;
  return {
    latitude,
    longitude,
    ...(validAccuracyMeters !== null ? { accuracyMeters: validAccuracyMeters } : {})
  };
}

export function coordinatesFromToolRun(run: ToolRun): PublicCoordinates | null {
  const capturedLocation = record(inputsFor(run).capturedLocation);
  if (capturedLocation.userAuthorized !== true) return null;
  return normalizeCoordinates(capturedLocation);
}

function confidence(value: unknown): "low" | "medium" | "high" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "medium" || normalized === "high" ? normalized : "low";
}

function unresolvedName(value: unknown) {
  return /^(not confirmed|not identified|unidentified|unknown(?: crop)?|unsure|uncertain|n\/a|none)$/i.test(
    String(value || "").trim()
  );
}

function identityName(outputs: Record<string, any>, inputs: Record<string, any>) {
  const correction = record(outputs.userCorrection);
  const correctedName = String(correction.commonName || "").trim();
  if (correctedName) return correctedName;

  const likelyCrop = String(outputs.likelyCrop || "").trim();
  if (likelyCrop && !unresolvedName(likelyCrop)) return likelyCrop;

  const commonName = strings(outputs.commonNames).find((item) => !unresolvedName(item));
  return commonName || String(inputs.userEnteredName || "").trim();
}

function scientificName(outputs: Record<string, any>, inputs: Record<string, any>) {
  const correction = record(outputs.userCorrection);
  if (String(correction.commonName || "").trim()) {
    return String(correction.scientificName || "").trim();
  }
  const draft = record(outputs.identificationDraft);
  return String(
    outputs.scientificName || draft.scientificName || inputs.scientificName || ""
  ).trim();
}

function evidenceAssets(inputs: Record<string, any>, outputs: Record<string, any>) {
  const media = Array.isArray(inputs.mediaEvidence) ? inputs.mediaEvidence : [];
  const byId = new Map<
    string,
    NonNullable<FieldObservationInput["evidenceAssets"]>[number]
  >();

  media.forEach((rawItem: unknown) => {
    const item = record(rawItem);
    const assetId = String(item.assetId || item.id || item._id || "").trim();
    if (!assetId) return;
    const suppliedKind = String(item.kind || item.type || "")
      .trim()
      .toLowerCase();
    const kind = suppliedKind === "video" ? "video" : "photo";
    const url = String(item.url || item.durableUrl || item.uri || "").trim();
    const label = String(item.label || item.purpose || "").trim();
    byId.set(assetId, {
      assetId,
      kind,
      ...(url ? { url } : {}),
      ...(label ? { label } : {})
    });
  });

  const imageAnalysis = record(outputs.imageAnalysis);
  uniqueStrings(inputs.evidenceAssetIds, imageAnalysis.evidenceUsed).forEach(
    (assetId) => {
      if (!byId.has(assetId)) byId.set(assetId, { assetId, kind: "photo" });
    }
  );

  return Array.from(byId.values());
}

function candidates(outputs: Record<string, any>) {
  const draft = record(outputs.identificationDraft);
  const rows = Array.isArray(draft.candidates)
    ? draft.candidates
    : Array.isArray(outputs.candidates)
      ? outputs.candidates
      : [];
  return rows.slice(0, 8).map((rawCandidate: unknown) => {
    const candidate = record(rawCandidate);
    return {
      commonName: String(
        candidate.commonName || strings(candidate.commonNames)[0] || ""
      ).trim(),
      scientificName: String(candidate.scientificName || "").trim(),
      confidence: confidence(candidate.confidence),
      evidence: strings(candidate.evidence),
      counterEvidence: strings(candidate.counterEvidence)
    };
  });
}

function isCannabisIdentity(
  commonName: string,
  identifiedScientificName: string,
  candidateRows: ReturnType<typeof candidates>
) {
  const scientificNames = [
    identifiedScientificName,
    ...candidateRows.map((candidate) => candidate.scientificName)
  ];
  const identityNames = [
    commonName,
    identifiedScientificName,
    ...candidateRows.flatMap((candidate) => [
      candidate.commonName,
      candidate.scientificName
    ])
  ];
  return (
    scientificNames.some((value) => /^cannabis(?:\s|$)/i.test(value)) ||
    identityNames.some((value) => /\b(?:cannabis|marijuana)\b/i.test(value)) ||
    identityNames.some((value) => /^(?:industrial\s+)?hemp(?:\s+plant)?$/i.test(value))
  );
}

export function privateFieldObservationFromToolRun(
  run: ToolRun,
  coordinates?: PublicCoordinates | null
): FieldObservationInput {
  if (!isCropIdentificationRun(run)) {
    throw new Error("Only a saved Plant ID run can become a Field Study observation.");
  }
  const sourceToolRunId = savedRunId(run);
  if (!sourceToolRunId) {
    throw new Error("Save the Plant ID run before linking it to a Field Study.");
  }

  const inputs = inputsFor(run);
  const outputs = outputsFor(run);
  const draft = record(outputs.identificationDraft);
  const observationContext = record(inputs.observationContext);
  const commonName = identityName(outputs, inputs);
  const identifiedScientificName = scientificName(outputs, inputs);
  const candidateRows = candidates(outputs);
  const cannabisIdentity = isCannabisIdentity(
    commonName,
    identifiedScientificName,
    candidateRows
  );
  const selectedCoordinates =
    coordinates === undefined
      ? coordinatesFromToolRun(run)
      : normalizeCoordinates(coordinates);
  const observationDate = String(observationContext.observationDate || "").trim();

  return {
    sourceToolRunId,
    growId: run.growId || inputs.growId || null,
    title: commonName || "Unconfirmed plant observation",
    ...(observationDate ? { observationDate } : {}),
    identity: {
      commonName,
      scientificName: identifiedScientificName,
      family: String(outputs.likelyFamily || draft.likelyFamily || "").trim(),
      confidence: confidence(outputs.confidence || draft.confidence),
      verificationStatus: "ai_candidate",
      evidence: uniqueStrings(draft.evidence, outputs.evidenceUsed),
      counterEvidence: uniqueStrings(draft.counterEvidence, outputs.counterEvidence),
      missingEvidence: uniqueStrings(
        draft.missingEvidence,
        draft.requiredNextPhotos,
        draft.requiredNextQuestions,
        outputs.missingInformation,
        outputs.requiredNextPhotos,
        outputs.requiredNextQuestions
      ),
      candidates: candidateRows
    },
    observationContext: { ...observationContext },
    evidenceAssets: evidenceAssets(inputs, outputs),
    location: {
      ...(selectedCoordinates || {}),
      ...(selectedCoordinates ? { precision: "exact" as const } : {}),
      privacy: "private",
      exactLocationPublicConfirmed: false
    },
    publication: {
      status: "draft",
      sensitiveSpecies: cannabisIdentity,
      publicNotes: "",
      cannabisContextConfirmed: false
    }
  };
}
