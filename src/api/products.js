import { client } from "./client.js";

export function getProducts(token) {
  return client.get("/api/products", token);
}

export function addProduct(data, token) {
  return client.post("/api/products", data, token);
}

export function updateProduct(id, data, token) {
  return client.put(`/api/products/${id}`, data, token);
}

export function removeProduct(id, token) {
  return client.delete(`/api/products/${id}`, token);
}
