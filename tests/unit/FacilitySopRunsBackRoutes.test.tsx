import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilitySopRunDetailRoute from "@/app/home/facility/sop-runs/[id]";
import FacilitySopRunsCompareRoute from "@/app/home/facility/sop-runs/compare";
import FacilitySopRunsCompareResultRoute from "@/app/home/facility/sop-runs/compare-result";
import FacilitySopRunsPresetsRoute from "@/app/home/facility/sop-runs/presets";
import FacilitySopRunsStartRoute from "@/app/home/facility/sop-runs/start";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCreateTemplate = jest.fn();
const mockRefetchTemplates = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
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

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { SOP_RUNS_WRITE: "facility.sop_runs.write" },
  useEntitlements: () => ({ can: () => true })
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
    createTemplate: (...args: any[]) => mockCreateTemplate(...args),
    creating: false,
    refetch: (...args: any[]) => mockRefetchTemplates(...args)
  })
}));

describe("facility SOP run nested back behavior", () => {
  beforeEach(() => {
    mockParams = {};
    mockApiRequest.mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockCreateTemplate.mockReset();
    mockRefetchTemplates.mockReset();
    mockCreateTemplate.mockResolvedValue({ id: "template-created" });
    mockRefetchTemplates.mockResolvedValue(undefined);
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
        runs: [
          { id: "run-1", title: "Daily room check", status: "completed" },
          { id: "run-2", title: "Night room check", status: "completed" }
        ]
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
    expect(presets.getByText("SOP Library")).toBeTruthy();
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

  it("selects two saved SOP runs without exposing internal id inputs", async () => {
    const screen = render(<FacilitySopRunsCompareRoute />);

    await waitFor(() => expect(screen.getByText("Night room check")).toBeTruthy());
    expect(screen.queryByPlaceholderText("Left run ID")).toBeNull();
    expect(screen.queryByPlaceholderText("Right run ID")).toBeNull();
    expect(
      screen.getByLabelText("Compare selected SOP runs").props.accessibilityState
    ).toEqual({ disabled: true });

    fireEvent.press(screen.getByLabelText("Select Daily room check as reference run"));
    fireEvent.press(screen.getByLabelText("Select Night room check as comparison run"));
    fireEvent.press(screen.getByLabelText("Compare selected SOP runs"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/sop-runs/compare-result",
      params: { leftId: "run-1", rightId: "run-2" }
    });
  });

  it("requires procedure content before creating a reusable SOP template", async () => {
    const screen = render(<FacilitySopRunsPresetsRoute />);
    const createButton = screen.getByLabelText("Create SOP preset");

    expect(createButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("SOP preset title"), "Room opening");
    expect(createButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(
      screen.getByLabelText("SOP preset content"),
      "Inspect room\nRecord temperature"
    );
    fireEvent.press(createButton);

    await waitFor(() =>
      expect(mockCreateTemplate).toHaveBeenCalledWith({
        title: "Room opening",
        content: "Inspect room\nRecord temperature"
      })
    );
  });

  it("creates a one-off SOP run only after checklist steps are entered", async () => {
    const screen = render(<FacilitySopRunsStartRoute />);
    const startButton = screen.getByLabelText("Start SOP run");

    expect(startButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("SOP run title"), "One-off room check");
    fireEvent.changeText(
      screen.getByLabelText("One-off SOP checklist steps"),
      "1. Inspect canopy\n2. Record environment"
    );
    fireEvent.press(startButton);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facilities/facility-1/sop-runs",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "One-off room check",
            templateId: undefined,
            steps: [{ title: "Inspect canopy" }, { title: "Record environment" }]
          })
        })
      )
    );
  });
});
