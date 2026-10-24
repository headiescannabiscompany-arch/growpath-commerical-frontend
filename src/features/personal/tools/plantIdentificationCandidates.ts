type PlantCandidate = Record<string, any>;

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return String(value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function unresolvedPlantCandidateName(value: unknown) {
  return /^(?:not confirmed|not identified|unidentified|unknown(?: crop)?|unsure|uncertain|n\/a|none|-)$/i.test(
    String(value || "").trim()
  );
}

function candidateKey(candidate: PlantCandidate) {
  const scientificName = String(candidate?.scientificName || "").trim().toLowerCase();
  return JSON.stringify({ scientificName,
    commonNames: scientificName ? [] : stringList(candidate?.commonNames).map((name) => name.toLowerCase()).sort(),
    horticulturalName: candidate?.rank === "horticultural_type" ? String(candidate.horticulturalName || "").trim().toLowerCase() : ""
  });
}

function diagnosticPlantEvidence(values: unknown[]) {
  const text = values.flatMap((value) => stringList(value)).join(" ");
  const terms =
    text.match(
      /\b(?:leaf|leaves|margin|venation|stem|node|bark|habit|flower|petal|sepal|stamen|pistil|bract|inflorescence|fruit|seed|pod|berry|cone|needle|scale|thorn|spine|tendril|stipule|rhizome|bulb|corm|latex|sap|palmate|pinnate|compound|simple|opposite|alternate|whorled|basal|rosette|parallel|serrated|lobed|entire|spiny|wavy|radial|bilateral|square|hairy|resinous|trichome|raceme|umbel|panicle|spike)\b/gi
    ) || [];
  return new Set(terms.map((term) => term.toLowerCase())).size >= 2;
}

function genusName(value: unknown) {
  return (
    String(value || "")
      .trim()
      .match(/^([A-Z][a-z-]+)(?:\s|$)/)?.[1] || ""
  );
}

function exactSpeciesName(value: unknown) {
  return /^[A-Z][a-z-]+\s+(?:×\s*)?(?!spp?\.?\b|hybrid\b)[a-z][a-z-]+\b/.test(
    String(value || "").trim()
  );
}

/**
 * Defense-in-depth presentation boundary for limited/unusable image reviews.
 * The backend remains authoritative, but a stale or malformed calculator echo must
 * never put an unsupported exact species back on screen.
 */
export function safePlantIdentificationOutputs(outputs: Record<string, any>) {
  const imageAnalysis = outputs?.imageAnalysis || {};
  const quality = String(imageAnalysis.quality || "")
    .trim()
    .toLowerCase();
  if (quality !== "limited" && quality !== "unusable") return outputs;

  const draft =
    outputs?.identificationDraft && typeof outputs.identificationDraft === "object"
      ? outputs.identificationDraft
      : {};
  const possibleGenera = [
    ...stringList(outputs?.possibleGenera),
    ...stringList(draft?.possibleGenera)
  ];
  const sharedEvidence = [
    outputs?.identifyingVisualTraits,
    imageAnalysis?.identifyingVisualTraits,
    outputs?.evidence,
    draft?.evidence
  ];
  const candidates =
    quality === "unusable" || imageAnalysis.performed !== true
      ? []
      : plantIdentificationCandidates(outputs)
          .filter((candidate) =>
            diagnosticPlantEvidence([...sharedEvidence, candidate?.evidence])
          )
          .map((candidate) => {
            const suppliedScientificName = String(candidate?.scientificName || "").trim();
            const suppliedRank = String(candidate?.rank || "working_candidate")
              .trim()
              .toLowerCase();
            const genus =
              genusName(suppliedScientificName) ||
              possibleGenera.map((value) => genusName(value)).find(Boolean) ||
              "";
            const mustGeneralize =
              suppliedRank === "species" || suppliedRank === "horticultural_type" || exactSpeciesName(suppliedScientificName);
            return {
              ...candidate,
              ...(mustGeneralize ? { commonNames: genus ? [genus] : [], horticulturalName: "" } : {}),
              scientificName: mustGeneralize
                ? genus
                  ? `${genus} spp.`
                  : ""
                : suppliedScientificName,
              rank: mustGeneralize
                ? genus
                  ? "genus"
                  : "working_candidate"
                : suppliedRank,
              confidence: "low"
            };
          });
  const primary = candidates[0] || {};
  const primaryCommonName = stringList(primary.commonNames).find(
    (name) => !unresolvedPlantCandidateName(name)
  );
  const primaryScientificName = String(primary.scientificName || "").trim();
  const supported = candidates.length > 0;
  const safeGenera = supported
    ? Array.from(
        new Set(
          [
            ...possibleGenera,
            ...candidates.map((candidate) => genusName(candidate.scientificName))
          ].filter(Boolean)
        )
      )
    : [];
  const likelyFamily = supported
    ? String(outputs?.likelyFamily || draft?.likelyFamily || "").trim()
    : "";

  return {
    ...outputs,
    likelyCrop: primaryCommonName || primaryScientificName || "unknown crop",
    scientificName: primaryScientificName || null,
    commonNames: primaryCommonName ? [primaryCommonName] : [],
    likelyFamily: likelyFamily || null,
    possibleGenera: safeGenera,
    possibleSpecies: [],
    candidates,
    candidateSelection: undefined,
    identificationDraft: {
      ...draft,
      likelyFamily: likelyFamily || "",
      possibleGenera: safeGenera,
      candidates,
      candidateSelection: undefined
    },
    confidence: "low",
    identityEvidenceStatus: supported ? "candidate_only" : "retake_required",
    confirmationAvailable: outputs?.confirmationAvailable === true,
    userConfirmationRequired: true,
    imageAnalysis: {
      ...imageAnalysis,
      retakeRequired: !supported
    }
  };
}

export function plantIdentificationCandidates(outputs: Record<string, any>) {
  const draft =
    outputs?.identificationDraft && typeof outputs.identificationDraft === "object"
      ? outputs.identificationDraft
      : {};
  // An explicit final list (including empty) supersedes its pre-save draft.
  const combined: PlantCandidate[] = (Array.isArray(outputs?.candidates) ? outputs.candidates
    : Array.isArray(draft.candidates) ? draft.candidates : [])
    .filter((candidate: any) => candidate && typeof candidate === "object");
  const seen = new Set<string>();
  return combined.filter((candidate: any) => {
    const key = candidateKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function bestStructuredPlantCandidateName(outputs: Record<string, any>) {
  const draft =
    outputs?.identificationDraft && typeof outputs.identificationDraft === "object"
      ? outputs.identificationDraft
      : {};
  const selection = plantIdentificationSelection(outputs);
  const ordered = plantIdentificationCandidates(outputs);
  const candidate = (selection?.status === "leading_candidate"
    ? [ordered[selection.candidateIndexes[0]]] : ordered).find((item) => {
    const commonName = stringList(item?.commonNames).find(
      (name) => !unresolvedPlantCandidateName(name)
    );
    const scientificName = String(item?.scientificName || "").trim();
    return (
      commonName || (scientificName && !unresolvedPlantCandidateName(scientificName))
    );
  });
  if (candidate?.rank === "horticultural_type" && candidate.horticulturalName) return String(candidate.horticulturalName);
  const candidateCommonName = stringList(candidate?.commonNames).find(
    (name) => !unresolvedPlantCandidateName(name)
  );
  if (candidateCommonName) return candidateCommonName;
  const candidateScientificName = String(candidate?.scientificName || "").trim();
  if (candidateScientificName && !unresolvedPlantCandidateName(candidateScientificName)) {
    return candidateScientificName;
  }
  const possibleGenus = [
    ...stringList(outputs?.possibleGenera),
    ...stringList(draft.possibleGenera)
  ].find((name) => !unresolvedPlantCandidateName(name));
  if (possibleGenus) return possibleGenus;
  const family = String(outputs?.likelyFamily || draft.likelyFamily || "").trim();
  return family && !unresolvedPlantCandidateName(family) ? family : "";
}

// Display only: never write a tentative name back into confirmed identity fields.
export function plantIdentificationHeadline(rawOutputs: Record<string, any>) {
  const outputs = safePlantIdentificationOutputs(rawOutputs);
  if (outputs.userCorrection?.source === "user_entry" && outputs.userCorrection.commonName) {
    return { name: String(outputs.userCorrection.commonName), label: "Identified by you" };
  }
  const selection = plantIdentificationSelection(outputs);
  const direct = String(outputs.likelyCrop || "").trim();
  const name = direct && !unresolvedPlantCandidateName(direct)
    ? direct : bestStructuredPlantCandidateName(outputs);
  return {
    name: selection?.status === "close_alternatives" && !["user_entered", "user_confirmed"].includes(outputs.identityEvidenceStatus)
      ? "Close alternatives" : name || "No supported match yet",
    label: outputs.identityEvidenceStatus === "user_confirmed"
      ? "Your confirmed identity"
      : outputs.identityEvidenceStatus === "user_entered"
        ? "Your entered identity" : selection?.status === "leading_candidate"
          ? "Best candidate · tentative" : selection?.status === "close_alternatives"
            ? "No clear winner yet" : selection?.status === "insufficient_evidence"
              ? "No reliable species match yet" : "Previous candidate · unconfirmed"
  };
}

export function plantIdentificationSelection(outputs: Record<string, any>): {
  status: "leading_candidate" | "close_alternatives" | "insufficient_evidence";
  candidateIndexes: number[]; reason: string; discriminator: string;
} | null {
  if (["limited", "unusable"].includes(String(outputs.imageAnalysis?.quality || ""))) return null;
  const hasFinalCandidates = Array.isArray(outputs.candidates);
  const selection = hasFinalCandidates ? outputs.candidateSelection
    : outputs.identificationDraft?.candidateSelection;
  const candidates = plantIdentificationCandidates(outputs);
  // The server indexes the exact result list. Never reinterpret indexes after a
  // display-side dedupe or stale draft merge changes that list.
  const raw = hasFinalCandidates ? outputs.candidates : outputs.identificationDraft?.candidates || [];
  if (!selection || raw.length !== candidates.length || !Array.isArray(selection.candidateIndexes)) return null;
  const indexes = selection.candidateIndexes;
  if (indexes.length > 3 || new Set(indexes).size !== indexes.length ||
      indexes.some((index: unknown) => !Number.isInteger(index) || Number(index) < 0 || Number(index) >= candidates.length)) return null;
  if (!(selection.status === "leading_candidate" && indexes.length === 1 ||
    selection.status === "close_alternatives" && indexes.length >= 2 ||
    selection.status === "insufficient_evidence" && indexes.length === 0)) return null;
  return { status: selection.status, candidateIndexes: indexes,
    reason: String(selection.reason || ""), discriminator: String(selection.discriminator || "") };
}

export function isCannabisPlantIdentification(outputs: Record<string, any>) {
  const draft =
    outputs?.identificationDraft && typeof outputs.identificationDraft === "object"
      ? outputs.identificationDraft
      : {};
  const matchesCannabisScientificName = (value: unknown) =>
    /^\s*Cannabis(?:\s|\.|$)/i.test(String(value || ""));
  const matchesCannabisCommonName = (value: unknown) =>
    /^(?:cannabis|cannabis plant|marijuana|hemp)$/i.test(String(value || "").trim());
  const directCommonNames = [
    outputs?.likelyCrop,
    draft.commonName,
    ...stringList(outputs?.commonNames),
    ...stringList(draft.commonNames)
  ].filter((name) => String(name || "").trim() && !unresolvedPlantCandidateName(name));
  const directScientificNames = [outputs?.scientificName, draft.scientificName].filter(
    (name) => String(name || "").trim() && !unresolvedPlantCandidateName(name)
  );
  if (directCommonNames.length || directScientificNames.length) {
    return (
      directCommonNames.some(matchesCannabisCommonName) ||
      directScientificNames.some(matchesCannabisScientificName)
    );
  }

  const primaryCandidate = plantIdentificationCandidates(outputs).find((candidate) => {
    const commonNames = stringList(candidate?.commonNames).filter(
      (name) => !unresolvedPlantCandidateName(name)
    );
    const scientificName = String(candidate?.scientificName || "").trim();
    return (
      commonNames.length > 0 ||
      (scientificName && !unresolvedPlantCandidateName(scientificName))
    );
  });
  if (primaryCandidate) {
    return (
      stringList(primaryCandidate.commonNames).some(matchesCannabisCommonName) ||
      matchesCannabisScientificName(primaryCandidate.scientificName)
    );
  }

  const primaryGenus = [
    ...stringList(outputs?.possibleGenera),
    ...stringList(draft.possibleGenera)
  ].find((name) => !unresolvedPlantCandidateName(name));
  if (primaryGenus) return /^\s*Cannabis\s*$/i.test(primaryGenus);

  const primaryPossibleSpecies = [
    ...stringList(outputs?.possibleSpecies),
    ...stringList(draft.possibleSpecies)
  ].find((name) => !unresolvedPlantCandidateName(name));
  return matchesCannabisScientificName(primaryPossibleSpecies);
}

export function plantIdentificationEvidence(outputs: Record<string, any>) {
  const draft =
    outputs?.identificationDraft && typeof outputs.identificationDraft === "object"
      ? outputs.identificationDraft
      : {};
  const candidates = plantIdentificationCandidates(outputs);
  const unique = (values: unknown[]) =>
    Array.from(new Set(values.flatMap((value) => stringList(value))));
  return {
    evidence: unique([
      outputs?.evidence,
      draft.evidence,
      ...candidates.map((candidate) => candidate?.evidence)
    ]),
    counterEvidence: unique([
      outputs?.counterEvidence,
      draft.counterEvidence,
      ...candidates.map((candidate) => candidate?.counterEvidence)
    ]),
    missingEvidence: unique([
      outputs?.missingInformation,
      outputs?.requiredNextPhotos,
      outputs?.requiredNextQuestions,
      draft.missingEvidence,
      draft.requiredNextPhotos,
      draft.requiredNextQuestions,
      ...candidates.map((candidate) => candidate?.missingEvidence)
    ])
  };
}
