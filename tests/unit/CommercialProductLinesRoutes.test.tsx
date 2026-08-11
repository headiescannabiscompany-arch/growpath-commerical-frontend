import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialProductLinesRoute from "@/app/home/commercial/product-lines";
import CommercialProductLineDetailRoute from "@/app/home/commercial/product-lines/[lineId]";

const mockFetchProductLines = jest.fn();
const mockCreateProductLine = jest.fn();
const mockFetchProductLine = jest.fn();
const mockFetchProducts = jest.fn();
const mockUpdateProductLine = jest.fn();

jest.mock("@/api/commercialWorkflows", () => ({
  fetchProductLines: (...args: any[]) => mockFetchProductLines(...args),
  createProductLine: (...args: any[]) => mockCreateProductLine(...args),
  fetchProductLine: (...args: any[]) => mockFetchProductLine(...args),
  fetchProducts: (...args: any[]) => mockFetchProducts(...args),
  updateProductLine: (...args: any[]) => mockUpdateProductLine(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) =>
      React.cloneElement(React.Children.only(children), { href }),
    useLocalSearchParams: () => ({ lineId: "line-1" })
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ children, header, backFallbackHref, routeKey }: any) =>
    React.createElement(
      View,
      { accessibilityLabel: `app-page-${routeKey}` },
      React.createElement(Text, null, `Shared Back ${backFallbackHref}`),
      header,
      children
    );
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

describe("Commercial product line routes", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFetchProductLines.mockResolvedValue([]);
    mockFetchProductLine.mockResolvedValue({
      id: "line-1",
      name: "Living Soil",
      status: "draft",
      publicSummary: "Draft summary",
      description: "Draft description",
      growInterests: ["vegetables"]
    });
    mockFetchProducts.mockResolvedValue([]);
  });

  it("creates a product line once, locks the draft, and announces progress", async () => {
    let resolveCreate: ((value: any) => void) | undefined;
    mockCreateProductLine.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );
    const screen = render(<CommercialProductLinesRoute />);

    expect(screen.getByText("Shared Back /home/commercial/storefront")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Product line name"), "Living Soil");
    const createAction = screen.getByLabelText("Create product line");

    fireEvent.press(createAction);
    fireEvent.press(createAction);

    expect(mockCreateProductLine).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Creating product line in progress")).toBeTruthy();
    expect(screen.getByLabelText("Product line name").props.editable).toBe(false);

    resolveCreate?.({ id: "line-2", name: "Living Soil", status: "draft" });
    await waitFor(() => expect(screen.getByText("Product line created.")).toBeTruthy());
  });

  it("retains the product-line draft and reports a create failure in page", async () => {
    mockCreateProductLine.mockRejectedValue(
      new Error("Product line service unavailable")
    );
    const screen = render(<CommercialProductLinesRoute />);
    fireEvent.changeText(screen.getByLabelText("Product line name"), "Retained Line");
    fireEvent.press(screen.getByLabelText("Create product line"));

    await waitFor(() =>
      expect(screen.getByText("Product line service unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Product line name").props.value).toBe("Retained Line");
  });

  it("saves product-line details once and locks the form while saving", async () => {
    let resolveSave: ((value: any) => void) | undefined;
    mockUpdateProductLine.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const screen = render(<CommercialProductLineDetailRoute />);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Commercial product line detail public summary")
      ).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail public summary"),
      "Updated summary"
    );
    const saveAction = screen.getByLabelText("Save commercial product line detail");

    fireEvent.press(saveAction);
    fireEvent.press(saveAction);

    expect(mockUpdateProductLine).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Saving commercial product line in progress")
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial product line detail public summary").props
        .editable
    ).toBe(false);

    resolveSave?.({
      id: "line-1",
      name: "Living Soil",
      status: "draft",
      publicSummary: "Updated summary",
      growInterests: ["vegetables"]
    });
    await waitFor(() => expect(screen.getByText("Product line updated.")).toBeTruthy());
  });

  it("retains edited details and reports a save failure in page", async () => {
    mockUpdateProductLine.mockRejectedValue(new Error("Product line update failed"));
    const screen = render(<CommercialProductLineDetailRoute />);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Commercial product line detail public summary")
      ).toBeTruthy()
    );
    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail public summary"),
      "Keep this summary"
    );
    fireEvent.press(screen.getByLabelText("Save commercial product line detail"));

    await waitFor(() =>
      expect(screen.getByText("Product line update failed")).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByLabelText("Commercial product line detail public summary").props.value
    ).toBe("Keep this summary");
  });
});
