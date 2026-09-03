import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";

import MarketplaceDetailScreen from "@/screens/MarketplaceDetailScreen";
import { openMarketplaceCheckoutUrl } from "@/screens/MarketplaceScreen";

const mockGetMarketplaceContent = jest.fn();
const mockPurchaseContent = jest.fn();

jest.mock("@/api/marketplace", () => ({
  getMarketplaceContent: (...args: unknown[]) => mockGetMarketplaceContent(...args),
  purchaseContent: (...args: unknown[]) => mockPurchaseContent(...args)
}));

describe("MarketplaceDetailScreen checkout recovery", () => {
  let originalPlatform: string;

  beforeEach(() => {
    jest.clearAllMocks();
    const storage = new Map<string, string>();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      return storage.get(key) ?? null;
    });
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
    jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      storage.delete(key);
    });
    jest.mocked(AsyncStorage.clear).mockImplementation(async () => {
      storage.clear();
    });
    originalPlatform = Platform.OS;
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    mockGetMarketplaceContent.mockResolvedValue({
      id: "offer-1",
      title: "Protected worksheet",
      price: 12
    });
    mockPurchaseContent.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/cs_test_offer_1"
    });
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatform
    });
    jest.restoreAllMocks();
  });

  it("opens the returned Stripe URL on native and keeps duplicate checkout disabled", async () => {
    const screen = render(
      <MarketplaceDetailScreen
        route={{ params: { id: "offer-1" } }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    await screen.findByText("Protected worksheet");
    fireEvent.press(screen.getByLabelText("Start storefront offer checkout"));
    fireEvent.press(screen.getByLabelText("Start storefront offer checkout"));

    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://checkout.stripe.com/c/pay/cs_test_offer_1"
      )
    );
    expect(mockPurchaseContent).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Start storefront offer checkout")).toBeDisabled();
    expect(
      await AsyncStorage.getItem("@growpath/buyer-checkout-recovery/v1/marketplace")
    ).toContain("offer-1");
  });

  it("navigates the browser to the returned Stripe URL on web", async () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(Platform, "OS", { configurable: true, value: "web" });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { href: "", origin: "https://app.example" } }
    });

    try {
      await openMarketplaceCheckoutUrl(
        "https://checkout.stripe.com/c/pay/cs_test_web_offer"
      );
      expect((globalThis as any).window.location.href).toBe(
        "https://checkout.stripe.com/c/pay/cs_test_web_offer"
      );
    } finally {
      if (previousWindow) {
        Object.defineProperty(globalThis, "window", previousWindow);
      } else {
        delete (globalThis as any).window;
      }
    }
  });
});
