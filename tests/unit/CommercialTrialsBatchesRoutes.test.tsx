import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialBatchPlannerRoute from "@/app/home/commercial/batch-planner";
import CommercialTrialsRoute from "@/app/home/commercial/trials";

const mockFetchProductTrials = jest.fn();
const mockCreateProductTrial = jest.fn();
const mockFetchProducts = jest.fn();
const mockFetchProductLines = jest.fn();
const mockFetchProductTrialEvidenceRuns = jest.fn();
const mockFetchSoilNutrientBatches = jest.fn();
const mockCreateSoilNutrientBatch = jest.fn();
const mockAskPersonalAssistant = jest.fn();

jest.mock("@/api/commercialWorkflows", () => ({
  fetchProductTrials: (...args: any[]) => mockFetchProductTrials(...args),
  createProductTrial: (...args: any[]) => mockCreateProductTrial(...args),
  fetchProducts: (...args: any[]) => mockFetchProducts(...args),
  fetchProductLines: (...args: any[]) => mockFetchProductLines(...args),
  fetchProductTrialEvidenceRuns: (...args: any[]) =>
    mockFetchProductTrialEvidenceRuns(...args),
  fetchSoilNutrientBatches: (...args: any[]) => mockFetchSoilNutrientBatches(...args),
  createSoilNutrientBatch: (...args: any[]) => mockCreateSoilNutrientBatch(...args)
}));

jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAskPersonalAssistant(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) =>
      React.cloneElement(React.Children.only(children), { href })
  };
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

