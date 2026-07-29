import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialOrdersRoute from "@/screens/commercial/OrdersScreen";

const mockApiRequest = jest.fn();
const mockToInlineError = jest.fn((error: unknown) => ({
  title: "Unable to load orders",
  message: String(error)
}));
const mockErrorHandler = {
  toInlineError: mockToInlineError
};

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({})
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: true,
    mode: "commercial"
  })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockErrorHandler
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: () => null
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ header, children }: any) =>
      React.createElement(View, null, header, children)
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => React.createElement(View, props, children)
  };
});

describe("Commercial Orders route", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/orders" && options?.method === "GET") {
        return Promise.resolve({
          orders: [
            {
              id: "order-1",
              productName: "Living Soil Tote",
              customerName: "Test Customer",
              customerEmail: "customer@example.com",
              quantity: 2,
              amountCents: 12998,
              currency: "usd",
              status: "paid",
              fulfillmentStatus: "unfulfilled",
              createdAt: "2026-07-23T12:00:00Z"
            }
          ]
        });
      }
      if (path === "/api/commercial/orders/order-1" && options?.method === "PATCH") {
        return Promise.resolve({
          order: {
            id: "order-1",
            productName: "Living Soil Tote",
            customerName: "Test Customer",
            customerEmail: "customer@example.com",
            quantity: 2,
            amountCents: 12998,
            currency: "usd",
            status: "paid",
            fulfillmentStatus: options.body.fulfillmentStatus,
            createdAt: "2026-07-23T12:00:00Z"
          }
        });
      }
      return Promise.resolve({ orders: [] });
    });
  });

  it("renders a single page heading and completes the fulfillment action", async () => {
    const screen = render(<CommercialOrdersRoute />);

    await waitFor(() => expect(screen.getByText("Living Soil Tote")).toBeTruthy());

    expect(screen.getByRole("header", { name: "Orders" })).toBeTruthy();
    expect(screen.getAllByText("$129.98")).toHaveLength(2);
    expect(screen.getByText("Qty 2")).toBeTruthy();
    expect(screen.getByText("paid")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", {
        name: "Mark order Living Soil Tote fulfilled"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/orders/order-1", {
        method: "PATCH",
        body: { fulfillmentStatus: "fulfilled" }
      })
    );
    expect(await screen.findByText("Living Soil Tote marked fulfilled.")).toBeTruthy();
  });
});
