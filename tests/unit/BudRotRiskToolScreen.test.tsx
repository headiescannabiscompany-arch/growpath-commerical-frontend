import React from "react";
import { render } from "@testing-library/react-native";

import BudRotRiskLegacyRoute from "@/app/home/personal/(tabs)/tools/bud-rot-risk";

const mockRedirect = jest.fn((_props?: unknown) => null);
let mockParams: Record<string, string | string[]> = {};

jest.mock("expo-router", () => ({
  Redirect: (props: unknown) => mockRedirect(props),
  useLocalSearchParams: () => mockParams
}));

describe("Bud Rot Risk legacy route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it("redirects the retired heuristic to the supported Environment Review", () => {
    render(<BudRotRiskLegacyRoute />);

    expect(mockRedirect).toHaveBeenCalledWith({
      href: {
        pathname: "/home/personal/tools/environment-analysis",
        params: {}
      }
    });
  });

  it("preserves grow and plant context from old bookmarks", () => {
    mockParams = { growId: ["grow-1"], plantId: "plant-2" };

    render(<BudRotRiskLegacyRoute />);

    expect(mockRedirect).toHaveBeenCalledWith({
      href: {
        pathname: "/home/personal/tools/environment-analysis",
        params: { growId: "grow-1", plantId: "plant-2" }
      }
    });
  });
});
