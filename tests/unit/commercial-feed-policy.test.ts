import { describe, expect, it } from "@jest/globals";

import {
  facilitySalesPolicyText,
  hasFacilitySalesLanguage
} from "../../src/utils/commercialFeedPolicy";

describe("commercial feed policy", () => {
  it("allows facility education language", () => {
    expect(
      hasFacilitySalesLanguage([
        "Powdery mildew prevention checklist",
        "Use airflow, spacing, and scouting to reduce risk.",
        "ipm",
        "education"
      ])
    ).toBe(false);
  });

  it("blocks sales language in facility education posts", () => {
    expect(
      hasFacilitySalesLanguage([
        "Educational clone trays available now",
        "DM for pricing on rooted trays.",
        "sales"
      ])
    ).toBe(true);
    expect(facilitySalesPolicyText()).toMatch(/educational content/i);
  });
});
