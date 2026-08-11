import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialEvidenceRunDetailRoute from "@/app/home/commercial/evidence-runs/[id]";
import CommercialEvidenceRunsRoute from "@/app/home/commercial/evidence-runs";

const mockFetchCommercialGrows = jest.fn();
const mockCreateCommercialGrow = jest.fn();
const mockFetchCommercialGrow = jest.fn();
const mockUpdateCommercialGrow = jest.fn();
const mockFetchProducts = jest.fn();
const mockFetchProductLines = jest.fn();
const mockFetchSoilNutrientBatches = jest.fn();

jest.mock("@/api/commercialWorkflows", () => ({
  createCommercialGrow: (...args: any[]) => mockCreateCommercialGrow(...args),
  fetchCommercialGrow: (...args: any[]) => mockFetchCommercialGrow(...args),
  fetchCommercialGrows: (...args: any[]) => mockFetchCommercialGrows(...args),
  fetchProductLines: (...args: any[]) => mockFetchProductLines(...args),
  fetchProducts: (...args: any[]) => mockFetchProducts(...args),
  fetchSoilNutrientBatches: (...args: any[]) => mockFetchSoilNutrientBatches(...args),
  updateCommercialGrow: (...args: any[]) => mockUpdateCommercialGrow(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) =>
      React.cloneElement(React.Children.only(children), { href }),
    useLocalSearchParams: () => ({ id: "grow-1", growId: "grow-1" })
  };
});

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { email: "owner@example.com" } })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ plan: "commercial" })
}));

jest.mock("@/components/commercial/CommercialContextualTools", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Evidence run AI tools");
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ children, header, backFallbackHref, routeKey }: any) =>
    React.createElement(
      View,
      { accessibilityLabel: `app-page-${routeKey}` },
      React.createElement(Text, null, `Shared Back ${backFallbackHref || "default"}`),
      header,
      children
    );
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

const evidenceRun = {
  id: "grow-1",
  name: "Bloom Formula Trial",
  purpose: "product_trial",
  cropType: "cannabis",
  cultivar: "Test Cultivar",
  medium: "living soil",
  plantCount: 8,
  productId: "product-1",
  productLineId: "line-1",
  batchId: "batch-1",
  formulaVersion: "v1",
  measurementPlan: "Weekly pH and vigor review",
  harvestQualityNotes: "Existing quality notes",
  commercialCropSummary: "Existing crop summary",
  notes: "Existing evidence notes",
  publicShareStatus: "evidence_building",
  status: "active"
};

