import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import CommercialProductsRoute from "@/app/home/commercial/products";

const mockFetch = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/api/products", () => ({
  fetchProducts: (...args: any[]) => mockFetch(...args),
  createProduct: (...args: any[]) => mockCreate(...args),
  updateProduct: jest.fn(),
  enableProductPurchaseIntent: jest.fn()
}));
jest.mock("@/api/storefront", () => ({
  fetchStorefront: async () => ({ slug: "qa-store" })
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@example.invalid" } })
}));
jest.mock("@/entitlements", () => ({ useEntitlements: () => ({ plan: "commercial" }) }));
jest.mock("expo-router", () => ({
  Link: ({ children, href }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(
      Text,
      { accessibilityRole: "link", accessibilityHint: href },
      children
    );
  }
}));
jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockPage({ header, children }: any) {
    return React.createElement(View, null, header, children);
  };
});
jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockCard({ children }: any) {
    return React.createElement(View, null, children);
  };
});

describe("Commercial Products read readiness", () => {
  it("carries only the saved published product ID into campaign authoring", async () => {
    mockFetch.mockResolvedValue([
      { id: "saved-product", name: "Published kit", status: "published" },
      { id: "draft-product", name: "Private kit", status: "draft" }
    ]);
    const screen = render(<CommercialProductsRoute />);
    await screen.findByText("Published kit");
    expect(screen.getAllByText("Create Campaign")).toHaveLength(1);
    expect(
      screen
        .getAllByRole("link")
        .some(
          (link) =>
            link.props.accessibilityHint ===
            "/home/commercial/feed?productId=saved-product"
        )
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) =>
          String(link.props.accessibilityHint).includes("productId=draft-product")
        )
    ).toBe(false);
  });
  it("keeps refresh read-only and single-flight without clearing draft fields", async () => {
    let resolve!: (value: any) => void;
    const product = { id: "qa-product", name: "QA private draft", status: "draft" };
    mockFetch
      .mockReset()
      .mockResolvedValueOnce([product])
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          })
      );
    const screen = render(<CommercialProductsRoute />);
    await screen.findByText("QA private draft");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product name"),
      "Unsaved draft"
    );
    const refresh = screen.getByRole("button", { name: "Refresh products" });
    fireEvent.press(refresh);
    fireEvent.press(refresh);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText("Refreshing products. Showing previously loaded products.")
    ).toBeTruthy();
    expect(screen.getByLabelText("Create commercial product")).toBeDisabled();
    expect(
      screen.getByLabelText("Create setup task for QA private draft")
    ).toBeDisabled();
    await act(async () => {
      resolve([product]);
    });
    expect(screen.getByLabelText("Commercial product name").props.value).toBe(
      "Unsaved draft"
    );
    expect(screen.getByLabelText("Create commercial product")).toBeEnabled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not overlap a product creation with a user refresh", async () => {
    let finishCreate!: (value: any) => void;
    mockFetch.mockResolvedValue([]);
    mockCreate.mockImplementationOnce(
      () =>
        new Promise((done) => {
          finishCreate = done;
        })
    );
    const screen = render(<CommercialProductsRoute />);
    await screen.findByText("No products yet.");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product name"),
      "QA create draft"
    );
    fireEvent.press(screen.getByLabelText("Create commercial product"));
    await act(async () => {});
    expect(screen.getByRole("button", { name: "Refresh products" })).toBeDisabled();
    fireEvent.press(screen.getByRole("button", { name: "Refresh products" }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishCreate({ id: "created-draft" });
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: "QA create draft",
      status: "draft"
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  beforeEach(() => {
    mockFetch.mockReset();
    mockCreate.mockReset();
  });
  it("does not show empty counts or publication guidance before its first successful read", async () => {
    let resolve!: (value: any) => void;
    mockFetch.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const screen = render(<CommercialProductsRoute />);
    expect(screen.queryByText("No products yet.")).toBeNull();
    expect(
      screen.queryByText("No fully configured private drafts are waiting to publish.")
    ).toBeNull();
    expect(screen.queryAllByText("0")).toHaveLength(0);
    fireEvent.changeText(
      screen.getByLabelText("Commercial product name"),
      "Unsaved QA draft"
    );
    expect(screen.getByLabelText("Create commercial product")).toBeDisabled();
    await act(async () => {
      resolve([]);
    });
    expect(screen.getByText("No products yet.")).toBeTruthy();
    expect(screen.getByLabelText("Create commercial product")).toBeEnabled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it("retries an initial failure once and preserves the unfinished form", async () => {
    let resolve!: (value: any) => void;
    mockFetch
      .mockRejectedValueOnce(new Error("catalog unavailable"))
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolve = done;
          })
      );
    const screen = render(<CommercialProductsRoute />);
    expect(await screen.findByText("catalog unavailable")).toBeTruthy();
    expect(screen.queryByText("No products yet.")).toBeNull();
    fireEvent.changeText(
      screen.getByLabelText("Commercial product name"),
      "Unsaved QA draft"
    );
    expect(screen.getByLabelText("Create commercial product")).toBeDisabled();
    const retry = screen.getByRole("button", { name: "Retry products unavailable" });
    fireEvent.press(retry);
    fireEvent.press(retry);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolve([]);
    });
    expect(screen.getByLabelText("Commercial product name").props.value).toBe(
      "Unsaved QA draft"
    );
    expect(screen.getByText("No products yet.")).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it("retains labeled saved products after refresh failure and clears the notice on retry", async () => {
    const product = { id: "qa-product", name: "QA private draft", status: "draft" };
    mockFetch
      .mockResolvedValueOnce([product])
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([product]);
    const screen = render(<CommercialProductsRoute />);
    expect(await screen.findByText("QA private draft")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Refresh products" }));
    expect(
      await screen.findByText("Refresh failed. Showing previously loaded products.")
    ).toBeTruthy();
    expect(screen.getByText("QA private draft")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Retry products unavailable" }));
    await act(async () => {});
    expect(
      screen.queryByText("Refresh failed. Showing previously loaded products.")
    ).toBeNull();
    expect(screen.getByText("QA private draft")).toBeTruthy();
  });
});
