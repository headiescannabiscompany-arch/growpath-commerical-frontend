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
  if (path === "/api/commercial/courses" && !options) {
    return Promise.resolve({
      courses: [
        {
          id: "course-1",
          title: "Living Soil Basics",
          description: "Build a practical soil mix and product education path.",
          status: "published",
          skillLevel: "beginner",
          access: "free",
          growInterests: ["living soil", "dry amendments"],
          linkedProductIds: ["product-1"],
          linkedLiveIds: ["live-1"],
          forumThreadId: "thread-course"
        }
      ]
    });
  }
  if (path === "/api/commercial/lives" && !options) {
    return Promise.resolve({
      lives: [
        {
          id: "live-1",
          title: "Live Soil Mixing Demo",
          description: "RSVP for a product demo tied to the course.",
          status: "scheduled",
          scheduledStart: "2026-07-17T20:00:00Z",
          twitchChannelName: "growpath",
          relatedProductId: "product-1",
          relatedCourseId: "course-1",
          relatedFeedPostId: "campaign-1",
          forumThreadId: "thread-1"
        }
      ]
    });
  }
  if (path === "/api/commercial/feed" && !options) {
    return Promise.resolve({
      items: [
        {
          id: "campaign-1",
          title: "New Veg Mix Launch",
          body: "Promotional storefront placement for the new mix.",
          type: "product_ad",
          status: "active",
          imageUrl: "https://example.com/campaign.jpg",
          linkedProductId: "product-1",
          linkedCourseId: "course-1",
          linkedLiveId: "live-1",
          linkedForumThreadId: "thread-1"
        }
      ]
    });
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
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/lives")
    );
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/courses")
    );
    expect(screen.getByText("Featured Courses")).toBeTruthy();
    expect(screen.getByText("Living Soil Basics")).toBeTruthy();
    expect(screen.getByText(/Interests living soil, dry amendments/)).toBeTruthy();
    expect(screen.getByText("Live Soil Mixing Demo")).toBeTruthy();
    expect(screen.getAllByText(/Product product-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Forum\/Q&A thread-1/).length).toBeGreaterThan(0);
    expect(screen.getByText("New Veg Mix Launch")).toBeTruthy();
    expect(screen.getByText(/Advertising \/ outreach/)).toBeTruthy();
    expect(screen.getByText(/Live live-1/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Upload storefront logo"));
    await waitFor(() =>
      expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/logo.jpg")
    );
    await waitFor(() =>
      expect(screen.getByDisplayValue("/uploads/logo.jpg")).toBeTruthy()
    );
    expect(mockAttachPhotos).not.toHaveBeenCalled();

    fireEvent.changeText(
      screen.getByLabelText("Storefront website URL"),
      "https://shop.example.com"
    );
    fireEvent.changeText(
      screen.getByLabelText("Storefront support email"),
      "support@example.com"
    );
    fireEvent.changeText(
      screen.getByLabelText("Storefront social links"),
      "Instagram: https://instagram.example.com/grow-shop"
    );
    fireEvent.press(screen.getByLabelText("Save storefront settings"));
    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/storefront",
        expect.objectContaining({
          method: "PATCH",
          body: expect.objectContaining({
            logoUrl: "/uploads/logo.jpg",
            websiteUrl: "https://shop.example.com",
            supportEmail: "support@example.com",
            socialLinksText: "Instagram: https://instagram.example.com/grow-shop"
          })
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
    expect(mockAttachPhotos).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText("Product name"), "Living Soil");
    fireEvent.changeText(screen.getByLabelText("Product category"), "soil mix");
    fireEvent.changeText(
      screen.getByLabelText("Product short description"),
      "Seedling-safe living soil"
    );
    fireEvent.changeText(
      screen.getByLabelText("Product usage instructions"),
      "Use 1 gallon per small container."
    );
    fireEvent.changeText(
      screen.getByLabelText("Product warnings"),
      "Do not use as fast calcium rescue."
    );
    fireEvent.changeText(
      screen.getByLabelText("Product external purchase URL"),
      "https://shop.example.com/living-soil"
    );
    fireEvent.changeText(screen.getByLabelText("Product line id"), "line-1");
    fireEvent.changeText(screen.getByLabelText("Linked recipe id"), "recipe-1");
    fireEvent.changeText(screen.getByLabelText("Linked batch id"), "batch-1");
    fireEvent.changeText(screen.getByLabelText("Linked grow trial id"), "trial-1");
    fireEvent.changeText(screen.getByLabelText("Linked course id"), "course-1");
    fireEvent.press(screen.getByLabelText("Create storefront product"));

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/commercial/products",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
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
        })
      )
    );
  });
});
