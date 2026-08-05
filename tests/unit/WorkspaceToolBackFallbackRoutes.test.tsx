import React from "react";
import { render } from "@testing-library/react-native";

import CommercialAskAI from "@/app/home/commercial/tools/ask-ai";
import CommercialDryAmendment from "@/app/home/commercial/tools/dry-amendment-mix";
import CommercialEnvironment from "@/app/home/commercial/tools/environment";
import CommercialHarvestReadiness from "@/app/home/commercial/tools/harvest-readiness";
import CommercialIngredientLibrary from "@/app/home/commercial/tools/ingredient-library";
import CommercialNpk from "@/app/home/commercial/tools/npk";
import CommercialRecipeBuilder from "@/app/home/commercial/tools/recipe-builder";
import CommercialReport from "@/app/home/commercial/tools/report";
import CommercialSoilBuilder from "@/app/home/commercial/tools/soil-builder";
import FacilityAskAI from "@/app/home/facility/(tabs)/ai-ask";
import FacilityEnvironment from "@/app/home/facility/(tabs)/tools/environment";
import FacilityHarvestReadiness from "@/app/home/facility/(tabs)/tools/harvest-readiness";
import FacilityIngredientLibrary from "@/app/home/facility/(tabs)/tools/ingredient-library";
import FacilityNpk from "@/app/home/facility/(tabs)/tools/npk";
import FacilityRecipeBuilder from "@/app/home/facility/(tabs)/tools/recipe-builder";
import FacilitySoilBuilder from "@/app/home/facility/(tabs)/tools/soil-builder";
import PersonalAnalytics from "@/app/home/personal/more/analytics";

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, `Boundary ${backFallbackHref}`),
        children
      )
  };
});

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/app/home/personal/(tabs)/ai", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ workspaceType, facilityId }: any) =>
    React.createElement(Text, null, `AI ${workspaceType} ${facilityId || ""}`);
});

jest.mock("@/app/home/personal/(tabs)/tools/environment-analysis", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ backFallbackHref }: any) =>
    React.createElement(Text, null, `Environment ${backFallbackHref}`);
});

jest.mock("@/app/home/personal/(tabs)/tools/npk", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ backFallbackHref }: any) =>
    React.createElement(Text, null, `NPK ${backFallbackHref}`);
});

jest.mock("@/app/home/personal/(tabs)/tools/soil-builder", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ backFallbackHref }: any) =>
    React.createElement(Text, null, `Soil ${backFallbackHref}`);
});

jest.mock("@/app/home/personal/(tabs)/tools/dry-amendment-mix", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ backFallbackHref }: any) =>
    React.createElement(Text, null, `Dry ${backFallbackHref}`);
});

jest.mock("@/app/home/personal/(tabs)/tools/ingredient-library", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ backFallbackHref }: any) =>
    React.createElement(Text, null, `Library ${backFallbackHref}`);
});

jest.mock("@/app/home/personal/(tabs)/tools/harvest-readiness", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ backFallbackHref, workspaceType, workspaceId }: any) =>
    React.createElement(
      Text,
      null,
      `Harvest ${backFallbackHref} ${workspaceType || ""} ${workspaceId || ""}`
    );
});

jest.mock("@/app/home/personal/(tabs)/tools/pdf-export", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ backFallbackHref }: any) =>
    React.createElement(Text, null, `Report ${backFallbackHref}`);
});

jest.mock("@/app/home/personal/(tabs)/tools/recipe-builder", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ basePath, backFallbackHref }: any) =>
    React.createElement(Text, null, `Recipe ${basePath} ${backFallbackHref}`);
});

jest.mock("@/screens/AnalyticsScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Analytics content");
});

describe("workspace tool back fallback routes", () => {
  it("gives Personal analytics a shared Back to the Personal hub", () => {
    const screen = render(<PersonalAnalytics />);

    expect(screen.getByText("Boundary /home/personal")).toBeTruthy();
    expect(screen.getByText("Analytics content")).toBeTruthy();
  });

  it("keeps Ask AI inside the active Commercial or Facility workspace", () => {
    const commercial = render(<CommercialAskAI />);
    expect(commercial.getByText("Boundary /home/commercial/tools")).toBeTruthy();
    expect(commercial.getByText("AI commercial ")).toBeTruthy();
    commercial.unmount();

    const facility = render(<FacilityAskAI />);
    expect(facility.getByText("Boundary /home/facility/ai-tools")).toBeTruthy();
    expect(facility.getByText("AI facility facility-1")).toBeTruthy();
  });

  it("passes the Commercial tools hub to every shared Commercial tool", () => {
    const screen = render(
      <>
        <CommercialEnvironment />
        <CommercialNpk />
        <CommercialSoilBuilder />
        <CommercialDryAmendment />
        <CommercialIngredientLibrary />
        <CommercialHarvestReadiness />
        <CommercialReport />
        <CommercialRecipeBuilder />
      </>
    );

    ["Environment", "NPK", "Soil", "Dry", "Library", "Report"].forEach((label) =>
      expect(screen.getByText(`${label} /home/commercial/tools`)).toBeTruthy()
    );
    expect(screen.getByText("Harvest /home/commercial/tools commercial ")).toBeTruthy();
    expect(
      screen.getByText("Recipe /home/commercial/tools /home/commercial/tools")
    ).toBeTruthy();
  });

  it("passes the Facility AI tools hub to every shared Facility tool", () => {
    const screen = render(
      <>
        <FacilityEnvironment />
        <FacilityNpk />
        <FacilitySoilBuilder />
        <FacilityIngredientLibrary />
        <FacilityHarvestReadiness />
        <FacilityRecipeBuilder />
      </>
    );

    ["Environment", "NPK", "Soil", "Library"].forEach((label) =>
      expect(screen.getByText(`${label} /home/facility/ai-tools`)).toBeTruthy()
    );
    expect(
      screen.getByText("Harvest /home/facility/ai-tools facility facility-1")
    ).toBeTruthy();
    expect(
      screen.getByText("Recipe /home/facility/tools /home/facility/ai-tools")
    ).toBeTruthy();
  });
});
