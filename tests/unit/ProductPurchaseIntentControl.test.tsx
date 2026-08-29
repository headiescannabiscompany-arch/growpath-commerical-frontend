import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ProductPurchaseIntentControl from "@/components/commercial/ProductPurchaseIntentControl";

const mockSubmit = jest.fn();
let mockUser: Record<string, unknown> | null = { id: "viewer-1" };

jest.mock("@/api/products", () => ({
  submitProductPurchaseIntent: (...args: unknown[]) => mockSubmit(...args)
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

const product = {
  id: "product-1",
  name: "GrowPathAI Night Script Cord",
  purchaseIntentEnabled: true,
  purchaseIntentTarget: 25,
  purchaseIntentSummary: { yes: 4, maybe: 2, no: 1, total: 7 }
};

describe("ProductPurchaseIntentControl", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({
      response: "yes",
      summary: { yes: 5, maybe: 2, no: 1, total: 8 }
    });
    mockUser = { id: "viewer-1" };
  });

  it("records revisable interest and never presents commerce as completed", async () => {
    const screen = render(<ProductPurchaseIntentControl product={product} />);

    expect(screen.getByText("25-customer production goal")).toBeTruthy();
    expect(screen.getByText("4 yes · goal 25")).toBeTruthy();
    expect(screen.getByText(/does not reserve a hat/i)).toBeTruthy();

    fireEvent.press(
      screen.getByLabelText("yes — purchase interest for GrowPathAI Night Script Cord")
    );
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith("product-1", "yes"));
    expect(screen.getByText("5 yes · goal 25")).toBeTruthy();
    expect(screen.queryByText(/order created/i)).toBeNull();
  });

  it("requires sign-in", () => {
    mockUser = null;
    const screen = render(<ProductPurchaseIntentControl product={product} />);
    expect(screen.getByText("Sign in to opt in")).toBeTruthy();
    expect(screen.getByRole("link").props.href).toBe("/login");
  });
});
