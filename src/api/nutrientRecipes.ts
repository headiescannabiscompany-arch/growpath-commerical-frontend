import { apiRequest } from "./apiRequest";
import type { SourceRecord } from "./productIngredients";

export type NutrientRecipe = {
  _id: string;
  id?: string;
  user?: string;
  name: string;
  description?: string;
  version: number;
  rootRecipeId?: string | null;
  previousVersionId?: string | null;
  clonedFromRecipeId?: string | null;
  growId?: string | null;
  facilityId?: string | null;
  commercialAccountId?: string | null;
  recipeType?:
    | "feed"
    | "soil_mix"
    | "dry_blend"
    | "topdress"
    | "foliar"
    | "tea"
    | "facility_sop"
    | "commercial_formula";
  purpose?: string;
  linkedProductId?: string | null;
  linkedBatchId?: string | null;
  stage: string;
  medium: string;
  batchVolume: number;
  batchUnit: "L" | "gal";
  products: Record<string, any>[];
  releaseEnvironment?: Record<string, any>;
  waterBaseline?: Record<string, any>;
  measuredEC?: number | null;
  measuredPH?: number | null;
  sourceConfidence?: Record<string, any>;
  sourceRecords?: SourceRecord[];
  directions?: string;
  applicationRate?: string;
  mixingOrder?: string[];
  calculation?: Record<string, any>;
  notes?: string;
  active?: boolean;
  archivedAt?: string | null;
  useCount?: number;
  lastUsedAt?: string | null;
};

export type RecipeComparison = {
  leftRecipeId: string;
  rightRecipeId: string;
  sameRecipeFamily: boolean;
  versionChange: number;
  fieldChanges: Array<{ field: string; left: any; right: any }>;
  ingredientChanges: Array<{ ingredient: string; left: any; right: any }>;
  calculationChanges: { left: Record<string, any>; right: Record<string, any> };
};

export async function listNutrientRecipes(growId?: string): Promise<NutrientRecipe[]> {
  const res: any = await apiRequest("/api/tools/recipes", {
    method: "GET",
    params: growId ? { growId } : undefined
  });
  const rows = res?.items ?? res?.data?.items ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function createNutrientRecipe(payload: Record<string, any>) {
  const res: any = await apiRequest("/api/tools/recipes", {
    method: "POST",
    body: payload
  });
  return (res?.recipe ?? res?.data?.recipe) as NutrientRecipe;
}

export async function reviseNutrientRecipe(id: string, payload: Record<string, any>) {
  const res: any = await apiRequest(
    `/api/tools/recipes/${encodeURIComponent(id)}/revisions`,
    {
      method: "POST",
      body: payload
    }
  );
  return (res?.recipe ?? res?.data?.recipe) as NutrientRecipe;
}

export async function updateNutrientRecipe(id: string, payload: Record<string, any>) {
  const res: any = await apiRequest(`/api/tools/recipes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload
  });
  return (res?.recipe ?? res?.data?.recipe) as NutrientRecipe;
}

export async function cloneNutrientRecipe(id: string, name?: string) {
  const res: any = await apiRequest(
    `/api/tools/recipes/${encodeURIComponent(id)}/clone`,
    {
      method: "POST",
      body: name ? { name } : {}
    }
  );
  return (res?.recipe ?? res?.data?.recipe) as NutrientRecipe;
}

export async function compareNutrientRecipes(
  leftRecipeId: string,
  rightRecipeId: string
): Promise<RecipeComparison> {
  const res: any = await apiRequest("/api/tools/recipes/compare", {
    method: "POST",
    body: { recipeIds: [leftRecipeId, rightRecipeId] }
  });
  return res?.comparison ?? res?.data?.comparison;
}

export async function convertRecipeToProductDraft(
  id: string,
  payload: Record<string, any> = {}
) {
  const res: any = await apiRequest(
    `/api/tools/recipes/${encodeURIComponent(id)}/product-draft`,
    { method: "POST", body: payload }
  );
  return res?.product ?? res?.data?.product;
}

export async function convertRecipeToProductionBatch(
  id: string,
  payload: Record<string, any> = {}
) {
  const res: any = await apiRequest(
    `/api/tools/recipes/${encodeURIComponent(id)}/production-batch`,
    { method: "POST", body: payload }
  );
  return res?.batch ?? res?.data?.batch;
}

export async function recordNutrientRecipeUse(
  id: string,
  payload: {
    growId?: string;
    batchVolume?: number;
    batchUnit?: "L" | "gal";
    measuredEC?: number | null;
    measuredPH?: number | null;
    waterBaseline?: Record<string, any>;
    saveLog?: boolean;
  }
) {
  return apiRequest(`/api/tools/recipes/${encodeURIComponent(id)}/use`, {
    method: "POST",
    body: payload
  });
}

export async function archiveNutrientRecipe(id: string): Promise<boolean> {
  const res: any = await apiRequest(`/api/tools/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  return Boolean(res?.archived ?? res?.data?.archived);
}
