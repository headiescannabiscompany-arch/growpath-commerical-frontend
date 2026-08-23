import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import IngredientLibraryRoute, {
  createIngredientLibraryStyles
} from "@/app/home/personal/(tabs)/tools/ingredient-library";
import { getThemePalette } from "@/theme/appTheme";

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
  it("uses the active Night palette across the shared catalog and form", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createIngredientLibraryStyles(palette);

    expect(styles.screen.backgroundColor).toBe(palette.page);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.secondary.backgroundColor).toBe(palette.surface);
    expect(styles.label.color).toBe(palette.text);
  });

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
      },
      analysisReceipt: {
        analysisId: "ingredient-label-analysis-1",
        requested: true,
        performed: true,
        photoCount: 1,
        photosAnalyzed: 1,
        quality: "unknown",
        confidence: "unknown",
        providerLabel: "GrowPath protected ingredient-label review",
        evidenceUsed: ["One user-selected protected label photo"],
        limitations: ["Verify every value against the retained original."]
      }
    });
  });

  it("saves reusable ingredient library fields for recipe math", async () => {
    const screen = render(<IngredientLibraryRoute />);

    await waitFor(() => expect(screen.getByText("Kelp meal")).toBeTruthy());
    expect(screen.getByRole("header", { name: "Products & Label Library" })).toHaveProp(
      "aria-level",
      1
    );
    expect(screen.getByRole("header", { name: "Kelp meal" })).toHaveProp("aria-level", 2);
    expect(screen.getByRole("header", { name: "Create ingredient" })).toHaveProp(
      "aria-level",
      2
    );
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
    expect(screen.getByText("Evidence review")).toBeTruthy();
    expect(screen.getByText("1 photo inspected")).toBeTruthy();
    expect(screen.getByText(/One user-selected protected label photo/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Confirm extracted label values"));
    fireEvent.press(screen.getByText("Save Ingredient"));

    await waitFor(() =>
      expect(mockCreateProductIngredient).toHaveBeenCalledWith(
        expect.objectContaining({
          evidenceAssetIds: ["evidence-label-1"],
          photoUrls: ["https://example.com/durable-label.jpg"],
          labelVerifiedByUser: true,
          labelExtraction: expect.objectContaining({
            productName: "Extracted Bloom"
          }),
          labelAnalysisReceipt: expect.objectContaining({
            analysisId: "ingredient-label-analysis-1",
            performed: true,
            photosAnalyzed: 1
          })
        })
      )
    );
  });
});
