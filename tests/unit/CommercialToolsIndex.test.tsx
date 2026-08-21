import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import fs from "node:fs";
import path from "node:path";

import CommercialToolsIndex, {
  COMMERCIAL_CORE_TOOLS,
  COMMERCIAL_PRODUCTION_TOOLS
} from "@/app/home/commercial/tools";

const mockPush = jest.fn();
const mockTokenBalanceWidget = jest.fn();

jest.mock("expo-router", () => {
  return {
    useRouter: () => ({ push: mockPush })
  };
});

jest.mock("@/components/TokenBalanceWidget", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) => {
    mockTokenBalanceWidget(props);
    return React.createElement(View, { testID: "token-balance" });
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, ...props }: any) => React.createElement(View, props, children);
});

describe("CommercialToolsIndex", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockTokenBalanceWidget.mockReset();
  });

  it("surfaces the soil and nutrient batch planner only through Commercial", () => {
    const screen = render(<CommercialToolsIndex />);

    expect(mockTokenBalanceWidget).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceType: "commercial" })
    );

    expect(screen.getByText("Soil & Nutrient Batch Planner")).toBeTruthy();
    expect(
      screen.getByText(
        "Estimate production batch costs, bag counts, pull sheets, labor, packaging, and margin."
      )
    ).toBeTruthy();

    const batchPlannerLink = screen.getByLabelText("Open batch planner");

    fireEvent.press(batchPlannerLink);

    expect(mockPush).toHaveBeenCalledWith("/home/commercial/tools/soil-nutrient-batch");
  });

  it("shows truthful Commercial ownership and only supported general hub routes", () => {
    const screen = render(<CommercialToolsIndex />);

    expect(screen.getByText("Commercial workspace boundary")).toBeTruthy();
    expect(
      screen.getByText(/allowance for the signed-in Commercial account/i)
    ).toBeTruthy();
    expect(screen.getByText("Shared grow intelligence")).toBeTruthy();
    expect(screen.getByText("Commercial production and records")).toBeTruthy();
    expect(screen.getByText("Plant & Crop Identification")).toBeTruthy();
    expect(screen.getByText("IPM Scout")).toBeTruthy();
    expect(screen.getByText("Saved AI Runs")).toBeTruthy();

    const allItems = [...COMMERCIAL_CORE_TOOLS, ...COMMERCIAL_PRODUCTION_TOOLS];
    for (const item of allItems) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByLabelText(item.actionLabel)).toBeTruthy();
      expect(item.href).toMatch(/^\/home\/commercial\//);
    }

    const discoveryText = allItems
      .map((item) => `${item.title} ${item.description}`)
      .join(" ");
    expect(discoveryText).not.toMatch(/harvest|trichome|dry \/ cure|pheno|genetics/i);
    expect(screen.queryByText("Saved Runs / Reports")).toBeNull();
  });

  it("keeps every displayed Commercial tool on a real Commercial-local route", () => {
    const allItems = [...COMMERCIAL_CORE_TOOLS, ...COMMERCIAL_PRODUCTION_TOOLS];
    const missingRoutes = allItems
      .map((item) => new URL(item.href, "https://growpathai.com").pathname)
      .filter((pathname) => pathname.startsWith("/home/commercial/"))
      .filter((pathname) => {
        const relativePath = pathname.replace(/^\//, "");
        return ![
          path.join(process.cwd(), "src", "app", `${relativePath}.tsx`),
          path.join(process.cwd(), "src", "app", relativePath, "index.tsx")
        ].some((candidate) => fs.existsSync(candidate));
      });

    expect(missingRoutes).toEqual([]);
    expect(
      COMMERCIAL_CORE_TOOLS.find((item) => item.title === "Plant & Crop Identification")
        ?.href
    ).toBe("/home/commercial/tools/species-crop-id?workspace=commercial");
    expect(COMMERCIAL_CORE_TOOLS.find((item) => item.title === "IPM Scout")?.href).toBe(
      "/home/commercial/tools/ipm-scout?workspace=commercial"
    );
    expect(
      COMMERCIAL_PRODUCTION_TOOLS.find((item) => item.title === "Saved AI Runs")?.href
    ).toBe("/home/commercial/tools/saved-runs?workspace=commercial");
  });

  it("routes mix builders with explicit Commercial workspace context", () => {
    const screen = render(<CommercialToolsIndex />);

    fireEvent.press(screen.getByLabelText("Choose a mix builder"));

    expect(mockPush).toHaveBeenCalledWith(
      "/home/commercial/tools/recipe-builder?workspace=commercial"
    );
  });

  it("keeps every web-linked action on a visible theme accent background", () => {
    const screen = render(<CommercialToolsIndex />);
    const allItems = [...COMMERCIAL_CORE_TOOLS, ...COMMERCIAL_PRODUCTION_TOOLS];

    for (const item of allItems) {
      const action = screen.getByLabelText(item.actionLabel);

      expect(typeof action.props.style).not.toBe("function");
      expect(action.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: expect.any(String) })
        ])
      );
    }
  });
});
