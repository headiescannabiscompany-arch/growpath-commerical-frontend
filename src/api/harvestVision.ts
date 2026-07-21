import { apiRequest } from "./apiRequest";

export type TrichomeVisionResult = {
  photoUsable: boolean;
  imageQuality: "usable" | "limited" | "unusable";
  clear: number | null;
  cloudy: number | null;
  amber: number | null;
  confidence: number;
  dominant: "clear" | "cloudy" | "amber" | "uncertain";
  visibleTraits: string[];
  evidence: string[];
  recommendation: string;
  limitations: string[];
  provider: string;
  providerLabel: string;
  providerModel: string;
  imagesAnalyzed: number;
  evidenceUsed: string[];
  analysisId: string;
  aiCreditsUsed: number;
  aiTokensRemaining?: number;
  creditStatus: "charged" | "refunded" | "not_charged";
};

export async function analyzeTrichomePhotos(input: {
  growId: string;
  evidenceAssetIds: string[];
  daysSinceFlip?: number;
  sampleLocation?: string;
  notes?: string;
}): Promise<TrichomeVisionResult> {
  const response = await apiRequest<any>("/api/ai/harvest/trichomes", {
    method: "POST",
    body: input
  });
  const result = response?.result ?? response?.data?.result ?? response?.data ?? response;
  if (!result || typeof result.photoUsable !== "boolean") {
    throw new Error(
      "The photo analysis returned an incomplete result. Please try again."
    );
  }
  return result as TrichomeVisionResult;
}
