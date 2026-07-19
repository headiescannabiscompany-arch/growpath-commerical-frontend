import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import IngredientLibraryRoute from "@/app/home/personal/(tabs)/tools/ingredient-library";

const mockListProductIngredients = jest.fn();
const mockCreateProductIngredient = jest.fn();
const mockUpdateProductIngredient = jest.fn();
const mockArchiveProductIngredient = jest.fn();
const mockExtractIngredientLabel = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = require("react");
    React.useEffect(() => callback(), [callback]);
  }
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("@/components/media/MediaEvidencePicker", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onChange }: any) =>
    React.createElement(
      Pressable,
      {
        accessibilityLabel: "Mock label upload",
        onPress: () =>
          onChange([
            {
              id: "evidence-label-1",
              _id: "evidence-label-1",
              assetType: "photo",
              durableUrl: "https://example.com/durable-label.jpg",
              uploadStatus: "uploaded",
              purpose: "product",
              source: "upload",
              originalUri: "file://label.jpg",
              qualityWarnings: []
            }
          ])
      },
      React.createElement(Text, null, "Mock label upload")
    );
});

jest.mock("@/api/productIngredients", () => ({
  listProductIngredients: (...args: any[]) => mockListProductIngredients(...args),
  createProductIngredient: (...args: any[]) => mockCreateProductIngredient(...args),
  updateProductIngredient: (...args: any[]) => mockUpdateProductIngredient(...args),
  archiveProductIngredient: (...args: any[]) => mockArchiveProductIngredient(...args),
  extractIngredientLabel: (...args: any[]) => mockExtractIngredientLabel(...args)
}));

describe("IngredientLibraryRoute", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListProductIngredients.mockResolvedValue([
      {
        id: "ingredient-1",
        name: "Kelp meal",
        brand: "GrowPath Inputs",
        category: "amendment",
        labelNPK: { N: 1, P: 0.5, K: 2 },
        densityGml: 0.65,
        releaseSpeed: "medium",
        releaseWindow: "days_7_21",
        supplier: "Local supply",
        cost: 18,
        confidence: "medium",
        sourceType: "user_entered",
        documentUrl: "https://example.com/coa.pdf",
        photoUrl: "https://example.com/label.jpg",
        applicationNotes: "Topdress during veg.",
        micronutrientNotes: "Contains trace minerals."
      }
    ]);
    mockCreateProductIngredient.mockImplementation((payload) =>
      Promise.resolve({ id: "ingredient-new", ...payload })
    );
    mockUpdateProductIngredient.mockImplementation((_id, payload) =>
      Promise.resolve({ id: "ingredient-1", name: "Kelp meal", ...payload })
    );
    mockArchiveProductIngredient.mockResolvedValue(true);
    mockExtractIngredientLabel.mockResolvedValue({
      nutrientData: {
        productName: "Extracted Bloom",
        brand: "Label Brand",
        labelNPK: { N: 2, P: 6, K: 4 }
      }
    });
  });

  it("saves reusable ingredient library fields for recipe math", async () => {
    const screen = render(<IngredientLibraryRoute />);

    await waitFor(() => expect(screen.getByText("Kelp meal")).toBeTruthy());
    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();
    expect(
      screen.getByText(/Guaranteed analysis is stored as label N-P2O5-K2O/)
    ).toBeTruthy();
    expect(screen.getByText(/Label N-P2O5-K2O 1-0.5-2/)).toBeTruthy();
    expect(screen.getByText(/Release medium/)).toBeTruthy();
    expect(screen.getByText(/Supplier Local supply/)).toBeTruthy();
    expect(screen.getByText(/Docs https:\/\/example.com\/coa.pdf/)).toBeTruthy();
    expect(screen.getByText(/Label https:\/\/example.com\/label.jpg/)).toBeTruthy();
    expect(screen.getByText("Use: Topdress during veg.")).toBeTruthy();
    expect(screen.getByText("Micros: Contains trace minerals.")).toBeTruthy();

    fireEvent.press(screen.getByText("New Ingredient"));
    fireEvent.changeText(screen.getByLabelText("Name"), "Fish bone meal");
    fireEvent.changeText(screen.getByLabelText("Brand"), "Trusted Farm");
    fireEvent.changeText(screen.getByLabelText("Category"), "dry amendment");
    fireEvent.changeText(screen.getByLabelText("N"), "3");
    fireEvent.changeText(screen.getByLabelText("P2O5"), "16");
    fireEvent.changeText(screen.getByLabelText("K2O"), "0");
    fireEvent.changeText(screen.getByLabelText("Density g/ml"), "0.8");
    fireEvent.changeText(screen.getByLabelText("Cost"), "42");
    fireEvent.press(screen.getByLabelText("Release speed slow"));
    fireEvent.changeText(screen.getByLabelText("Release window"), "days_45_90");
    fireEvent.changeText(screen.getByLabelText("Supplier"), "Trusted supplier");
    fireEvent.changeText(screen.getByLabelText("Organic or synthetic"), "organic");
    fireEvent.changeText(
      screen.getByLabelText("Document / COA / SDS URL"),
      "https://example.com/coa.pdf"
    );
    fireEvent.changeText(
      screen.getByLabelText("Label photo URL"),
      "https://example.com/label.jpg"
    );
    fireEvent.changeText(
      screen.getByLabelText("Micronutrient notes"),
      "Adds calcium and trace minerals."
    );
    fireEvent.changeText(
      screen.getByLabelText("Application notes"),
      "Better for established plants than seedlings."
    );

    fireEvent.press(screen.getByText("Save Ingredient"));

    await waitFor(() =>
      expect(mockCreateProductIngredient).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Fish bone meal",
          brand: "Trusted Farm",
          category: "dry amendment",
          labelNPK: { N: 3, P: 16, K: 0 },
          densityGml: 0.8,
          releaseSpeed: "slow",
          releaseWindow: "days_45_90",
          cost: 42,
          supplier: "Trusted supplier",
          organicOrSynthetic: "organic",
          documentUrl: "https://example.com/coa.pdf",
          photoUrl: "https://example.com/label.jpg",
          micronutrientNotes: "Adds calcium and trace minerals.",
          applicationNotes: "Better for established plants than seedlings."
        })
      )
    );
  });

  it("fills a draft from durable label evidence and requires verification", async () => {
    const screen = render(<IngredientLibraryRoute />);
    await waitFor(() => expect(screen.getByText("Kelp meal")).toBeTruthy());

    fireEvent.press(screen.getByText("New Ingredient"));
    fireEvent.press(screen.getByLabelText("Mock label upload"));
    fireEvent.press(screen.getByLabelText("Analyze ingredient label with AI"));

    await waitFor(() =>
      expect(mockExtractIngredientLabel).toHaveBeenCalledWith("evidence-label-1")
    );
    expect(screen.getByLabelText("Name").props.value).toBe("Extracted Bloom");
    expect(screen.getByLabelText("N").props.value).toBe("2");
    expect(screen.getByLabelText("P2O5").props.value).toBe("6");
    expect(screen.getByLabelText("K2O").props.value).toBe("4");
    expect(screen.getByLabelText("Confirm extracted label values")).toBeTruthy();
  });
});
