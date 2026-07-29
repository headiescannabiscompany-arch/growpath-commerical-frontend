import { apiRequest } from "./apiRequest";

export type StorefrontImportRow = {
  sourceRow: number;
  action: "create" | "update" | "skip";
  draft: Record<string, any>;
  warnings: string[];
  errors: string[];
  appliedProductId?: string | null;
};

export type StorefrontImportBatch = {
  id?: string;
  _id?: string;
  sourceName: string;
  format: "csv" | "pdf";
  status: string;
  rows: StorefrontImportRow[];
};

export async function previewStorefrontImport(input: {
  format: "csv" | "pdf";
  sourceName: string;
  sourceUrl?: string;
  rows?: Record<string, any>[];
}) {
  const result: any = await apiRequest("/api/commercial/products/imports/preview", {
    method: "POST",
    body: input
  });
  return (result?.importBatch || result?.data?.importBatch) as StorefrontImportBatch;
}

export async function applyStorefrontImport(id: string, rowIndexes: number[]) {
  return apiRequest(`/api/commercial/products/imports/${encodeURIComponent(id)}/apply`, {
    method: "POST",
    body: { rowIndexes }
  });
}
