import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialAnalyticsRoute from "@/app/home/commercial/analytics";

const mockApiRequest = jest.fn();
const mockMapApiError: any = jest.fn((error: unknown) => ({
  message: String(error)
}));
mockMapApiError.toInlineError = mockMapApiError;

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: function MockLink({ children, href }: any) {
      return React.cloneElement(React.Children.only(children), { href });
    }
  };
});

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockMapApiError
}));

jest.mock("@/components/InlineError", () => ({
  InlineError: function MockInlineError({ error, onRetry }: any) {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, error?.message || "Analytics request failed"),
      onRetry
        ? React.createElement(
            Pressable,
            {
              accessibilityLabel: "Retry commercial analytics",
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

describe("Commercial Analytics request state", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockMapApiError.mockImplementation((error: unknown) => ({
      message: String(error)
    }));
    mockMapApiError.toInlineError = mockMapApiError;
  });

  it("does not present failed initial data as a real zero snapshot and can retry", async () => {
    let attempts = 0;
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/analytics/overview") {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(new Error("analytics unavailable"))
          : Promise.resolve({ overview: { adClicks: 7 } });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialAnalyticsRoute />);

    expect(await screen.findByText("Error: analytics unavailable")).toBeTruthy();
    expect(screen.queryByText("Overview Metrics")).toBeNull();
    expect(screen.queryByText("Ad clicks")).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Retry commercial analytics" }));

    expect(await screen.findByText("Overview Metrics")).toBeTruthy();
    expect(screen.getByText("Ad clicks")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(attempts).toBe(2);
  });

  it("retains the last good snapshot when refresh fails and blocks duplicate refreshes", async () => {
    let rejectRefresh: ((reason?: any) => void) | undefined;
    let attempts = 0;
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/commercial/analytics/overview") {
        attempts += 1;
        if (attempts === 1) {
          return Promise.resolve({ overview: { adClicks: 11 } });
        }
        return new Promise((_, reject) => {
          rejectRefresh = reject;
        });
      }
      return Promise.resolve({});
    });

    const screen = render(<CommercialAnalyticsRoute />);
    expect(await screen.findByText("11")).toBeTruthy();

    const refresh = screen.getByRole("button", {
      name: "Refresh commercial analytics"
    });
    fireEvent.press(refresh);
    fireEvent.press(refresh);

    expect(attempts).toBe(2);
    expect(screen.getByText("11")).toBeTruthy();

    await act(async () => {
      rejectRefresh?.(new Error("refresh failed"));
    });

    expect(await screen.findByText("Error: refresh failed")).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();
  });

  it("names its workflow links and exposes one page heading", async () => {
    mockApiRequest.mockResolvedValue({ overview: {} });

    const screen = render(<CommercialAnalyticsRoute />);
    await waitFor(() => expect(screen.getByText("Overview Metrics")).toBeTruthy());

    expect(
      screen.getByRole("header", { name: "Commercial Analytics" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByRole("link", { name: "Open Storefront" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Products" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Feed" })).toBeTruthy();
  });
});
