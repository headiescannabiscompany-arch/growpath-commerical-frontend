import { apiRequest } from "./apiRequest";

export type TrichomeVisionResult = {
  photoUsable: boolean;
  clear: number;
  cloudy: number;
  amber: number;
  confidence: number;
  dominant: "clear" | "cloudy" | "amber" | "uncertain";
  evidence: string[];
  recommendation: string;
  limitations: string[];
  provider: string;
  imagesAnalyzed: number;
};

export async function analyzeTrichomePhotos(input: {
  growId: string;
  images: string[];
  daysSinceFlip?: number;
  sampleLocation?: string;
  notes?: string;
}): Promise<TrichomeVisionResult> {
  const response = await apiRequest<any>("/api/ai/harvest/trichomes", {
    method: "POST",
    body: input
  });
  return response?.result;
}
