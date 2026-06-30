import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import Storefront from "@/app/storefront";

const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();
const mockAttachPhotos = jest.fn();
const mockRequestPermissions = jest.fn();
const mockLaunchLibrary = jest.fn();
const mockHandleApiError = jest.fn();
const mockClearError = jest.fn();
const mockApiErrorState = {
  error: null,
  handleApiError: (...args: any[]) => mockHandleApiError(...args),
  clearError: (...args: any[]) => mockClearError(...args)
};

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { STORE_FRONT_VIEW: "storefront.view" },
  useEntitlements: () => ({
    ready: true,
    can: (capability: string) => capability === "storefront.view"
  })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorState
}));

jest.mock("@/api/apiRequest", () => ({
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

function apiResponseFor(path: string, options?: any) {
  if (path === "/api/commercial/storefront" && !options) {
    return Promise.resolve({
      storefront: {
        id: "store-1",
        name: "Grow Shop",
        slug: "grow-shop",
        logoUrl: "",
        bannerUrl: "",
        isPublished: false
      }
    });
  }
  if (path === "/api/commercial/products" && !options) {
    return Promise.resolve({ products: [] });
  }
  if (path === "/api/commercial/inventory" && !options) {
    return Promise.resolve({ inventory: [] });
  }
  if (path === "/api/commercial/storefront" && options?.method === "PATCH") {
    return Promise.resolve({ storefront: { id: "store-1", ...options.body } });
  }
  if (path === "/api/commercial/products" && options?.method === "POST") {
    return Promise.resolve({ product: { id: "product-1", ...options.body } });
  }
  return Promise.resolve({});
}

describe("Storefront route", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockImplementation(apiResponseFor);
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockAttachPhotos.mockResolvedValue({ prompted: true, attached: false });
    mockLaunchLibrary
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///tmp/logo.jpg" }]
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: "file:///tmp/product.jpg" }]
      });
    mockPersistImageUri
      .mockResolvedValueOnce("/uploads/logo.jpg")
      .mockResolvedValueOnce("/uploads/product.jpg");
  });

  it("uploads storefront and product images before save", async () => {
    const screen = render(<Storefront />);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/storefront")
    );

    fireEvent.press(screen.getByLabelText("Upload storefront logo"));
    await waitFor(() =>
      expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/logo.jpg")
    );
    await waitFor(() =>
      expect(screen.getByDisplayValue("/uploads/logo.jpg")).toBeTruthy()
    );
    expect(mockAttachPhotos).toHaveBeenCalledWith(["/uploads/logo.jpg"]);

    fireEvent.press(screen.getByLabelText("Save storefront settings"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/storefront",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({ logoUrl: "/uploads/logo.jpg" })
        })
      )
    );

    fireEvent.press(screen.getByLabelText("Upload product listing image"));
    await waitFor(() =>
      expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/product.jpg")
    );
    await waitFor(() =>
      expect(screen.getByDisplayValue("/uploads/product.jpg")).toBeTruthy()
    );
    expect(mockAttachPhotos).toHaveBeenCalledWith(["/uploads/product.jpg"]);

    fireEvent.changeText(screen.getByLabelText("Product name"), "Living Soil");
    fireEvent.press(screen.getByLabelText("Create storefront product"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/products",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({ imageUrl: "/uploads/product.jpg" })
        })
      )
    );
  });
});
