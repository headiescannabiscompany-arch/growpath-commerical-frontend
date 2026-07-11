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
  mixingOrder?: string[];
  calculation?: Record<string, any>;
  notes?: string;
  active?: boolean;
  archivedAt?: string | null;
  useCount?: number;
  lastUsedAt?: string | null;
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
