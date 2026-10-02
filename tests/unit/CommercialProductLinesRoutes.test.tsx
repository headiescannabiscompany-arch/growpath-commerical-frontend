import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CommercialProductLinesRoute from "@/app/home/commercial/product-lines";
import CommercialProductLineDetailRoute from "@/app/home/commercial/product-lines/[lineId]";

const mockFetchProductLines = jest.fn();
const mockCreateProductLine = jest.fn();
const mockFetchProductLine = jest.fn();
const mockFetchProducts = jest.fn();
const mockUpdateProductLine = jest.fn();
let mockRouteParams: { lineId?: string } = { lineId: "line-1" };

const savedLine = {
  id: "line-1",
  name: "Living Soil",
  status: "draft",
  publicSummary: "Draft summary",
  description: "Draft description",
  growInterests: ["vegetables"]
};

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
    useLocalSearchParams: () => mockRouteParams
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
    mockRouteParams = { lineId: "line-1" };
    mockFetchProductLines.mockResolvedValue([]);
    mockFetchProductLine.mockResolvedValue(savedLine);
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
    await screen.findByText("No product lines yet.");

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
    await screen.findByText("No product lines yet.");
    fireEvent.changeText(screen.getByLabelText("Product line name"), "Retained Line");
    fireEvent.press(screen.getByLabelText("Create product line"));

    await waitFor(() =>
      expect(screen.getByText("Product line service unavailable")).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByLabelText("Product line name").props.value).toBe("Retained Line");
  });

  it("keeps an unavailable list unknown and preserves the draft through retry", async () => {
    mockFetchProductLines.mockRejectedValueOnce(new Error("Lines unavailable"));
    const screen = render(<CommercialProductLinesRoute />);
    await screen.findByText("Lines unavailable");
    fireEvent.changeText(screen.getByLabelText("Product line name"), "Retained line");
    expect(screen.queryByText("No product lines yet.")).toBeNull();
    expect(screen.getByLabelText("Create product line")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Create product line"));
    expect(mockCreateProductLine).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Retry product lines"));
    await screen.findByText("No product lines yet.");
    expect(screen.getByLabelText("Product line name").props.value).toBe("Retained line");
    expect(screen.getByLabelText("Create product line")).toBeEnabled();
  });

  it("waits for the initial product-line read before allowing creation", async () => {
    let resolveRead!: (value: any[]) => void;
    mockFetchProductLines.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        })
    );
    const screen = render(<CommercialProductLinesRoute />);
    fireEvent.changeText(screen.getByLabelText("Product line name"), "Unsaved line");
    expect(screen.getByLabelText("Create product line")).toBeDisabled();
    expect(screen.queryByText("No product lines yet.")).toBeNull();
    await act(async () => resolveRead([savedLine]));
    expect(screen.getByText("Living Soil")).toBeTruthy();
    expect(screen.getByLabelText("Create product line")).toBeEnabled();
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

  it.each([
    ["null", null],
    ["null envelope", { success: true, productLine: null }],
    ["different record", { ...savedLine, id: "line-2" }],
    ["conflicting ID aliases", { ...savedLine, _id: "line-2" }],
    ["array ID alias", { ...savedLine, id: ["line-1"], _id: "line-1" }]
  ])("keeps a %s response unavailable and read-only", async (_label, response) => {
    mockFetchProductLine.mockResolvedValue(response);
    const screen = render(<CommercialProductLineDetailRoute />);

    await screen.findByText("This product line is unavailable. Open All Lines or retry.");

    expect(screen.queryByLabelText("Save commercial product line detail")).toBeNull();
    expect(
      screen.queryByLabelText("Commercial product line detail public summary")
    ).toBeNull();
    expect(screen.queryByText(/No products are attached/)).toBeNull();
    expect(screen.getByText("All Lines")).toBeTruthy();
    expect(screen.getByText("Storefront")).toBeTruthy();
    expect(screen.getByLabelText("Retry commercial product line")).toBeEnabled();
    expect(mockUpdateProductLine).not.toHaveBeenCalled();
  });

  it.each([404, 403, 503])("keeps a failed %s detail load read-only", async (status) => {
    const apiMessage =
      status === 404
        ? "NOT_FOUND"
        : status === 403
          ? "FORBIDDEN"
          : "Product line could not be loaded";
    mockFetchProductLine.mockRejectedValue(
      Object.assign(new Error(apiMessage), { status, code: apiMessage })
    );
    const screen = render(<CommercialProductLineDetailRoute />);

    await screen.findByText(
      status === 503
        ? apiMessage
        : "This product line is unavailable or you do not have access. Open All Lines or Storefront to continue."
    );
    if (status !== 503) expect(screen.queryByText(apiMessage)).toBeNull();

    expect(screen.queryByLabelText("Save commercial product line detail")).toBeNull();
    expect(screen.queryByText("Update Product Line")).toBeNull();
    expect(screen.getByText("Shared Back /home/commercial/product-lines")).toBeTruthy();
    expect(screen.getByLabelText("Retry commercial product line")).toBeEnabled();
    expect(mockUpdateProductLine).not.toHaveBeenCalled();
  });

  it.each([
    ["null", null],
    ["null envelope", { success: true, productLine: null }],
    ["different record", { ...savedLine, id: "line-2" }],
    ["conflicting ID aliases", { ...savedLine, _id: "line-2" }],
    ["array ID alias", { ...savedLine, id: ["line-1"], _id: "line-1" }]
  ])("retains the draft when a save returns a %s response", async (_label, response) => {
    mockUpdateProductLine.mockResolvedValue(response);
    const screen = render(<CommercialProductLineDetailRoute />);
    await screen.findByDisplayValue("Draft summary");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail public summary"),
      "Retain unverified edits"
    );
    fireEvent.press(screen.getByLabelText("Save commercial product line detail"));

    await screen.findByText(
      "Unable to verify the saved product line. Your edits have been retained."
    );

    expect(screen.getByDisplayValue("Retain unverified edits")).toBeTruthy();
    expect(screen.getByDisplayValue("Draft description")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Living Soil" })).toBeTruthy();
    expect(screen.queryByText("Product line updated.")).toBeNull();
    expect(screen.getByLabelText("Save commercial product line detail")).toBeEnabled();
    expect(mockUpdateProductLine).toHaveBeenCalledTimes(1);
  });

  it("restores the exact stored line after a linked-products load retry", async () => {
    mockFetchProductLine.mockResolvedValue({
      ...savedLine,
      id: undefined,
      _id: "line-1"
    });
    mockFetchProducts.mockRejectedValueOnce(new Error("Linked products unavailable"));
    mockUpdateProductLine.mockImplementation(async (_id, changes) => ({
      ...savedLine,
      ...changes
    }));
    const screen = render(<CommercialProductLineDetailRoute />);

    await screen.findByText("Linked products unavailable");
    expect(screen.queryByLabelText("Save commercial product line detail")).toBeNull();
    fireEvent.press(screen.getByLabelText("Retry commercial product line"));
    await screen.findByDisplayValue("Draft summary");
    fireEvent.changeText(
      screen.getByLabelText("Commercial product line detail public summary"),
      "Recovered summary"
    );
    fireEvent.press(screen.getByLabelText("Save commercial product line detail"));

    await screen.findByText("Product line updated.");
    expect(mockUpdateProductLine).toHaveBeenCalledTimes(1);
    expect(mockUpdateProductLine).toHaveBeenCalledWith(
      "line-1",
      expect.objectContaining({
        publicSummary: "Recovered summary",
        description: "Draft description",
        growInterests: ["vegetables"]
      })
    );
  });

  it("ignores a previous route's late load and loads the newly requested line", async () => {
    let resolveFirstLoad: ((value: any) => void) | undefined;
    mockFetchProductLine
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstLoad = resolve;
          })
      )
      .mockResolvedValueOnce({ ...savedLine, id: "line-2", name: "Second Line" });
    const screen = render(<CommercialProductLineDetailRoute />);
    expect(screen.queryByLabelText("Save commercial product line detail")).toBeNull();

    mockRouteParams = { lineId: "line-2" };
    screen.rerender(<CommercialProductLineDetailRoute />);
    await screen.findByRole("header", { name: "Second Line" });
    await act(async () => resolveFirstLoad?.(savedLine));

    expect(mockFetchProductLine).toHaveBeenCalledWith("line-2");
    expect(screen.getByRole("header", { name: "Second Line" })).toBeTruthy();
    expect(screen.queryByRole("header", { name: "Living Soil" })).toBeNull();
    expect(screen.getByLabelText("Save commercial product line detail")).toBeEnabled();
  });

  it("blocks stale save handlers and prevents a late save from replacing another line", async () => {
    let resolveSave: ((value: any) => void) | undefined;
    let resolveNextLoad: ((value: any) => void) | undefined;
    mockUpdateProductLine.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    const screen = render(<CommercialProductLineDetailRoute />);
    await screen.findByDisplayValue("Draft summary");
    const originalSave = screen.UNSAFE_root.findAll(
      (button: { props: { accessibilityLabel?: string; onPress?: unknown } }) =>
        button.props.accessibilityLabel === "Save commercial product line detail" &&
        typeof button.props.onPress === "function"
    )[0].props.onPress;
    fireEvent.press(screen.getByLabelText("Save commercial product line detail"));

    mockFetchProductLine.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNextLoad = resolve;
        })
    );
    mockRouteParams = { lineId: "line-2" };
    screen.rerender(<CommercialProductLineDetailRoute />);
    expect(screen.queryByLabelText("Save commercial product line detail")).toBeNull();
    await act(async () => {
      await originalSave();
    });
    expect(mockUpdateProductLine).toHaveBeenCalledTimes(1);

    await act(async () =>
      resolveNextLoad?.({
        ...savedLine,
        id: "line-2",
        name: "Second Line",
        publicSummary: "Second summary"
      })
    );
    await act(async () =>
      resolveSave?.({ ...savedLine, publicSummary: "Late first summary" })
    );

    expect(screen.getByRole("header", { name: "Second Line" })).toBeTruthy();
    expect(screen.getByDisplayValue("Second summary")).toBeTruthy();
    expect(screen.queryByText("Product line updated.")).toBeNull();
    await act(async () => {
      await originalSave();
    });
    expect(mockUpdateProductLine).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Save commercial product line detail")).toBeEnabled();
  });
});
