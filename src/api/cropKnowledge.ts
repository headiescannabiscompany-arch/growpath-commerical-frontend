import { apiRequest } from "./apiRequest";
import routes from "./routes.js";

export type SourceRecord = {
  sourceName: string;
  sourceType?:
    | "extension"
    | "federal"
    | "academic"
    | "api"
    | "manufacturer_label"
    | "manufacturer"
    | "user_entered"
    | "growpath_verified"
    | "ai_assisted"
    | "other";
  url?: string;
  citation?: string;
  license?: string;
  licenseReviewedAt?: string | null;
  commercialUseAllowed?: boolean;
  trainingUseAllowed?: boolean;
  region?: string;
  cropScope?: string;
  confidence?: "low" | "medium" | "high";
  accessedAt?: string | null;
  lastReviewedAt?: string | null;
  notes?: string;
};

export type CropKnowledgeListParams = {
  q?: string;
  search?: string;
  limit?: number;
  cropCategory?: string;
  curationStatus?: string;
  scientificName?: string;
  organismType?: string;
  cropHost?: string;
  organismId?: string;
  region?: string;
  status?: string;
  growId?: string;
  plantId?: string;
};

export type PlantTaxonInput = {
  scientificName: string;
  commonNames?: string[];
  family?: string;
  genus?: string;
  species?: string;
  synonyms?: string[];
  gbifTaxonKey?: string;
  usdaSymbol?: string;
  powoId?: string;
  nativeRange?: string[];
  introducedRange?: string[];
  cropCategory?: string;
  curationStatus?: string;
  sourceRecords?: SourceRecord[];
};

export type PlantTaxon = PlantTaxonInput & {
  id?: string;
  _id?: string;
  submittedBy?: string | null;
  archivedAt?: string | null;
};

export type CropProfileInput = {
  cropKey?: string;
  displayName: string;
  plantTaxon?: string | null;
  scientificName?: string;
  commonNames?: string[];
  cropCategory?: string;
  growthHabit?: string;
  productionSystems?: string[];
  stages?: string[];
  environmentTargets?: unknown[];
  nutritionTargets?: unknown[];
  symptomPatterns?: unknown[];
  ipmRiskNotes?: string[];
  cultivarSensitivity?: unknown[];
  recommendationCautions?: string[];
  curationStatus?: string;
  sourceRecords?: SourceRecord[];
};

export type CropProfile = CropProfileInput & {
  id?: string;
  _id?: string;
  submittedBy?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  archivedAt?: string | null;
};

export type OrganismProfileInput = {
  scientificName: string;
  commonNames?: string[];
  organismType?: string;
  role?: string;
  cropHosts?: string[];
  symptoms?: string[];
  damagePattern?: string;
  lifeCycle?: string;
  indoorRisk?: string;
  outdoorRisk?: string;
  greenhouseRisk?: string;
  regionLimits?: string[];
  ipmNextChecks?: string[];
  nonChemicalManagement?: string[];
  pesticideDosingAllowed?: boolean;
  curationStatus?: string;
  sourceRecords?: SourceRecord[];
};

export type RegionalAlertInput = {
  organismId: string;
  region: string;
  status?: "invasive" | "regulated" | "watchlist" | "native" | "unknown";
  reportable?: boolean;
  reportingAgency?: string;
  evidenceRequired?: string[];
  curationStatus?: string;
  sourceRecords?: SourceRecord[];
};

export type PlantGrowthProfileInput = {
  growId?: string;
  plantId?: string;
  cropProfileId?: string;
  confirmedScientificName?: string;
  cultivarName?: string;
  phenoLabel?: string;
  keeperStatus?:
    | "unknown"
    | "keeper"
    | "watch"
    | "reject"
    | "retest"
    | "mother_candidate"
    | "breeding_candidate";
  keeperReason?: string;
  cloneStatus?:
    | "unknown"
    | "not_taken"
    | "cut_taken"
    | "rooted"
    | "failed"
    | "mother_stock";
  motherStatus?: "none" | "candidate" | "active" | "retired" | "rejected";
  confirmationStatus?:
    | "user_confirmed"
    | "ai_suggested"
    | "needs_confirmation"
    | "unknown";
  phenoScores?: Array<Record<string, unknown>>;
  stageScorecards?: Array<Record<string, unknown>>;
  sizeMetrics?: Record<string, unknown>;
  timingAdjustments?: Record<string, unknown>;
  waterUseProfile?: Record<string, unknown>;
  stressSensitivities?: string[];
  pestDiseaseSensitivities?: string[];
  notes?: string;
  sourceRecords?: SourceRecord[];
};

export type PlantGrowthProfile = PlantGrowthProfileInput & {
  id?: string;
  _id?: string;
  user?: string;
  cropProfile?: string | null;
  archivedAt?: string | null;
};

function list<T>(path: string, params?: CropKnowledgeListParams) {
  return apiRequest<{ items: T[] }>(path, { params }).then(
    (response) => response.items || []
  );
}

