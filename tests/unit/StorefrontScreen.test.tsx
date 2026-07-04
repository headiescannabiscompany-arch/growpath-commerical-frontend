import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import StorefrontScreen from "@/screens/StorefrontScreen";

const mockCreateStorefront = jest.fn();
const mockFetchStorefront = jest.fn();
const mockUpdateStorefront = jest.fn();
const mockCreateProduct = jest.fn();
const mockDeleteProduct = jest.fn();
const mockFetchProducts = jest.fn();
const mockUpdateProduct = jest.fn();
const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();
const mockAttachPhotos = jest.fn();
const mockRequestPermissions = jest.fn();
const mockLaunchLibrary = jest.fn();

jest.mock("../../src/api/storefront", () => ({
  createStorefront: (...args: any[]) => mockCreateStorefront(...args),
  fetchStorefront: (...args: any[]) => mockFetchStorefront(...args),
  updateStorefront: (...args: any[]) => mockUpdateStorefront(...args)
}));

jest.mock("../../src/api/products", () => ({
  createProduct: (...args: any[]) => mockCreateProduct(...args),
  deleteProduct: (...args: any[]) => mockDeleteProduct(...args),
  fetchProducts: (...args: any[]) => mockFetchProducts(...args),
  updateProduct: (...args: any[]) => mockUpdateProduct(...args)
}));

jest.mock("../../src/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args)
}));

jest.mock("@/utils/growPhotoAttachment", () => ({
  maybePromptAttachPhotosToGrow: (...args: any[]) => mockAttachPhotos(...args)
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestPermissions(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args)
}));

describe("StorefrontScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFetchStorefront.mockResolvedValue({
      id: "store-1",
      name: "Grow Shop",
      slug: "grow-shop",
      isPublished: false
    });
    mockFetchProducts.mockResolvedValue([]);
    mockApiRequest.mockResolvedValue({ inventory: [] });
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/product.jpg" }]
    });
    mockPersistImageUri.mockResolvedValue("/uploads/product.jpg");
    mockAttachPhotos.mockResolvedValue({ prompted: true, attached: false });
  });

  it("uploads product images before saving a product without grow-photo attachment", async () => {
    const screen = render(<StorefrontScreen />);

    await waitFor(() => expect(mockFetchProducts).toHaveBeenCalled());

    fireEvent.changeText(
      screen.getByPlaceholderText("Website or shop URL"),
      "https://shop.example.com"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Support email"),
      "support@example.com"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Social links, one per line"),
      "Instagram: https://instagram.example.com/grow-shop"
    );
    fireEvent.press(screen.getByText("Save storefront"));

    await waitFor(() =>
      expect(mockUpdateStorefront).toHaveBeenCalledWith(
        expect.objectContaining({
          websiteUrl: "https://shop.example.com",
          supportEmail: "support@example.com",
          socialLinksText: "Instagram: https://instagram.example.com/grow-shop"
        })
      )
    );
    await waitFor(() => expect(screen.getByText("Save storefront")).toBeTruthy());

    fireEvent.press(screen.getByText("Add Product"));
    fireEvent.press(screen.getByLabelText("Upload product image"));

    await waitFor(() =>
      expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/product.jpg")
    );
    await waitFor(() =>
      expect(screen.getByDisplayValue("/uploads/product.jpg")).toBeTruthy()
    );
    expect(mockAttachPhotos).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByPlaceholderText("Product name"), "Living Soil");
    fireEvent.changeText(
      screen.getByPlaceholderText("Category, e.g. soil mix, dry amendment, houseplant"),
      "soil mix"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Short public summary"),
      "Seedling-safe living soil"
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        "Usage instructions, application rate, or care guidance"
      ),
      "Use 1 gallon per small container."
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("Warnings, stage limits, legal notes, or safety notes"),
      "Do not use as fast calcium rescue."
    );
    fireEvent.changeText(
      screen.getByPlaceholderText("External purchase URL"),
      "https://shop.example.com/living-soil"
    );
    fireEvent.changeText(screen.getByPlaceholderText("Product line id"), "line-1");
    fireEvent.changeText(screen.getByPlaceholderText("Linked recipe id"), "recipe-1");
    fireEvent.changeText(screen.getByPlaceholderText("Linked batch id"), "batch-1");
    fireEvent.changeText(screen.getByPlaceholderText("Linked grow/trial id"), "trial-1");
    fireEvent.changeText(screen.getByPlaceholderText("Linked course id"), "course-1");
    fireEvent.press(screen.getByText("Save"));

    await waitFor(() =>
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Living Soil",
          imageUrl: "/uploads/product.jpg",
          category: "soil mix",
          shortDescription: "Seedling-safe living soil",
          usageInstructions: "Use 1 gallon per small container.",
          warnings: "Do not use as fast calcium rescue.",
          externalPurchaseUrl: "https://shop.example.com/living-soil",
          productLineId: "line-1",
          linkedRecipeId: "recipe-1",
          linkedBatchId: "batch-1",
          linkedGrowTrialId: "trial-1",
          linkedCourseId: "course-1"
        })
      )
    );
  });
});
