import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import FacilitySopRunDetailRoute from "@/app/home/facility/sop-runs/[id]";
import FacilitySopRunsCompareRoute from "@/app/home/facility/sop-runs/compare";
import FacilitySopRunsCompareResultRoute from "@/app/home/facility/sop-runs/compare-result";
import FacilitySopRunsPresetsRoute from "@/app/home/facility/sop-runs/presets";
import FacilitySopRunsStartRoute from "@/app/home/facility/sop-runs/start";

const mockApiRequest = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn()
  }),
  Link: ({ children }: any) => children
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) =>
      React.createElement(
        View,
        { accessibilityLabel: `screen-${title}` },
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    sopRuns: (facilityId: string) => `/api/facilities/${facilityId}/sop-runs`,
    sopRun: (facilityId: string, runId: string) =>
      `/api/facilities/${facilityId}/sop-runs/${runId}`,
    sopRunComplete: (facilityId: string, runId: string) =>
      `/api/facilities/${facilityId}/sop-runs/${runId}/complete`,
    sopRunStep: (facilityId: string, runId: string, stepId: string) =>
      `/api/facilities/${facilityId}/sop-runs/${runId}/steps/${stepId}`
  }
}));

jest.mock("@/hooks/useSopTemplates", () => ({
  useSopTemplates: () => ({
    templates: [
      { id: "template-1", title: "Daily room check", content: "Inspect room." }
    ],
    isLoading: false,
    createTemplate: jest.fn(),
    creating: false,
    refetch: jest.fn()
  })
}));

describe("facility SOP run nested back behavior", () => {
  beforeEach(() => {
    mockParams = {};
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((path: string) => {
      if (path.includes("/sop-runs/run-")) {
        return Promise.resolve({
          run: {
            status: "active",
            completedAt: null,
            steps: [{ stepId: "step-1", title: "Inspect room", status: "pending" }]
          }
        });
      }
      return Promise.resolve({
        runs: [{ id: "run-1", title: "Daily room check" }]
      });
    });
  });

  it("uses shared back behavior on SOP run detail", async () => {
    mockParams = { id: "run-1" };

    const screen = render(<FacilitySopRunDetailRoute />);

    await waitFor(() =>
      expect(screen.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy()
    );
    expect(screen.getByText("SOP Run Detail")).toBeTruthy();
  });

  it("uses shared back behavior on SOP run start and presets", () => {
    const start = render(<FacilitySopRunsStartRoute />);
    expect(start.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy();
    expect(start.getByText("Start SOP Run")).toBeTruthy();

    const presets = render(<FacilitySopRunsPresetsRoute />);
    expect(presets.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy();
    expect(presets.getByText("SOP Presets")).toBeTruthy();
  });

  it("uses shared back behavior on SOP compare routes", async () => {
    const compare = render(<FacilitySopRunsCompareRoute />);
    expect(compare.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy();
    expect(compare.getByText("Compare SOP Runs")).toBeTruthy();

    mockParams = { leftId: "run-1", rightId: "run-2" };
    const result = render(<FacilitySopRunsCompareResultRoute />);
    await waitFor(() =>
      expect(result.getByText("Shared Back /home/facility/sop-runs/compare")).toBeTruthy()
    );
    expect(result.getByText("SOP Compare Result")).toBeTruthy();
  });
});