function create<T>(path: string, body: unknown) {
  return apiRequest<{ item: T }>(path, { method: "POST", body }).then(
    (response) => response.item
  );
}

function update<T>(path: string, body: unknown) {
  return apiRequest<{ item: T }>(path, { method: "PATCH", body }).then(
    (response) => response.item
  );
}

function archive(path: string) {
  return apiRequest<{ archived: boolean }>(path, { method: "DELETE" }).then((response) =>
    Boolean(response.archived)
  );
}

export function listPlantTaxa(params?: CropKnowledgeListParams) {
  return list(routes.CROP_KNOWLEDGE.TAXA, params);
}

export function createPlantTaxon(input: PlantTaxonInput) {
  return create(routes.CROP_KNOWLEDGE.TAXA, input);
}

export function getPlantTaxon(id: string) {
  return apiRequest<{ item: unknown }>(routes.CROP_KNOWLEDGE.TAXON_DETAIL(id)).then(
    (response) => response.item
  );
}

export function updatePlantTaxon(id: string, input: Partial<PlantTaxonInput>) {
  return update(routes.CROP_KNOWLEDGE.TAXON_DETAIL(id), input);
}

export function archivePlantTaxon(id: string) {
  return archive(routes.CROP_KNOWLEDGE.TAXON_DETAIL(id));
}

export function listCropProfiles(params?: CropKnowledgeListParams) {
  return list(routes.CROP_KNOWLEDGE.CROP_PROFILES, params);
}

export function getCropProfile(id: string) {
  return apiRequest<{ item: unknown }>(
    routes.CROP_KNOWLEDGE.CROP_PROFILE_DETAIL(id)
  ).then((response) => response.item);
}

export function createCropProfile(input: CropProfileInput) {
  return create(routes.CROP_KNOWLEDGE.CROP_PROFILES, input);
}

export function updateCropProfile(id: string, input: Partial<CropProfileInput>) {
  return update(routes.CROP_KNOWLEDGE.CROP_PROFILE_DETAIL(id), input);
}

export function archiveCropProfile(id: string) {
  return archive(routes.CROP_KNOWLEDGE.CROP_PROFILE_DETAIL(id));
}

export function seedStarterCropProfiles() {
  return apiRequest<{
    items: unknown[];
    count: number;
    curationStatus: string;
    message: string;
  }>(routes.CROP_KNOWLEDGE.STARTER_CROP_PROFILE_SEED, {
    method: "POST"
  });
}

export function listOrganismProfiles(params?: CropKnowledgeListParams) {
  return list(routes.CROP_KNOWLEDGE.ORGANISMS, params);
}

export function createOrganismProfile(input: OrganismProfileInput) {
  return create(routes.CROP_KNOWLEDGE.ORGANISMS, input);
}

export function getOrganismProfile(id: string) {
  return apiRequest<{ item: unknown }>(routes.CROP_KNOWLEDGE.ORGANISM_DETAIL(id)).then(
    (response) => response.item
  );
}

export function updateOrganismProfile(id: string, input: Partial<OrganismProfileInput>) {
  return update(routes.CROP_KNOWLEDGE.ORGANISM_DETAIL(id), input);
}

export function archiveOrganismProfile(id: string) {
  return archive(routes.CROP_KNOWLEDGE.ORGANISM_DETAIL(id));
}

export function listRegionalAlerts(params?: CropKnowledgeListParams) {
  return list(routes.CROP_KNOWLEDGE.REGIONAL_ALERTS, params);
}

export function createRegionalAlert(input: RegionalAlertInput) {
  return create(routes.CROP_KNOWLEDGE.REGIONAL_ALERTS, input);
}

export function updateRegionalAlert(id: string, input: Partial<RegionalAlertInput>) {
  return update(routes.CROP_KNOWLEDGE.REGIONAL_ALERT_DETAIL(id), input);
}

export function archiveRegionalAlert(id: string) {
  return archive(routes.CROP_KNOWLEDGE.REGIONAL_ALERT_DETAIL(id));
}

export function listPlantGrowthProfiles(params?: CropKnowledgeListParams) {
  return list(routes.CROP_KNOWLEDGE.PLANT_GROWTH_PROFILES, params);
}

export function savePlantGrowthProfile(input: PlantGrowthProfileInput) {
  return create(routes.CROP_KNOWLEDGE.PLANT_GROWTH_PROFILES, input);
}

export function getPlantGrowthProfile(id: string) {
  return apiRequest<{ item: unknown }>(
    routes.CROP_KNOWLEDGE.PLANT_GROWTH_PROFILE_DETAIL(id)
  ).then((response) => response.item);
}

export function updatePlantGrowthProfile(
  id: string,
  input: Partial<PlantGrowthProfileInput>
) {
  return update(routes.CROP_KNOWLEDGE.PLANT_GROWTH_PROFILE_DETAIL(id), input);
}

export function archivePlantGrowthProfile(id: string) {
  return archive(routes.CROP_KNOWLEDGE.PLANT_GROWTH_PROFILE_DETAIL(id));
}
