import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import CommercialProductDetailRoute from "@/app/home/commercial/products/[productId]";

const mockFetch = jest.fn();
const mockUpdate = jest.fn();
let mockProductId = "qa-one";
jest.mock("@/api/products", () => ({
  fetchProduct: (...args: any[]) => mockFetch(...args),
  fetchProductEffectiveness: async () => ({ summary: {}, linked: {} }),
  updateProduct: (...args: any[]) => mockUpdate(...args)
}));
jest.mock("@/api/commercialWorkflows", () => ({ fetchProductLines: async () => [] }));
jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => ({ productId: mockProductId })
}));
jest.mock("@/components/commercial/CommercialContextualTools", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockTools() {
    return React.createElement(Text, null, "Record-specific tools");
  };
});
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
const saved = { id: "qa-one", name: "QA saved product", status: "draft", price: 10 };

describe("Commercial product detail readiness", () => {
  beforeEach(() => {
    mockProductId = "qa-one";
    mockFetch.mockReset();
    mockUpdate.mockReset();
  });
  it("withholds blank editing, publication, and contextual tools until the saved record loads", async () => {
    let resolve!: (value: any) => void;
    mockFetch.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const screen = render(<CommercialProductDetailRoute />);
    expect(screen.getByText("Loading product...")).toBeTruthy();
    expect(screen.queryByLabelText("Save commercial product detail")).toBeNull();
    expect(screen.queryByLabelText("Publish commercial product")).toBeNull();
    expect(screen.queryByText("Record-specific tools")).toBeNull();
    expect(screen.queryByText("Private draft")).toBeNull();
    await act(async () => {
      resolve(saved);
    });
    expect(screen.getByLabelText("Save commercial product detail")).toBeEnabled();
    expect(screen.getByLabelText("Commercial product detail price").props.value).toBe(
      "10"
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it("offers a single-flight read-only retry after initial failure", async () => {
    let resolve!: (value: any) => void;
    mockFetch.mockRejectedValueOnce(new Error("offline")).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const screen = render(<CommercialProductDetailRoute />);
    await screen.findByText("offline");
    expect(screen.queryByLabelText("Save commercial product detail")).toBeNull();
    const retry = screen.getByRole("button", { name: "Retry product unavailable" });
    fireEvent.press(retry);
    fireEvent.press(retry);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolve(saved);
    });
    expect(screen.getByLabelText("Save commercial product detail")).toBeEnabled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
  it.each([null, {}, { id: "wrong" }, { id: "qa-one", _id: "wrong" }])(
    "keeps invalid or wrong records read-only: %j",
    async (record) => {
      mockFetch.mockResolvedValue(record);
      const screen = render(<CommercialProductDetailRoute />);
      await screen.findAllByText("Product unavailable");
      expect(screen.queryByLabelText("Save commercial product detail")).toBeNull();
      expect(screen.queryByText("Record-specific tools")).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    }
  );
  it("ignores a previous product's late response after navigation", async () => {
    let finishOld!: (value: any) => void;
    let finishNew!: (value: any) => void;
    mockFetch
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            finishOld = done;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            finishNew = done;
          })
      );
    const screen = render(<CommercialProductDetailRoute />);
    mockProductId = "qa-two";
    screen.rerender(<CommercialProductDetailRoute />);
    await act(async () => {
      finishOld(saved);
    });
    expect(screen.queryByLabelText("Save commercial product detail")).toBeNull();
    await act(async () => {
      finishNew({ id: "qa-two", name: "QA second product", status: "draft", price: 25 });
    });
    expect(screen.getByLabelText("Commercial product detail price").props.value).toBe(
      "25"
    );
    expect(screen.queryByText("QA saved product")).toBeNull();
  });
});