describe("Commercial Product Trial and Batch routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFetchProductTrials.mockResolvedValue([]);
    mockFetchProducts.mockResolvedValue([]);
    mockFetchProductLines.mockResolvedValue([]);
    mockFetchProductTrialEvidenceRuns.mockResolvedValue([]);
    mockFetchSoilNutrientBatches.mockResolvedValue([]);
  });

  it("rejects an invalid Product Trial plant count without sending a write", async () => {
    const screen = render(<CommercialTrialsRoute />);
    await waitFor(() =>
      expect(screen.queryByText("Loading product trials...")).toBeNull()
    );
    expect(screen.getByText("Shared Back /home/commercial/more")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Product trial name"), "Veg response");
    fireEvent.changeText(screen.getByLabelText("Trial plant count"), "-2");
    fireEvent.press(screen.getByLabelText("Create product trial"));

    expect(
      screen.getByText("Plant count must be a whole number greater than zero.")
    ).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(mockCreateProductTrial).not.toHaveBeenCalled();
  });

  it("creates one Product Trial, locks its draft, and announces progress", async () => {
    let resolveCreate: ((value: any) => void) | undefined;
    mockCreateProductTrial.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    const screen = render(<CommercialTrialsRoute />);
    await waitFor(() =>
      expect(screen.queryByText("Loading product trials...")).toBeNull()
    );
    fireEvent.changeText(screen.getByLabelText("Product trial name"), "Flower trial");
    const createAction = screen.getByLabelText("Create product trial");

    fireEvent.press(createAction);
    fireEvent.press(createAction);

    expect(mockCreateProductTrial).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Creating product trial in progress")).toBeTruthy();
    expect(screen.getByLabelText("Product trial name").props.editable).toBe(false);

    resolveCreate?.({ id: "trial-1", trialName: "Flower trial", status: "planned" });
    await waitFor(() => expect(screen.getByText("Product trial created.")).toBeTruthy());
  });

  it("retains a Product Trial draft after a create failure", async () => {
    mockCreateProductTrial.mockRejectedValue(new Error("Trial service unavailable"));
    const screen = render(<CommercialTrialsRoute />);
    await waitFor(() =>
      expect(screen.queryByText("Loading product trials...")).toBeNull()
    );
    fireEvent.changeText(screen.getByLabelText("Product trial name"), "Retained trial");
    fireEvent.press(screen.getByLabelText("Create product trial"));

    await waitFor(() =>
      expect(screen.getByText("Trial service unavailable")).toBeTruthy()
    );
    expect(screen.getByLabelText("Product trial name").props.value).toBe(
      "Retained trial"
    );
  });

  it("starts an owner-approved not-for-sale hat concept trial with a hypothetical price", async () => {
    mockCreateProductTrial.mockResolvedValue({
      id: "concept-trial-1",
      trialName: "GrowPathAI Circuit Leaf — Midnight purchase-intent trial",
      status: "active"
    });
    const screen = render(<CommercialTrialsRoute />);
    await waitFor(() =>
      expect(screen.queryByText("Loading product trials...")).toBeNull()
    );

    fireEvent.changeText(
      screen.getByLabelText("Hypothetical hat trial price in US dollars"),
      "34"
    );
    const createAction = screen.getByLabelText("Start purchase-intent hat concept trial");
    fireEvent.press(createAction);

    await waitFor(() => expect(mockCreateProductTrial).toHaveBeenCalledTimes(1));
    expect(mockCreateProductTrial).toHaveBeenCalledWith(
      expect.objectContaining({
        trialType: "purchase_intent_concept",
        conceptAssetId: "growpathai-hat-circuit-leaf-midnight-purchase-intent-trial",
        question: "Would you buy this hat for $34.00?",
        candidatePrice: 34,
        priceCurrency: "USD",
        publicTrial: true,
        ownerApprovedArtwork: true,
        rightsReviewStatus: "not_required",
        itemForSale: false,
        saleEnabled: false,
        responseCreatesOrder: false,
        status: "active"
      })
    );
    expect(
      screen.getByText(
        "Purchase-intent concept trial started. It is not a product listing and cannot accept orders or payment."
      )
    ).toBeTruthy();
  });

  it("rejects invalid Batch volume without silently omitting it", async () => {
    const screen = render(<CommercialBatchPlannerRoute />);
    await waitFor(() => expect(screen.queryByText("Loading batches...")).toBeNull());
    expect(screen.getByText("Shared Back /home/commercial/more")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Commercial batch name"), "Veg Mix");
    fireEvent.changeText(screen.getByLabelText("Commercial batch volume"), "-1");
    fireEvent.press(screen.getByLabelText("Create commercial batch"));

    expect(
      screen.getByText("Batch volume must be a number that is zero or greater.")
    ).toBeTruthy();
    expect(mockCreateSoilNutrientBatch).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Commercial batch name").props.value).toBe("Veg Mix");
  });

  it("creates one Batch, includes notes, locks its draft, and announces progress", async () => {
    let resolveCreate: ((value: any) => void) | undefined;
    mockCreateSoilNutrientBatch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    const screen = render(<CommercialBatchPlannerRoute />);
    await waitFor(() => expect(screen.queryByText("Loading batches...")).toBeNull());
    fireEvent.changeText(screen.getByLabelText("Commercial batch name"), "Living Mix");
    fireEvent.changeText(screen.getByLabelText("Commercial batch notes"), "Hold for QA");
    const createAction = screen.getByLabelText("Create commercial batch");

    fireEvent.press(createAction);
    fireEvent.press(createAction);

    expect(mockCreateSoilNutrientBatch).toHaveBeenCalledTimes(1);
    expect(mockCreateSoilNutrientBatch).toHaveBeenCalledWith(
      expect.objectContaining({ batchName: "Living Mix", notes: "Hold for QA" })
    );
    expect(screen.getByLabelText("Creating commercial batch in progress")).toBeTruthy();
    expect(screen.getByLabelText("Commercial batch name").props.editable).toBe(false);

    resolveCreate?.({ id: "batch-1", batchName: "Living Mix", status: "planned" });
    await waitFor(() =>
      expect(screen.getByText("Commercial batch created.")).toBeTruthy()
    );
  });

  it("prefills once without erasing owner-entered values when AI leaves fields blank", async () => {
    let resolvePrefill: ((value: any) => void) | undefined;
    mockAskPersonalAssistant.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePrefill = resolve;
        })
    );
    const screen = render(<CommercialBatchPlannerRoute />);
    await waitFor(() => expect(screen.queryByText("Loading batches...")).toBeNull());
    fireEvent.changeText(screen.getByLabelText("Commercial batch name"), "Owner draft");
    const prefillAction = screen.getByLabelText(
      "Fill commercial batch from saved records"
    );

    fireEvent.press(prefillAction);
    fireEvent.press(prefillAction);

    expect(mockAskPersonalAssistant).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Filling commercial batch from saved records in progress")
    ).toBeTruthy();
    resolvePrefill?.({
      reply: JSON.stringify({
        batchName: "",
        purpose: "trial_batch",
        notes: "Review COA"
      })
    });

    await waitFor(() =>
      expect(screen.getByText(/Draft filled from saved records/)).toBeTruthy()
    );
    expect(screen.getByLabelText("Commercial batch name").props.value).toBe(
      "Owner draft"
    );
    expect(screen.getByLabelText("Commercial batch purpose").props.value).toBe(
      "trial_batch"
    );
  });
});
