import { apiRequest } from "./apiRequest";

const PRODUCTS_BASE = "/api/commercial/products";

export type Product = {
  id: string;
  name: string;
  price?: number;
  priceCents?: number;
  sku?: string;
  description?: string;
  imageUrl?: string;
  unitSize?: string;
  category?: string;
  shortDescription?: string;
  fullDescription?: string;
  linkedRecipeId?: string | null;
  linkedToolRunId?: string | null;
  specs?: Record<string, any>;
  growInterests?: string[];
  inventoryCount?: number | null;
  inventoryItemId?: string | null;
  inventoryItem?: {
    id?: string;
    _id?: string;
    name?: string;
    sku?: string;
    quantity?: number;
    qty?: number;
    unit?: string;
    status?: string;
  } | null;
  currency?: string;
  externalPurchaseUrl?: string;
  stripePriceId?: string;
  status?: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchProducts(): Promise<Product[]> {
  const res = await apiRequest(PRODUCTS_BASE);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.products)) return res.products;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.products)) return res.data.products;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

export async function fetchProduct(productId: string): Promise<Product | null> {
  const res = await apiRequest(`${PRODUCTS_BASE}/${encodeURIComponent(productId)}`);
  return res?.product ?? res?.data?.product ?? res?.data ?? res ?? null;
}

export async function createProduct(data: Partial<Product>) {
  return apiRequest(PRODUCTS_BASE, { method: "POST", body: data });
}

export async function updateProduct(productId: string, data: Partial<Product>) {
  return apiRequest(`${PRODUCTS_BASE}/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteProduct(productId: string) {
  return apiRequest(`${PRODUCTS_BASE}/${encodeURIComponent(productId)}`, {
    method: "DELETE"
  });
}

export async function fetchProductEffectiveness(productId: string) {
  return apiRequest(`${PRODUCTS_BASE}/${encodeURIComponent(productId)}/effectiveness`);
}

function currentOrigin() {
  const location = (globalThis as any)?.window?.location;
  return typeof location?.origin === "string" ? location.origin : "";
}

export async function checkoutProduct(productId: string) {
  const origin = currentOrigin();
  return apiRequest(`${PRODUCTS_BASE}/${encodeURIComponent(productId)}/checkout`, {
    method: "POST",
    body: origin
      ? {
          successUrl: `${origin}/storefront?checkout=success&product=${encodeURIComponent(
            productId
          )}`,
          cancelUrl: `${origin}/storefront?checkout=canceled&product=${encodeURIComponent(
            productId
          )}`
        }
      : {}
  });
}