describe("Commercial Evidence Run workflow state", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFetchCommercialGrows.mockResolvedValue([evidenceRun]);
    mockFetchCommercialGrow.mockResolvedValue(evidenceRun);
    mockFetchProducts.mockResolvedValue([{ id: "product-1", name: "Product One" }]);
    mockFetchProductLines.mockResolvedValue([{ id: "line-1", name: "Line One" }]);
    mockFetchSoilNutrientBatches.mockResolvedValue([
      { id: "batch-1", batchName: "Batch One" }
    ]);
  });

  it("rejects a fractional plant count and retains the Evidence Run draft", async () => {
    const screen = render(<CommercialEvidenceRunsRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Evidence run product: Product One")).toBeTruthy()
    );

    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run name"),
      "Retained trial draft"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run plant count"),
      "2.5"
    );
    fireEvent.press(screen.getByLabelText("Create product trial evidence run"));

    expect(
      screen.getByText("Plant count must be a whole number greater than zero.")
    ).toBeTruthy();
    expect(mockCreateCommercialGrow).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Product trial evidence run name").props.value).toBe(
      "Retained trial draft"
    );
    expect(
      screen.getByLabelText("Product trial evidence run plant count").props.value
    ).toBe("2.5");
  });

  it("creates an Evidence Run once and locks its conflicting form controls", async () => {
    let resolveCreate: ((value: any) => void) | undefined;
    mockCreateCommercialGrow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    const screen = render(<CommercialEvidenceRunsRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Evidence run product: Product One")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run name"),
      "New evidence run"
    );
    const createAction = screen.getByLabelText("Create product trial evidence run");

    fireEvent.press(createAction);
    fireEvent.press(createAction);

    expect(mockCreateCommercialGrow).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Creating product trial evidence run in progress")
    ).toBeTruthy();
    expect(screen.getByLabelText("Product trial evidence run name").props.editable).toBe(
      false
    );
    expect(
      screen.getByLabelText("Evidence run product: Product One").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(
      screen.getByLabelText("Public share status: Evidence building").props
        .accessibilityState.disabled
    ).toBe(true);

    resolveCreate?.({ ...evidenceRun, id: "grow-2", name: "New evidence run" });
    await waitFor(() =>
      expect(screen.getByText("Product trial evidence run created.")).toBeTruthy()
    );
    expect(screen.getAllByText("New evidence run").length).toBeGreaterThan(0);
  });

  it("offers an in-page retry after the Evidence Run list fails to load", async () => {
    mockFetchCommercialGrows
      .mockRejectedValueOnce(new Error("Evidence list unavailable"))
      .mockResolvedValueOnce([evidenceRun]);
    const screen = render(<CommercialEvidenceRunsRoute />);

    await waitFor(() =>
      expect(screen.getByText("Evidence list unavailable")).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Retry product trial evidence runs"));

    await waitFor(() => expect(mockFetchCommercialGrows).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Bloom Formula Trial")).toBeTruthy());
  });

  it("saves Evidence Run detail once using named status choices", async () => {
    let resolveSave: ((value: any) => void) | undefined;
    mockUpdateCommercialGrow.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const screen = render(<CommercialEvidenceRunDetailRoute />);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Product trial evidence run detail notes")
      ).toBeTruthy()
    );
    act(() => {
      const event = {
        currentTarget: 1,
        nativeEvent: { pageX: 0, pageY: 0 },
        persist: jest.fn(),
        target: 1
      };
      const statusNode = screen.getByLabelText("Evidence run status: Completed");
      statusNode.props.onResponderGrant(event);
      statusNode.props.onResponderRelease(event);
      const shareNode = screen.getByLabelText(
        "Evidence run public share status: Public ready"
      );
      shareNode.props.onResponderGrant(event);
      shareNode.props.onResponderRelease(event);
    });
    await waitFor(() =>
      expect(
        screen.getByLabelText("Evidence run status: Completed").props.accessibilityState
          .checked
      ).toBe(true)
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Evidence run public share status: Public ready").props
          .accessibilityState.checked
      ).toBe(true)
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run detail notes"),
      "Reviewed public evidence"
    );
    const saveAction = screen.getByLabelText("Save product trial evidence run detail");

    fireEvent.press(saveAction);
    fireEvent.press(saveAction);

    expect(mockUpdateCommercialGrow).toHaveBeenCalledTimes(1);
    expect(mockUpdateCommercialGrow).toHaveBeenCalledWith(
      "grow-1",
      expect.objectContaining({
        status: "completed",
        publicShareStatus: "public_ready",
        notes: "Reviewed public evidence"
      })
    );
    expect(
      screen.getByLabelText("Saving product trial evidence run detail in progress")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Product trial evidence run detail notes").props.editable
    ).toBe(false);
    expect(
      screen.getByLabelText("Evidence run status: Active").props.accessibilityState
        .disabled
    ).toBe(true);

    resolveSave?.({
      ...evidenceRun,
      status: "completed",
      publicShareStatus: "public_ready",
      notes: "Reviewed public evidence"
    });
    await waitFor(() =>
      expect(screen.getByText("Product trial evidence run updated.")).toBeTruthy()
    );
  });

  it("retains failed Evidence Run detail edits and reports the failure in page", async () => {
    mockUpdateCommercialGrow.mockRejectedValue(new Error("Evidence update unavailable"));
    const screen = render(<CommercialEvidenceRunDetailRoute />);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Product trial evidence run detail notes")
      ).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Product trial evidence run detail notes"),
      "Keep this failed evidence note"
    );
    fireEvent.press(screen.getByLabelText("Save product trial evidence run detail"));

    await waitFor(() =>
      expect(screen.getByText("Evidence update unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByLabelText("Product trial evidence run detail notes").props.value
    ).toBe("Keep this failed evidence note");
  });

  it("uses one H1 and explicit H2 sections on Evidence Run detail", async () => {
    const screen = render(<CommercialEvidenceRunDetailRoute />);
    await waitFor(() =>
      expect(screen.getByRole("header", { name: "Bloom Formula Trial" })).toBeTruthy()
    );

    expect(
      screen.getByRole("header", { name: "Bloom Formula Trial" }).props["aria-level"]
    ).toBe(1);
    [
      "Commercial Context",
      "Linked Evidence",
      "Measurement Plan",
      "Harvest Quality Notes",
      "Product Trial Crop Summary",
      "Update Evidence Run Status",
      "Next Commercial Actions"
    ].forEach((heading) => {
      expect(screen.getByRole("header", { name: heading }).props["aria-level"]).toBe(2);
    });
  });
});
