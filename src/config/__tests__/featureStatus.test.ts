import {
  getNavigablePersonalTools,
  isFeatureNavigable,
  personalToolFeatures
} from "../featureStatus";

describe("personal feature status manifest", () => {
  test("only implemented and beta tools are navigable", () => {
    expect(getNavigablePersonalTools().every(isFeatureNavigable)).toBe(true);
  });

  test("does not expose the crop steering scaffold", () => {
    const cropSteering = personalToolFeatures.find(
      (feature) => feature.key === "tools.crop_steering"
    );

    expect(cropSteering?.status).toBe("hidden");
    expect(getNavigablePersonalTools()).not.toContain(cropSteering);
  });

  test("requires every navigable tool to have a route", () => {
    expect(getNavigablePersonalTools().every((feature) => Boolean(feature.href))).toBe(
      true
    );
  });
});
