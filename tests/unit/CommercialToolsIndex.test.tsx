import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import CommercialToolsIndex, {
  COMMERCIAL_CORE_TOOLS,
  COMMERCIAL_PRODUCTION_TOOLS
} from "@/app/home/commercial/tools";

const mockPush = jest.fn();
const mockTokenBalanceWidget = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href, target }: any) =>
      React.cloneElement(children, {
        href,
        target,
        onPress: () => mockPush(href)
      })
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

    expect(batchPlannerLink.props.target).toBe("_top");
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
