import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PurchaseIntentTrialCard from "@/components/commercial/PurchaseIntentTrialCard";

const mockSubmitResponse = jest.fn();
let mockUser: Record<string, unknown> | null = { id: "respondent-1" };

jest.mock("@/api/commercialWorkflows", () => ({
  submitPurchaseIntentTrialResponse: (...args: unknown[]) => mockSubmitResponse(...args)
}));

jest.mock("@/auth/AuthContext", () => ({
  useOptionalAuth: () => ({ user: mockUser })
}));

jest.mock("expo-router", () => {
  const React = jest.requireActual("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { href })
  };
});

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

const trial = {
  id: "trial-1",
  trialType: "purchase_intent_concept",
  conceptAssetId: "growpathai-hat-circuit-leaf-sage-purchase-intent-trial",
  conceptTitle: "GrowPathAI Circuit Leaf — Sage",
  candidatePrice: 34,
  priceCurrency: "USD",
  question: "Would you buy this hat for $34.00?",
  purchaseIntentSummary: { yes: 8, maybe: 3, no: 1, total: 12 },
  itemForSale: false,
  inventoryAvailable: 0
};

describe("PurchaseIntentTrialCard", () => {
  beforeEach(() => {
    mockSubmitResponse.mockReset();
    mockSubmitResponse.mockResolvedValue({ success: true, response: "yes" });
    mockUser = { id: "respondent-1" };
  });

  it("records research intent without exposing owner totals or commerce actions", async () => {
    const screen = render(<PurchaseIntentTrialCard trial={trial} />);

    expect(screen.getByText("Concept trial · Not for sale")).toBeTruthy();
    expect(screen.getByText("Would you buy this hat for $34.00?")).toBeTruthy();
    expect(screen.getByText(/Available inventory: 0/)).toBeTruthy();
    expect(screen.queryByText(/recorded responses/i)).toBeNull();
    expect(screen.queryByText(/checkout/i)?.props.accessibilityRole).not.toBe("button");

    fireEvent.press(screen.getByLabelText("yes — Would you buy this hat for $34.00?"));

    await waitFor(() =>
      expect(mockSubmitResponse).toHaveBeenCalledWith("trial-1", "yes")
    );
    expect(
      screen.getByText(
        "Your answer was saved. You can change it any time while the trial is open."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/recorded responses/i)).toBeNull();
  });

  it("requires sign-in before recording a response", () => {
    mockUser = null;
    const screen = render(<PurchaseIntentTrialCard trial={trial} />);

    const signIn = screen.getByText("Sign in to answer");
    expect(signIn).toBeTruthy();
    expect(screen.getByRole("link").props.href).toBe("/login");
    expect(mockSubmitResponse).not.toHaveBeenCalled();
  });
});
