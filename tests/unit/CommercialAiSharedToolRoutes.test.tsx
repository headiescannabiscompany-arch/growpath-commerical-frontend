import React from "react";
import { render } from "@testing-library/react-native";

import CommercialIpmScoutToolRoute from "@/app/home/commercial/tools/ipm-scout";
import CommercialSavedRunsToolRoute from "@/app/home/commercial/tools/saved-runs";
import CommercialSpeciesCropIdToolRoute from "@/app/home/commercial/tools/species-crop-id";
import CommercialAutoGrowCalendarToolRoute from "@/app/home/commercial/tools/auto-grow-calendar";
import CommercialDryAmendmentMixToolRoute from "@/app/home/commercial/tools/dry-amendment-mix";
import CommercialEnvironmentToolRoute from "@/app/home/commercial/tools/environment";
import CommercialDataIntegrationsRoute from "@/app/home/commercial/tools/integrations";
import CommercialNpkToolRoute from "@/app/home/commercial/tools/npk";
import CommercialReportToolRoute from "@/app/home/commercial/tools/report";
import CommercialSoilBuilderToolRoute from "@/app/home/commercial/tools/soil-builder";

const mockIpmScoutRoute = jest.fn((_props: any) => null);
const mockSavedRunsRoute = jest.fn((_props: any) => null);
const mockSpeciesCropIdRoute = jest.fn((_props: any) => null);
const mockAutoGrowCalendarRoute = jest.fn((_props: any) => null);
const mockDryAmendmentMixRoute = jest.fn((_props: any) => null);
const mockEnvironmentRoute = jest.fn((_props: any) => null);
const mockIntegrationsRoute = jest.fn((_props: any) => null);
const mockNpkRoute = jest.fn((_props: any) => null);
const mockReportRoute = jest.fn((_props: any) => null);
const mockSoilBuilderRoute = jest.fn((_props: any) => null);

jest.mock("@/app/home/personal/(tabs)/tools/ipm-scout", () => ({
  __esModule: true,
  default: (props: any) => mockIpmScoutRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/saved-runs", () => ({
  __esModule: true,
  default: (props: any) => mockSavedRunsRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/species-crop-id", () => ({
  __esModule: true,
  default: (props: any) => mockSpeciesCropIdRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/auto-grow-calendar", () => ({
  __esModule: true,
  default: (props: any) => mockAutoGrowCalendarRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/dry-amendment-mix", () => ({
  __esModule: true,
  default: (props: any) => mockDryAmendmentMixRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/environment-analysis", () => ({
  __esModule: true,
  default: (props: any) => mockEnvironmentRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/integrations", () => ({
  __esModule: true,
  default: (props: any) => mockIntegrationsRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/npk", () => ({
  __esModule: true,
  default: (props: any) => mockNpkRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/pdf-export", () => ({
  __esModule: true,
  default: (props: any) => mockReportRoute(props)
}));

jest.mock("@/app/home/personal/(tabs)/tools/soil-builder", () => ({
  __esModule: true,
  default: (props: any) => mockSoilBuilderRoute(props)
}));

describe("Commercial shared AI tool aliases", () => {
  beforeEach(() => {
    mockIpmScoutRoute.mockClear();
    mockSavedRunsRoute.mockClear();
    mockSpeciesCropIdRoute.mockClear();
    mockAutoGrowCalendarRoute.mockClear();
    mockDryAmendmentMixRoute.mockClear();
    mockEnvironmentRoute.mockClear();
    mockIntegrationsRoute.mockClear();
    mockNpkRoute.mockClear();
    mockReportRoute.mockClear();
    mockSoilBuilderRoute.mockClear();
  });

  it("keeps Plant ID and IPM back navigation in Commercial", () => {
    render(<CommercialSpeciesCropIdToolRoute />);
    render(<CommercialIpmScoutToolRoute />);

    expect(mockSpeciesCropIdRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        backFallbackHref: "/home/commercial/tools",
        workspaceTypeOverride: "commercial"
      })
    );
    expect(mockIpmScoutRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        backFallbackHref: "/home/commercial/tools",
        workspaceType: "commercial"
      })
    );
  });

  it("reuses the workspace-scoped Saved Runs screen without a Personal redirect", () => {
    render(<CommercialSavedRunsToolRoute />);

    expect(mockSavedRunsRoute).toHaveBeenCalledWith({
      workspaceTypeOverride: "commercial"
    });
  });

  it("forces every grow-aware shared calculator and report into Commercial scope", () => {
    render(<CommercialAutoGrowCalendarToolRoute />);
    render(<CommercialDryAmendmentMixToolRoute />);
    render(<CommercialEnvironmentToolRoute />);
    render(<CommercialDataIntegrationsRoute />);
    render(<CommercialNpkToolRoute />);
    render(<CommercialReportToolRoute />);
    render(<CommercialSoilBuilderToolRoute />);

    for (const routeMock of [
      mockAutoGrowCalendarRoute,
      mockDryAmendmentMixRoute,
      mockEnvironmentRoute,
      mockNpkRoute,
      mockReportRoute,
      mockSoilBuilderRoute
    ]) {
      expect(routeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          backFallbackHref: "/home/commercial/tools",
          workspaceType: "commercial"
        })
      );
    }
    expect(mockIntegrationsRoute).toHaveBeenCalledWith({
      workspaceType: "commercial"
    });
  });
});
