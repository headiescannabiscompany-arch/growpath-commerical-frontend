import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialOrdersRoute, {
  summarizeCommercialOrderSales
} from "@/screens/commercial/OrdersScreen";

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
  InlineError: function MockInlineError({ error, onRetry }: any) {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, error?.message || "Order request failed"),
      onRetry
        ? React.createElement(
            Pressable,
            {
              accessibilityLabel: "Retry commercial orders",
              accessibilityRole: "button",
              onPress: onRetry
            },
            React.createElement(Text, null, "Retry")
          )
        : null
    );
  }
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: function MockAppPage({ header, children }: any) {
      return React.createElement(View, null, header, children);
    }
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: function MockAppCard({ children, ...props }: any) {
      return React.createElement(View, props, children);
    }
  };
});

describe("Commercial Orders route", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockToInlineError.mockImplementation((error: unknown) => ({
      title: "Unable to load orders",
      message: String(error)
    }));
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
              refundedAmountCents: 0,
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
            refundedAmountCents: 0,
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
    expect(
      screen.getByRole("header", { name: "Order Summary" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByRole("header", { name: "Current Orders" }).props["aria-level"]
    ).toBe(2);
    expect(screen.getByText("$129.98")).toBeTruthy();
    expect(screen.getByText(/USD\s+129\.98/)).toBeTruthy();
    expect(screen.getByText("Net sales (before fees)")).toBeTruthy();
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

  it("preserves cancel and reopen fulfillment transitions", async () => {
    const screen = render(<CommercialOrdersRoute />);

    await waitFor(() => expect(screen.getByText("Living Soil Tote")).toBeTruthy());

    fireEvent.press(
      screen.getByRole("button", {
        name: "Cancel order Living Soil Tote"
      })
    );

    expect(
      mockApiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/api/commercial/orders/order-1" &&
          options?.body?.fulfillmentStatus === "canceled"
      )
    ).toHaveLength(0);

    fireEvent.press(
      screen.getByRole("button", {
        name: "Confirm cancel order Living Soil Tote"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/orders/order-1", {
        method: "PATCH",
        body: { fulfillmentStatus: "canceled" }
      })
    );
    expect(await screen.findByText("Living Soil Tote marked canceled.")).toBeTruthy();

    fireEvent.press(
      screen.getByRole("button", {
        name: "Reopen order Living Soil Tote"
      })
    );

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/orders/order-1", {
        method: "PATCH",
        body: { fulfillmentStatus: "unfulfilled" }
      })
    );
    expect(await screen.findByText("Living Soil Tote marked unfulfilled.")).toBeTruthy();
  });

  it("shows refunded net sales by currency without changing historical orders or fulfillment", async () => {
    mockApiRequest.mockResolvedValue({
      orders: [
        {
          id: "refunded-usd",
          productName: "Refunded QA item",
          amountCents: 1000,
          refundedAmountCents: 1000,
          currency: "usd",
          status: "refunded",
          fulfillmentStatus: "unfulfilled"
        },
        {
          id: "partial-usd",
          productName: "Partial QA item",
          amountCents: 1000,
          refundedAmountCents: 100,
          currency: "usd",
          status: "paid",
          fulfillmentStatus: "fulfilled"
        },
        {
          id: "paid-eur",
          productName: "EUR QA item",
          amountCents: 2000,
          refundedAmountCents: 0,
          currency: "eur",
          status: "paid",
          fulfillmentStatus: "unfulfilled"
        },
        {
          id: "pending-usd",
          productName: "Unpaid QA item",
          amountCents: 9900,
          refundedAmountCents: 0,
          currency: "usd",
          status: "pending",
          fulfillmentStatus: "unfulfilled"
        }
      ]
    });
    const screen = render(<CommercialOrdersRoute />);

    expect(await screen.findByText(/USD\s+9\.00/)).toBeTruthy();
    expect(screen.getByText(/EUR\s+20\.00/)).toBeTruthy();
    expect(screen.getByText("Net sales (before fees)")).toBeTruthy();
    expect(screen.queryByText("Revenue")).toBeNull();
    expect(screen.getByText("Refunded QA item")).toBeTruthy();
    expect(screen.getByText("Unpaid QA item")).toBeTruthy();
    expect(screen.getByText("refunded")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Mark order Refunded QA item fulfilled" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Reopen order Partial QA item" })
    ).toBeTruthy();
    expect(
      mockApiRequest.mock.calls.some(([, options]) => options?.method === "PATCH")
    ).toBe(false);
  });

  it("does not display missing payment data as zero sales", async () => {
    mockApiRequest.mockResolvedValue({
      orders: [
        {
          id: "unknown-refund",
          productName: "Incomplete payment record",
          amountCents: 1000,
          currency: "usd",
          status: "paid",
          fulfillmentStatus: "unfulfilled"
        }
      ]
    });
    const screen = render(<CommercialOrdersRoute />);
    expect(await screen.findByText("Not available")).toBeTruthy();
    expect(screen.getByText(/1 order\(s\) need payment data review/)).toBeTruthy();
    expect(screen.queryByText(/USD\s+0\.00/)).toBeNull();
  });

  it("keeps a failed initial load distinct from an empty order history and retries", async () => {
    let loadAttempts = 0;
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/orders" && options?.method === "GET") {
        loadAttempts += 1;
        return loadAttempts === 1
          ? Promise.reject(new Error("orders unavailable"))
          : Promise.resolve({ orders: [] });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialOrdersRoute />);

    expect(await screen.findByText("Error: orders unavailable")).toBeTruthy();
    expect(screen.queryByText("No Orders Yet")).toBeNull();
    expect(screen.queryByText("Order Summary")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Retry commercial orders" }));

    expect(await screen.findByText("No Orders Yet")).toBeTruthy();
    expect(loadAttempts).toBe(2);
  });

  it("allows only one order write at a time and reports progress", async () => {
    let resolvePatch: ((value: any) => void) | undefined;
    const baseline = mockApiRequest.getMockImplementation();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/orders/order-1" && options?.method === "PATCH") {
        return new Promise((resolve) => {
          resolvePatch = resolve;
        });
      }
      return baseline?.(path, options);
    });

    const screen = render(<CommercialOrdersRoute />);
    const action = await screen.findByRole("button", {
      name: "Mark order Living Soil Tote fulfilled"
    });

    fireEvent.press(action);
    fireEvent.press(action);

    expect(screen.getByLabelText("Updating commercial order in progress")).toBeTruthy();
    expect(
      mockApiRequest.mock.calls.filter(
        ([path, options]) =>
          path === "/api/commercial/orders/order-1" && options?.method === "PATCH"
      )
    ).toHaveLength(1);

    await act(async () => {
      resolvePatch?.({
        order: {
          id: "order-1",
          productName: "Living Soil Tote",
          fulfillmentStatus: "fulfilled"
        }
      });
    });

    expect(await screen.findByText("Living Soil Tote marked fulfilled.")).toBeTruthy();
  });

  it("retains the current order when an update response is incomplete", async () => {
    const baseline = mockApiRequest.getMockImplementation();
    mockApiRequest.mockImplementation((path: string, options?: any) => {
      if (path === "/api/commercial/orders/order-1" && options?.method === "PATCH") {
        return Promise.resolve({});
      }
      return baseline?.(path, options);
    });

    const screen = render(<CommercialOrdersRoute />);
    await waitFor(() => expect(screen.getByText("Living Soil Tote")).toBeTruthy());

    fireEvent.press(
      screen.getByRole("button", {
        name: "Mark order Living Soil Tote fulfilled"
      })
    );

    expect(
      await screen.findByText(
        "Error: The order update response was incomplete. Reload and try again."
      )
    ).toBeTruthy();
    expect(screen.getByText("Living Soil Tote")).toBeTruthy();
    expect(screen.getByText("unfulfilled")).toBeTruthy();
  });
});

