import { api } from "./client";

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
  return api.get(`/commercial/products`);
}

export async function createProduct(data: Partial<Product>) {
  return api.post(`/commercial/products`, data);
}

export async function updateProduct(productId: string, data: Partial<Product>) {
  return api.patch(`/commercial/products/${productId}`, data);
}

export async function deleteProduct(productId: string) {
  return api.del(`/commercial/products/${productId}`);
}
