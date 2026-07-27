import { apiRequest } from "./apiRequest";

export type FieldStudyRole = "owner" | "editor" | "verifier" | "viewer";
export type FieldStudyVisibility = "private" | "unlisted" | "public";
export type ObservationLocationPrivacy =
  | "private"
  | "collaborators"
  | "public_approximate"
  | "public_exact";

export type FieldStudy = {
  _id?: string;
  id?: string;
  ownerId?: string;
  title: string;
  slug: string;
  description?: string;
  purpose?:
    | "biodiversity_survey"
    | "invasive_species"
    | "plant_health"
    | "education"
    | "other";
  regionLabel?: string;
  visibility: FieldStudyVisibility;
  status?: "active" | "archived";
  defaultLocationPrivacy?: ObservationLocationPrivacy;
  obscureSensitiveSpecies?: boolean;
  accessRole: FieldStudyRole;
  collaborators?: Array<{
    userId: string;
    role: Exclude<FieldStudyRole, "owner">;
    displayName?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export type FieldObservationIdentity = {
  commonName?: string;
  scientificName?: string;
  family?: string;
  confidence?: "low" | "medium" | "high" | "unknown";
  verificationStatus?:
    | "ai_candidate"
    | "user_confirmed"
    | "community_suggestion"
    | "expert_reviewed"
    | "source_verified"
    | "disputed"
    | "needs_evidence";
  evidence?: string[];
  counterEvidence?: string[];
  missingEvidence?: string[];
  candidates?: Array<{
    commonName?: string;
    scientificName?: string;
    confidence?: "low" | "medium" | "high" | "unknown";
    evidence?: string[];
    counterEvidence?: string[];
  }>;
};

export type FieldObservationInput = {
  sourceToolRunId?: string | null;
  growId?: string | null;
  title?: string;
  notes?: string;
  observationDate?: string;
  identity?: FieldObservationIdentity;
  assessment?: {
    healthStatus?:
      | "not_assessed"
      | "healthy"
      | "stressed"
      | "diseased"
      | "damaged"
      | "unknown";
    healthSummary?: string;
    invasiveStatus?:
      | "not_assessed"
      | "unknown"
      | "suspected"
      | "verified"
      | "not_invasive";
    invasiveJurisdiction?: string;
    invasiveSourceUrl?: string;
  };
  observationContext?: Record<string, unknown>;
  evidenceAssets?: Array<{
    assetId?: string;
    id?: string;
    url?: string;
    uri?: string;
    kind?: "photo" | "video" | "video_frame" | "other";
    label?: string;
  }>;
  photoUrls?: string[];
  location?: {
    latitude?: number | null;
    longitude?: number | null;
    accuracyMeters?: number | null;
    label?: string;
    precision?: "exact" | "approximate" | "regional";
    privacy?: ObservationLocationPrivacy;
    exactLocationPublicConfirmed?: boolean;
  };
  publication?: {
    status?: "draft" | "published" | "withdrawn";
    sensitiveSpecies?: boolean;
    publicNotes?: string;
    cannabisContextConfirmed?: boolean;
  };
};

export type FieldObservation = FieldObservationInput & {
  _id?: string;
  id?: string;
  studyId?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  study?: Pick<
    FieldStudy,
    "id" | "slug" | "title" | "description" | "purpose" | "regionLabel"
  >;
};

function entityId(value: { id?: string; _id?: string } | null | undefined) {
  return String(value?.id || value?._id || "");
}

function studiesFromResponse(response: any): FieldStudy[] {
  const rows = response?.studies ?? response?.data?.studies ?? response ?? [];
  return Array.isArray(rows)
    ? rows.map((study) => ({
        ...study,
        id: entityId(study),
        _id: entityId(study)
      }))
    : [];
}

function observationsFromResponse(response: any): FieldObservation[] {
  const rows = response?.observations ?? response?.data?.observations ?? response ?? [];
  return Array.isArray(rows)
    ? rows.map((observation) => ({
        ...observation,
        id: entityId(observation),
        _id: entityId(observation)
      }))
    : [];
}

export async function listFieldStudies(): Promise<FieldStudy[]> {
  return studiesFromResponse(await apiRequest("/api/personal/field-studies"));
}

export async function createFieldStudy(
  input: Pick<FieldStudy, "title"> &
    Partial<
      Pick<
        FieldStudy,
        | "description"
        | "purpose"
        | "regionLabel"
        | "visibility"
        | "defaultLocationPrivacy"
        | "obscureSensitiveSpecies"
      >
    >
): Promise<FieldStudy> {
  const response: any = await apiRequest("/api/personal/field-studies", {
    method: "POST",
    body: input
  });
  const study = response?.study ?? response?.data?.study ?? response;
  return { ...study, id: entityId(study), _id: entityId(study) };
}

export async function getFieldStudy(studyId: string): Promise<{
  study: FieldStudy;
  observations: FieldObservation[];
}> {
  const response: any = await apiRequest(
    `/api/personal/field-studies/${encodeURIComponent(studyId)}`
  );
  const study = response?.study ?? response?.data?.study;
  return {
    study: { ...study, id: entityId(study), _id: entityId(study) },
    observations: observationsFromResponse(response)
  };
}

export async function updateFieldStudy(
  studyId: string,
  patch: Partial<FieldStudy> & { exactLocationPublicConfirmed?: boolean }
): Promise<FieldStudy> {
  const response: any = await apiRequest(
    `/api/personal/field-studies/${encodeURIComponent(studyId)}`,
    { method: "PATCH", body: patch }
  );
  const study = response?.study ?? response?.data?.study ?? response;
  return { ...study, id: entityId(study), _id: entityId(study) };
}

export async function addFieldStudyCollaborator(
  studyId: string,
  email: string,
  role: "editor" | "verifier" | "viewer"
): Promise<FieldStudy> {
  const response: any = await apiRequest(
    `/api/personal/field-studies/${encodeURIComponent(studyId)}/collaborators`,
    { method: "POST", body: { email, role } }
  );
  const study = response?.study ?? response?.data?.study ?? response;
  return { ...study, id: entityId(study), _id: entityId(study) };
}

export async function removeFieldStudyCollaborator(
  studyId: string,
  collaboratorId: string
): Promise<FieldStudy> {
  const response: any = await apiRequest(
    `/api/personal/field-studies/${encodeURIComponent(
      studyId
    )}/collaborators/${encodeURIComponent(collaboratorId)}`,
    { method: "DELETE" }
  );
  const study = response?.study ?? response?.data?.study ?? response;
  return { ...study, id: entityId(study), _id: entityId(study) };
}

export async function createFieldObservation(
  studyId: string,
  input: FieldObservationInput
): Promise<{ observation: FieldObservation; locationNotice?: string }> {
  const response: any = await apiRequest(
    `/api/personal/field-studies/${encodeURIComponent(studyId)}/observations`,
    { method: "POST", body: input }
  );
  const observation = response?.observation ?? response?.data?.observation ?? response;
  return {
    observation: {
      ...observation,
      id: entityId(observation),
      _id: entityId(observation)
    },
    locationNotice: response?.locationNotice ?? response?.data?.locationNotice
  };
}

export async function updateFieldObservation(
  studyId: string,
  observationId: string,
  patch: FieldObservationInput
): Promise<FieldObservation> {
  const response: any = await apiRequest(
    `/api/personal/field-studies/${encodeURIComponent(
      studyId
    )}/observations/${encodeURIComponent(observationId)}`,
    { method: "PATCH", body: patch }
  );
  const observation = response?.observation ?? response?.data?.observation ?? response;
  return {
    ...observation,
    id: entityId(observation),
    _id: entityId(observation)
  };
}

export type PublicFieldObservationQuery = {
  q?: string;
  bbox?: [number, number, number, number];
  verificationStatus?: FieldObservationIdentity["verificationStatus"];
  invasiveStatus?: NonNullable<FieldObservationInput["assessment"]>["invasiveStatus"];
  limit?: number;
};

export async function listPublicFieldObservations(
  input: string | PublicFieldObservationQuery = ""
): Promise<FieldObservation[]> {
  const query = typeof input === "string" ? { q: input } : input;
  return observationsFromResponse(
    await apiRequest("/api/field-observations/public", {
      auth: true,
      params: {
        q: query.q?.trim() || undefined,
        bbox: query.bbox?.join(","),
        verificationStatus: query.verificationStatus,
        invasiveStatus: query.invasiveStatus,
        limit: query.limit
      }
    })
  );
}

export async function getPublicFieldStudy(slug: string): Promise<{
  study: FieldStudy;
  observations: FieldObservation[];
}> {
  const response: any = await apiRequest(
    `/api/field-observations/public/studies/${encodeURIComponent(slug)}`,
    { auth: true }
  );
  const study = response?.study ?? response?.data?.study;
  return {
    study: { ...study, id: entityId(study), _id: entityId(study) },
    observations: observationsFromResponse(response)
  };
}
