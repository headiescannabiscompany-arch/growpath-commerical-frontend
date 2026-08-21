import React from "react";
import { render } from "@testing-library/react-native";

import FacilityIpmScoutToolRoute from "@/app/home/facility/(tabs)/tools/ipm-scout";
import FacilitySavedRunsToolRoute from "@/app/home/facility/(tabs)/tools/saved-runs";
import FacilitySpeciesCropIdToolRoute from "@/app/home/facility/(tabs)/tools/species-crop-id";

const mockIpmRoute = jest.fn((_props: any) => null);
const mockSavedRunsRoute = jest.fn((_props: any) => null);
const mockSpeciesRoute = jest.fn((_props: any) => null);

jest.mock("@/app/home/personal/(tabs)/tools/ipm-scout", () => ({
  __esModule: true,
  default: (props: any) => mockIpmRoute(props)
}));
jest.mock("@/app/home/personal/(tabs)/tools/saved-runs", () => ({
  __esModule: true,
  default: (props: any) => mockSavedRunsRoute(props)
}));
jest.mock("@/app/home/personal/(tabs)/tools/species-crop-id", () => ({
  __esModule: true,
  default: (props: any) => mockSpeciesRoute(props)
}));

describe("Facility shared AI tool routes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps Plant ID and IPM back navigation inside Facility AI", () => {
    render(<FacilitySpeciesCropIdToolRoute />);
    render(<FacilityIpmScoutToolRoute />);

    expect(mockSpeciesRoute).toHaveBeenCalledWith({
      backFallbackHref: "/home/facility/ai-tools",
      workspaceTypeOverride: "facility"
    });
    expect(mockIpmRoute).toHaveBeenCalledWith({
      backFallbackHref: "/home/facility/ai-tools"
    });
  });

  it("opens the shared saved-run surface in the active Facility route context", () => {
    render(<FacilitySavedRunsToolRoute />);
    expect(mockSavedRunsRoute).toHaveBeenCalledWith({});
  });
});
