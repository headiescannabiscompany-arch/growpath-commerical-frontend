import React from "react";
import { render } from "@testing-library/react-native";

import UnifiedRecipeBuilderRoute from "@/app/home/personal/(tabs)/tools/recipe-builder";

let mockParams: Record<string, string> = { growId: "grow-1" };

jest.mock("expo-router", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Link: ({ children, href }: any) =>
      React.createElement(View, { accessibilityLabel: `link-${String(href)}` }, children),
    useLocalSearchParams: () => mockParams
  };
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

describe("mix builder chooser", () => {
  beforeEach(() => {
    mockParams = { growId: "grow-1" };
  });

  it("offers only the two canonical science-backed builders and keeps grow context", () => {
    const screen = render(<UnifiedRecipeBuilderRoute />);

    expect(screen.getByText("Nutrient Mix Builder")).toBeTruthy();
    expect(screen.getByText("Soil Mix Builder")).toBeTruthy();
    expect(screen.getByText(/only two primary mix builders/)).toBeTruthy();
    expect(
      screen.getByLabelText("link-/home/personal/tools/npk?growId=grow-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("link-/home/personal/tools/soil-builder?growId=grow-1")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("link-/home/personal/tools/ingredient-library?growId=grow-1")
    ).toBeTruthy();
    expect(screen.getByText(/not a third mix builder/)).toBeTruthy();
    expect(screen.queryByText("Nutrient Chemistry")).toBeNull();
    expect(screen.queryByText("Dry Amendment / Topdress")).toBeNull();
    expect(screen.queryByText("Ingredient Catalog")).toBeNull();
  });

  it("preserves facility and commercial record context for either builder", () => {
    mockParams = {
      growId: "grow-1",
      facilityId: "facility-1",
      batchId: "batch-1",
      source: "batch"
    };

    const screen = render(<UnifiedRecipeBuilderRoute basePath="/home/facility/tools" />);
    const query = "growId=grow-1&facilityId=facility-1&batchId=batch-1&source=batch";

    expect(screen.getByLabelText(`link-/home/facility/tools/npk?${query}`)).toBeTruthy();
    expect(
      screen.getByLabelText(`link-/home/facility/tools/soil-builder?${query}`)
    ).toBeTruthy();
  });
});
