import {
  findReviewedCropLifecycle,
  reviewedCropLifecycleRegistry
} from "@/knowledge/cropLifecycleRegistry";
import { sourceRegistry } from "@/knowledge/sourceRegistry";

describe("reviewed crop lifecycle registry", () => {
  it.each([
    ["garden tomato", "climate_dependent_perennial", "cultivar_dependent"],
    ["sweet basil", "annual", "repeat_harvest"],
    ["leaf lettuce", "annual", "cultivar_dependent"],
    ["strawberry", "climate_dependent_perennial", "cultivar_dependent"],
    ["apple tree", "long_lived_perennial", "seasonal_perennial"],
    ["golden pothos", "long_lived_perennial", "non_harvest_observation"],
    ["french marigold", "annual", "cultivar_dependent"],
    ["radish microgreens", "annual", "single_harvest"],
    ["button mushroom", "finite_cycle", "repeat_harvest"]
  ])("maps %s to reviewed lifecycle guidance", (commonName, lifeSpan, production) => {
    const profile = findReviewedCropLifecycle({ commonName });

    expect(profile).toEqual(
      expect.objectContaining({
        lifeSpanPath: lifeSpan,
        productionPattern: production
      })
    );
    expect(profile?.guidance.length).toBeGreaterThan(1);
    expect(profile?.requiredQuestions.length).toBeGreaterThan(1);
  });

  it("matches accepted scientific names without guessing unknown crops", () => {
    expect(findReviewedCropLifecycle({ scientificName: "Fragaria × ananassa" })?.id).toBe(
      "strawberry-fragaria-ananassa-lifecycle-v1"
    );
    expect(findReviewedCropLifecycle({ commonName: "dragon fruit" })).toBeUndefined();
  });

  it("links every lifecycle profile to registered Tier A crop sources", () => {
    const sourcesById = new Map(sourceRegistry.map((source) => [source.id, source]));

    for (const profile of reviewedCropLifecycleRegistry) {
      expect(profile.sourceIds.length).toBeGreaterThan(0);
      for (const sourceId of profile.sourceIds) {
        expect(sourcesById.get(sourceId)).toEqual(
          expect.objectContaining({
            reliabilityTier: "A",
            trustedFor: expect.arrayContaining(["crop_lifecycle"])
          })
        );
      }
    }
  });
});
