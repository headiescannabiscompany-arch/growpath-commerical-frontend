import fs from "fs";
import path from "path";
import React from "react";
import { render } from "@testing-library/react-native";

import MarketplaceIntegrationScreen from "@/screens/commercial/MarketplaceIntegrationScreen";

describe("commercial external channel copy", () => {
  it("keeps external integrations separate from marketplace language", () => {
    const screen = render(<MarketplaceIntegrationScreen />);

    expect(screen.getByText("External Channel Integrations")).toBeTruthy();
    expect(screen.getByText(/GrowPath storefront, products, creator content/i)).toBeTruthy();
    expect(screen.queryByText("Marketplace & External Channels")).toBeNull();
  });

  it("uses Creator Content language in the influencer CTA", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/screens/commercial/InfluencerDashboardScreen.js"),
      "utf8"
    );

    expect(source).toContain("Use Creator Content to sell guides");
    expect(source).toContain("Upload Content ->");
    expect(source).not.toContain("content marketplace");
    expect(source).not.toContain("Upload Content â");
  });
});
