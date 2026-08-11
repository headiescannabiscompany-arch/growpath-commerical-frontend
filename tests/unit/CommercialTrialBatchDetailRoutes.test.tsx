import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialBatchDetailRoute from "@/app/home/commercial/batch-planner/[batchId]";
import CommercialTrialDetailRoute from "@/app/home/commercial/trials/[trialId]";

const mockFetchProductTrial = jest.fn();
const mockUpdateProductTrial = jest.fn();
const mockSaveProductTrialAIReview = jest.fn();
const mockFetchSoilNutrientBatch = jest.fn();
const mockUpdateSoilNutrientBatch = jest.fn();
const mockApiRequest = jest.fn();

jest.mock("@/api/commercialWorkflows", () => ({
  fetchProductTrial: (...args: any[]) => mockFetchProductTrial(...args),
  updateProductTrial: (...args: any[]) => mockUpdateProductTrial(...args),
  saveProductTrialAIReview: (...args: any[]) => mockSaveProductTrialAIReview(...args),
  fetchSoilNutrientBatch: (...args: any[]) => mockFetchSoilNutrientBatch(...args),
  updateSoilNutrientBatch: (...args: any[]) => mockUpdateSoilNutrientBatch(...args)
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) =>
      React.cloneElement(React.Children.only(children), { href }),
    useLocalSearchParams: () => ({ trialId: "trial-1", batchId: "batch-1" })
  };
});

jest.mock("@/components/commercial/CommercialContextualTools", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Contextual tools");
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ children, header, backFallbackHref, routeKey }: any) =>
    React.createElement(
      View,
      { accessibilityLabel: `app-page-${routeKey}` },
      React.createElement(Text, null, `Shared Back ${backFallbackHref}`),
      header,
      children
    );
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

const trialRecord = {
  id: "trial-1",
  trialName: "Flower Response Trial",
  status: "active",
  notes: "Existing trial notes",
  effectivenessSummary: "Early response",
  harvestQualityNotes: "",
  commercialCropSummary: "",
  productId: "product-1",
  batchId: "batch-1",
  growId: "evidence-1",
  AIReview: { summary: "", evidence: [], limitations: [] }
};

const batchRecord = {
  id: "batch-1",
  batchName: "Living Mix 01",
  status: "planned",
  estimatedCost: 25,
  notes: "Existing batch notes",
  ingredientSummary: "Base mix",
  mixingInstructions: "Blend evenly"
};

describe("Commercial Trial and Batch detail routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFetchProductTrial.mockResolvedValue(trialRecord);
    mockFetchSoilNutrientBatch.mockResolvedValue(batchRecord);
    mockApiRequest.mockResolvedValue({ id: "task-1" });
  });

  it("saves Product Trial detail once and locks every conflicting operation", async () => {
    let resolveSave: ((value: any) => void) | undefined;
    mockUpdateProductTrial.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const screen = render(<CommercialTrialDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Commercial trial effectiveness summary")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial effectiveness summary"),
      "Updated response"
    );
    const saveAction = screen.getByLabelText("Save commercial trial detail");

    fireEvent.press(saveAction);
    fireEvent.press(saveAction);

    expect(mockUpdateProductTrial).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Saving commercial trial detail in progress")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial trial effectiveness summary").props.editable
    ).toBe(false);
    expect(
      screen.getByLabelText("Save commercial trial AI review").props.accessibilityState
        .disabled
    ).toBe(true);

    resolveSave?.({ ...trialRecord, effectivenessSummary: "Updated response" });
    await waitFor(() => expect(screen.getByText("Product trial updated.")).toBeTruthy());
  });

  it("saves one claim-safe review and preserves the entered evidence", async () => {
    let resolveReview: ((value: any) => void) | undefined;
    mockSaveProductTrialAIReview.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReview = resolve;
        })
    );
    const screen = render(<CommercialTrialDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Commercial trial AI review evidence")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial trial AI review evidence"),
      "Measured pH\nSaved photos"
    );
    const reviewAction = screen.getByLabelText("Save commercial trial AI review");

    fireEvent.press(reviewAction);
    fireEvent.press(reviewAction);

    expect(mockSaveProductTrialAIReview).toHaveBeenCalledTimes(1);
    expect(mockSaveProductTrialAIReview).toHaveBeenCalledWith(
      "trial-1",
      expect.objectContaining({ evidence: ["Measured pH", "Saved photos"] })
    );
    expect(
      screen.getByLabelText("Saving commercial trial AI review in progress")
    ).toBeTruthy();

    resolveReview?.({
      ...trialRecord,
      AIReview: { summary: "Reviewed", evidence: ["Measured pH"], limitations: [] }
    });
    await waitFor(() =>
      expect(screen.getByText("Claim-safe AI review saved.")).toBeTruthy()
    );
  });

  it("creates one claim-readiness task", async () => {
    let resolveTask: ((value: any) => void) | undefined;
    mockApiRequest.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTask = resolve;
        })
    );
    const screen = render(<CommercialTrialDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Create trial evidence task")).toBeTruthy()
    );
    const taskAction = screen.getByLabelText("Create trial evidence task");

    fireEvent.press(taskAction);
    fireEvent.press(taskAction);

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Creating trial evidence task in progress")
    ).toBeTruthy();
    resolveTask?.({ id: "task-2" });
    await waitFor(() =>
      expect(
        screen.getByText(/Created evidence task for Flower Response Trial/)
      ).toBeTruthy()
    );
  });

  it("rejects a negative Batch cost without silently clearing it", async () => {
    const screen = render(<CommercialBatchDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Commercial batch detail estimated cost")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail estimated cost"),
      "-8"
    );
    fireEvent.press(screen.getByLabelText("Save commercial batch detail"));

    expect(
      screen.getByText("Estimated cost must be a number that is zero or greater.")
    ).toBeTruthy();
    expect(mockUpdateSoilNutrientBatch).not.toHaveBeenCalled();
    expect(
      screen.getByLabelText("Commercial batch detail estimated cost").props.value
    ).toBe("-8");
  });

  it("saves Batch detail once and locks task creation while saving", async () => {
    let resolveSave: ((value: any) => void) | undefined;
    mockUpdateSoilNutrientBatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const screen = render(<CommercialBatchDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Commercial batch detail notes")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail notes"),
      "Updated batch notes"
    );
    const saveAction = screen.getByLabelText("Save commercial batch detail");

    fireEvent.press(saveAction);
    fireEvent.press(saveAction);

    expect(mockUpdateSoilNutrientBatch).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Saving commercial batch detail in progress")
    ).toBeTruthy();
    expect(screen.getByLabelText("Commercial batch detail notes").props.editable).toBe(
      false
    );
    expect(
      screen.getByLabelText("Create batch production task").props.accessibilityState
        .disabled
    ).toBe(true);

    resolveSave?.({ ...batchRecord, notes: "Updated batch notes" });
    await waitFor(() =>
      expect(screen.getByText("Commercial batch updated.")).toBeTruthy()
    );
  });

  it("retains a failed Batch draft and reports the failure in page", async () => {
    mockUpdateSoilNutrientBatch.mockRejectedValue(new Error("Batch update unavailable"));
    const screen = render(<CommercialBatchDetailRoute />);
    await waitFor(() =>
      expect(screen.getByLabelText("Commercial batch detail notes")).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial batch detail notes"),
      "Keep this batch note"
    );
    fireEvent.press(screen.getByLabelText("Save commercial batch detail"));

    await waitFor(() =>
      expect(screen.getByText("Batch update unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Commercial batch detail notes").props.value).toBe(
      "Keep this batch note"
    );
  });
});
