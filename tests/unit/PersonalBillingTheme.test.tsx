import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { getSubscription } from "../../src/api/subscription";
import BillingHome, {
  createBillingHomeStyles
} from "../../src/features/billing/screens/BillingHome";
import { createUpgradePlanStyles } from "../../src/features/billing/screens/UpgradePlan";
import { getThemePalette } from "../../src/theme/appTheme";

const nightPalette = getThemePalette("night", "dark");

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({})
}));

jest.mock("../../src/auth/AuthContext", () => ({
  useAuth: () => ({ token: "billing-test-token" })
}));

jest.mock("../../src/theme/appTheme", () => {
  const actual = jest.requireActual("../../src/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});

jest.mock("../../src/api/subscription", () => ({
  createCheckoutSession: jest.fn(),
  getSubscription: jest.fn(),
  getSubscriptionSetupStatus: jest.fn()
}));

jest.mock("../../src/api/subscribe", () => ({
  cancelSubscription: jest.fn()
}));

jest.mock("../../src/utils/openExternalUrl", () => ({
  openExternalUrl: jest.fn()
}));

describe("Personal billing Night theme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSubscription as jest.Mock).mockResolvedValue({
      data: { plan: "free", subscriptionStatus: "inactive" }
    });
  });

  it("uses the active palette for billing status, actions, and cancellation", async () => {
    const styles = createBillingHomeStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.meta.color).toBe(nightPalette.textMuted);
    expect(styles.note.color).toBe(nightPalette.textSoft);
    expect(styles.button.backgroundColor).toBe(nightPalette.accent);
    expect(styles.buttonText.color).toBe(nightPalette.accentText);
    expect(styles.cancelButton.backgroundColor).toBe(nightPalette.surface);
    expect(styles.cancelButton.borderColor).toBe(nightPalette.danger);
    expect(styles.cancelButtonText.color).toBe(nightPalette.danger);

    const screen = render(<BillingHome />);
    await waitFor(() => expect(getSubscription).toHaveBeenCalled());
    expect(StyleSheet.flatten(screen.getByText("Billing").props.style).color).toBe(
      nightPalette.text
    );
    expect(StyleSheet.flatten(screen.getByText("Refresh Status").props.style).color).toBe(
      nightPalette.accentText
    );
  });

  it("uses the active palette for plans, segments, banners, cards, and fields", () => {
    const styles = createUpgradePlanStyles(nightPalette);

    expect(styles.container.backgroundColor).toBe(nightPalette.page);
    expect(styles.title.color).toBe(nightPalette.text);
    expect(styles.subtitle.color).toBe(nightPalette.textMuted);
    expect(styles.comparisonNote.color).toBe(nightPalette.text);
    expect(styles.segment.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.segment.borderColor).toBe(nightPalette.border);
    expect(styles.segmentButtonActive.backgroundColor).toBe(nightPalette.accent);
    expect(styles.segmentText.color).toBe(nightPalette.textSoft);
    expect(styles.segmentTextActive.color).toBe(nightPalette.accentText);
    expect(styles.modeBannerLive.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.modeBannerLive.borderColor).toBe(nightPalette.warning);
    expect(styles.modeBannerTest.backgroundColor).toBe(nightPalette.accentSoft);
    expect(styles.modeBannerTest.borderColor).toBe(nightPalette.success);
    expect(styles.modeBannerUnknown.backgroundColor).toBe(nightPalette.surfaceMuted);
    expect(styles.modeBannerUnknown.borderColor).toBe(nightPalette.border);
    expect(styles.modeBannerText.color).toBe(nightPalette.textSoft);
    expect(styles.modeBannerTextLive.color).toBe(nightPalette.warning);
    expect(styles.giftCard.backgroundColor).toBe(nightPalette.card);
    expect(styles.giftCard.borderColor).toBe(nightPalette.border);
    expect(styles.cardTitle.color).toBe(nightPalette.text);
    expect(styles.cardDesc.color).toBe(nightPalette.textMuted);
    expect(styles.sectionText.color).toBe(nightPalette.textSoft);
    expect(styles.price.color).toBe(nightPalette.text);
    expect(styles.priceMeta.color).toBe(nightPalette.textMuted);
    expect(styles.input.backgroundColor).toBe(nightPalette.surface);
    expect(styles.input.borderColor).toBe(nightPalette.border);
    expect(styles.input.color).toBe(nightPalette.text);
    expect(styles.feedback.backgroundColor).toBe(nightPalette.accentSoft);
    expect(styles.feedback.borderColor).toBe(nightPalette.info);
    expect(styles.feedbackSuccess.borderColor).toBe(nightPalette.success);
    expect(styles.feedbackError.borderColor).toBe(nightPalette.danger);
    expect(styles.planCard.backgroundColor).toBe(nightPalette.card);
    expect(styles.planCard.borderColor).toBe(nightPalette.border);
    expect(styles.planCardFeatured.borderColor).toBe(nightPalette.accent);
    expect(styles.button.backgroundColor).toBe(nightPalette.accent);
    expect(styles.buttonText.color).toBe(nightPalette.accentText);
  });
});
