import { apiRequest } from "./apiRequest";

export type ProductIngredient = {
  _id?: string;
  id?: string;
  name: string;
  brand?: string;
  category?: string;
  chemistryKey?: string;
  labelNPK?: {
    N?: number;
    P?: number;
    K?: number;
  };
  elemental?: Record<string, any>;
  nutrientForms?: Record<string, any>[];
  conditions?: Record<string, any>;
  bestUseCases?: string[];
  badUseCases?: string[];
  warnings?: string[];
  densityGml?: number | null;
  organicOrSynthetic?: string;
  sourceType?: string;
  confidence?: "low" | "medium" | "high";
  sourceUrl?: string;
  sourceRecords?: {
    sourceName: string;
    sourceType?: string;
    url?: string;
    citation?: string;
    license?: string;
    commercialUseAllowed?: boolean;
    trainingUseAllowed?: boolean;
    confidence?: "low" | "medium" | "high";
    notes?: string;
  }[];
  favorite?: boolean;
  archivedAt?: string | null;
};

export async function listProductIngredients(options?: {
  includeArchived?: boolean;
}): Promise<ProductIngredient[]> {
  const res: any = await apiRequest("/api/tools/ingredients", {
    method: "GET",
    params: options?.includeArchived ? { includeArchived: "true" } : undefined
  });
  const rows = res?.items ?? res?.data?.items ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function getProductIngredient(
  id: string
): Promise<ProductIngredient | null> {
  try {
    const res: any = await apiRequest(
      `/api/tools/ingredients/${encodeURIComponent(id)}`,
      {
        method: "GET"
      }
    );
    return (res?.item ?? res?.data?.item ?? null) as ProductIngredient | null;
  } catch (_error) {
    return null;
  }
}

export async function createProductIngredient(payload: Partial<ProductIngredient>) {
  const res: any = await apiRequest("/api/tools/ingredients", {
    method: "POST",
    body: payload
  });
  return (res?.created ?? res?.data?.created) as ProductIngredient;
}

export async function updateProductIngredient(
  id: string,
  payload: Partial<ProductIngredient>
) {
  const res: any = await apiRequest(`/api/tools/ingredients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: payload
  });
  return (res?.updated ?? res?.data?.updated) as ProductIngredient;
}

export async function archiveProductIngredient(id: string): Promise<boolean> {
  const res: any = await apiRequest(`/api/tools/ingredients/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  return Boolean(res?.archived ?? res?.data?.archived);
}
