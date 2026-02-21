// src/api/commercialFeed.ts
import { api } from "./client";

export async function getCommercialPost(id: string) {
  const res = await api.get(`/api/commercial/posts/${id}`);
  return res as any;
}
