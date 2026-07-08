import fs from "fs";
import path from "path";
import React from "react";
import { render } from "@testing-library/react-native";

import MarketplaceIntegrationScreen from "@/screens/commercial/MarketplaceIntegrationScreen";

describe("commercial external channel copy", () => {
  it("keeps external integrations separate from marketplace language", () => {
    const screen = render(<MarketplaceIntegrationScreen />);

    expect(screen.getByText("External Channel Integrations")).toBeTruthy();
    expect(screen.getByText(/GrowPath storefront, products, courses/i)).toBeTruthy();
    expect(screen.queryByText("Marketplace & External Channels")).toBeNull();
  });

  it("uses course and storefront language in the influencer CTA", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/screens/commercial/InfluencerDashboardScreen.js"),
      "utf8"
    );

    expect(source).toContain("Use courses, lives, and Storefront offers");
    expect(source).toContain("Create Course ->");
    expect(source).not.toContain("content marketplace");
    expect(source).not.toContain("Use Creator Content");
    expect(source).not.toMatch(/Upload Content/);
  });
});
