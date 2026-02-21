import { apiRequest } from "./apiRequest";

export type Product = {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  status?: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchProducts(): Promise<Product[]> {
  return apiRequest(`/commercial/products`);
}

export async function createProduct(data: Partial<Product>) {
  return apiRequest(`/commercial/products`, { method: "POST", body: data });
}

export async function updateProduct(productId: string, data: Partial<Product>) {
  return apiRequest(`/commercial/products/${productId}`, {
    method: "PATCH",
    body: data
  });
}

export async function deleteProduct(productId: string) {
  return apiRequest(`/commercial/products/${productId}`, { method: "DELETE" });
}