describe("Commercial order net-sales calculation", () => {
  it("retains fully refunded zero, partial refunds, and actual currency groups", () => {
    const result = summarizeCommercialOrderSales([
      {
        id: "full",
        status: "refunded",
        amountCents: 1000,
        refundedAmountCents: 1000,
        currency: "usd"
      },
      {
        id: "partial",
        status: "paid",
        amountCents: 1000,
        refundedAmountCents: 100,
        currency: "eur"
      },
      {
        id: "disputed",
        status: "disputed",
        amountCents: 500,
        refundedAmountCents: 0,
        currency: "eur"
      },
      {
        id: "failed",
        status: "failed",
        amountCents: 99900,
        refundedAmountCents: 0,
        currency: "usd"
      },
      {
        id: "pending",
        status: "pending",
        amountCents: 99900,
        refundedAmountCents: 0,
        currency: "usd"
      }
    ]);
    expect(result).toEqual({ byCurrency: { USD: 0, EUR: 1400 }, incomplete: 0 });
  });

  it("does not guess missing or invalid amounts, refunds, or currency", () => {
    const baseline = {
      id: "invalid",
      status: "paid",
      amountCents: 1000,
      refundedAmountCents: 0,
      currency: "usd"
    };
    const invalid = [
      { ...baseline, amountCents: undefined, total: 10 },
      { ...baseline, amountCents: NaN },
      { ...baseline, amountCents: -1 },
      { ...baseline, amountCents: 10.5 },
      { ...baseline, refundedAmountCents: undefined },
      { ...baseline, refundedAmountCents: 1001 },
      { ...baseline, refundedAmountCents: -1 },
      { ...baseline, currency: undefined },
      { ...baseline, currency: "not-a-currency" }
    ];
    expect(summarizeCommercialOrderSales(invalid)).toEqual({
      byCurrency: {},
      incomplete: invalid.length
    });
  });
});
