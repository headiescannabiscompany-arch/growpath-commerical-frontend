import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type ProductLine = {
  id?: string;
  _id?: string;
  name: string;
  category?: string;
  publicSummary?: string;
  description?: string;
  coverImageUrl?: string;
  status?: "draft" | "testing" | "active" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

export type ProductTrial = {
  id?: string;
  _id?: string;
  trialName: string;
  name?: string;
  purpose?: string;
  productId?: string;
  productLineId?: string;
  batchId?: string;
  growId?: string;
  cropType?: string;
  cultivar?: string;
  plantCount?: number;
  measurements?: Record<string, any>;
  effectivenessSummary?: string;
  harvestQualityNotes?: string;
  commercialCropSummary?: string;
  AIReview?: Record<string, any>;
  aiReview?: Record<string, any>;
  notes?: string;
  status?: "planned" | "active" | "complete" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

export type CommercialGrow = {
  id?: string;
  _id?: string;
  name?: string;
  growName?: string;
  purpose?: string;
  cropType?: string;
  cultivar?: string;
  medium?: string;
  plantCount?: number;
  productId?: string;
  productLineId?: string;
  batchId?: string;
  formulaVersion?: string;
  publicShareStatus?: "private" | "evidence_building" | "public_ready";
  measurementPlan?: string;
  harvestQualityNotes?: string;
  commercialCropSummary?: string;
  notes?: string;
  status?: "planned" | "active" | "completed" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

export type SoilNutrientBatch = {
  id?: string;
  _id?: string;
  batchName?: string;
  name?: string;
  batchCode?: string;
  purpose?: string;
  formulaVersion?: string;
  productId?: string;
  productLineId?: string;
  trialGrowId?: string;
  batchVolume?: number;
  batchVolumeUnit?: string;
  estimatedCost?: number;
  costPerUnit?: number;
  releaseTimelineNotes?: string;
  guaranteedAnalysisNotes?: string;
  ingredientSummary?: string;
  mixingInstructions?: string;
  notes?: string;
  status?: "draft" | "planned" | "mixed" | "resting" | "ready" | "used" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

export type CommercialCourse = {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  category?: string;
  access?: "free" | "paid" | "followers" | "customers" | "private";
  price?: number;
  linkedProductIds?: string[];
  linkedProductLineIds?: string[];
  linkedGrowIds?: string[];
  lessons?: Array<Record<string, any>>;
  status?: "draft" | "published" | "archived";
  createdAt?: string;
  updatedAt?: string;
};

function listFromEnvelope(value: any, keys: string[]) {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
    if (Array.isArray(value?.data?.[key])) return value.data[key];
  }
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export async function fetchProductLines(): Promise<ProductLine[]> {
  const res = await apiRequest(endpoints.commercial.productLines);
  return listFromEnvelope(res, ["productLines", "lines"]);
}

export async function createProductLine(data: Partial<ProductLine>) {
  const res = await apiRequest(endpoints.commercial.productLines, {
    method: "POST",
    body: data
  });
  return res?.productLine ?? res?.line ?? res?.created ?? res;
}

export async function fetchProductLine(id: string): Promise<ProductLine | null> {
  const res = await apiRequest(endpoints.commercial.productLine(id));
  return res?.productLine ?? res?.line ?? res?.data?.productLine ?? res?.data ?? res ?? null;
}

export async function updateProductLine(id: string, data: Partial<ProductLine>) {
  const res = await apiRequest(endpoints.commercial.productLine(id), {
    method: "PATCH",
    body: data
  });
  return res?.productLine ?? res?.line ?? res?.updated ?? res;
}

export async function fetchProductTrials(): Promise<ProductTrial[]> {
  const res = await apiRequest(endpoints.commercial.trials);
  return listFromEnvelope(res, ["trials", "productTrials"]);
}

export async function createProductTrial(data: Partial<ProductTrial>) {
  const res = await apiRequest(endpoints.commercial.trials, {
    method: "POST",
    body: data
  });
  return res?.trial ?? res?.productTrial ?? res?.created ?? res;
}

export async function fetchProductTrial(id: string): Promise<ProductTrial | null> {
  const res = await apiRequest(endpoints.commercial.trial(id));
  return res?.trial ?? res?.productTrial ?? res?.data?.trial ?? res?.data ?? res ?? null;
}

export async function updateProductTrial(id: string, data: Partial<ProductTrial>) {
  const res = await apiRequest(endpoints.commercial.trial(id), {
    method: "PATCH",
    body: data
  });
  return res?.trial ?? res?.productTrial ?? res?.updated ?? res;
}

export async function saveProductTrialAIReview(
  id: string,
  data: {
    summary?: string;
    evidence?: string[];
    limitations?: string[];
  }
) {
  const res = await apiRequest(`${endpoints.commercial.trial(id)}/ai-review`, {
    method: "POST",
    body: data
  });
  return res?.trial ?? res?.productTrial ?? res?.updated ?? res;
}

export async function fetchCommercialGrows(): Promise<CommercialGrow[]> {
  const res = await apiRequest("/api/commercial/grows");
  return listFromEnvelope(res, ["grows", "commercialGrows"]);
}

export async function fetchCommercialGrow(id: string): Promise<CommercialGrow | null> {
  const res = await apiRequest(`/api/commercial/grows/${encodeURIComponent(id)}`);
  return res?.grow ?? res?.commercialGrow ?? res?.data?.grow ?? res?.data ?? res ?? null;
}

export async function createCommercialGrow(data: Partial<CommercialGrow>) {
  const res = await apiRequest("/api/commercial/grows", {
    method: "POST",
    body: data
  });
  return res?.grow ?? res?.commercialGrow ?? res?.created ?? res;
}

export async function updateCommercialGrow(id: string, data: Partial<CommercialGrow>) {
  const res = await apiRequest(`/api/commercial/grows/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data
  });
  return res?.grow ?? res?.commercialGrow ?? res?.updated ?? res;
}

export async function fetchSoilNutrientBatches(): Promise<SoilNutrientBatch[]> {
  const res = await apiRequest("/api/commercial/batches");
  return listFromEnvelope(res, ["batches", "soilNutrientBatches"]);
}

export async function createSoilNutrientBatch(data: Partial<SoilNutrientBatch>) {
  const res = await apiRequest("/api/commercial/batches", {
    method: "POST",
    body: data
  });
  return res?.batch ?? res?.soilNutrientBatch ?? res?.created ?? res;
}

export async function fetchSoilNutrientBatch(
  id: string
): Promise<SoilNutrientBatch | null> {
  const res = await apiRequest(`/api/commercial/batches/${encodeURIComponent(id)}`);
  return res?.batch ?? res?.soilNutrientBatch ?? res?.data?.batch ?? res?.data ?? res ?? null;
}

export async function updateSoilNutrientBatch(
  id: string,
  data: Partial<SoilNutrientBatch>
) {
  const res = await apiRequest(`/api/commercial/batches/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data
  });
  return res?.batch ?? res?.soilNutrientBatch ?? res?.updated ?? res;
}

export async function fetchCommercialCourses(): Promise<CommercialCourse[]> {
  const res = await apiRequest("/api/commercial/courses");
  return listFromEnvelope(res, ["courses", "commercialCourses"]);
}

export async function createCommercialCourse(data: Partial<CommercialCourse>) {
  const res = await apiRequest("/api/commercial/courses", {
    method: "POST",
    body: data
  });
  return res?.course ?? res?.commercialCourse ?? res?.created ?? res;
}

export async function fetchCommercialCourse(
  id: string
): Promise<CommercialCourse | null> {
  const res = await apiRequest(`/api/commercial/courses/${encodeURIComponent(id)}`);
  return res?.course ?? res?.commercialCourse ?? res?.data?.course ?? res?.data ?? res ?? null;
}

export async function updateCommercialCourse(
  id: string,
  data: Partial<CommercialCourse>
) {
  const res = await apiRequest(`/api/commercial/courses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data
  });
  return res?.course ?? res?.commercialCourse ?? res?.updated ?? res;
}

export async function addCommercialCourseLesson(
  id: string,
  data: Record<string, any>
) {
  const res = await apiRequest(
    `/api/commercial/courses/${encodeURIComponent(id)}/lessons`,
    {
      method: "POST",
      body: data
    }
  );
  return res?.course ?? res?.commercialCourse ?? res?.updated ?? res;
}

export async function publishCommercialCourse(id: string) {
  const res = await apiRequest(
    `/api/commercial/courses/${encodeURIComponent(id)}/publish`,
    {
      method: "POST",
      body: {}
    }
  );
  return res?.course ?? res?.commercialCourse ?? res?.updated ?? res;
}
