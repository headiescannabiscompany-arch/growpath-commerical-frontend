import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import StorefrontProductImportRoute from "@/app/home/commercial/products/import";

const mockGetDocumentAsync = jest.fn();
const mockPreviewStorefrontImport = jest.fn();
const mockApplyStorefrontImport = jest.fn();
const mockUploadCourseMedia = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockGetDocumentAsync(...args)
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockRouterPush })
}));

jest.mock("@/api/storefrontImports", () => ({
  previewStorefrontImport: (...args: any[]) => mockPreviewStorefrontImport(...args),
  applyStorefrontImport: (...args: any[]) => mockApplyStorefrontImport(...args)
}));

jest.mock("@/api/uploads", () => ({
  uploadCourseMedia: (...args: any[]) => mockUploadCourseMedia(...args)
}));

jest.mock("@/components/layout/AppPage", () => {
  const ReactModule = require("react");
  const { View } = require("react-native");
  return function MockAppPage({ header, children }: any) {
    return ReactModule.createElement(View, null, header, children);
  };
});

jest.mock("@/components/layout/AppCard", () => {
  const ReactModule = require("react");
  const { View } = require("react-native");
  return function MockAppCard({ children }: any) {
    return ReactModule.createElement(View, null, children);
  };
});

const readyBatch = {
  id: "batch-1",
  rows: [
    {
      sourceRow: 2,
      action: "create",
      errors: [],
      warnings: [],
      draft: {
        name: "Field Blend",
        sku: "FIELD-1",
        priceCents: 1299,
        currency: "usd"
      }
    }
  ]
};

describe("Commercial product catalog import", () => {
  beforeEach(() => {
    mockGetDocumentAsync.mockReset();
    mockPreviewStorefrontImport.mockReset();
    mockApplyStorefrontImport.mockReset();
    mockUploadCourseMedia.mockReset();
    mockRouterPush.mockReset();
  });

  it("prevents duplicate previews, locks the editor, and reports the completed draft review", async () => {
    let resolvePreview: ((value: typeof readyBatch) => void) | undefined;
    mockPreviewStorefrontImport.mockReturnValue(
      new Promise<typeof readyBatch>((resolve) => {
        resolvePreview = resolve;
      })
    );
    const screen = render(<StorefrontProductImportRoute />);
    const csvInput = screen.getByLabelText("Paste storefront CSV");

    fireEvent.changeText(csvInput, "name,sku,price\nField Blend,FIELD-1,12.99");
    const previewAction = screen.getByText("Preview Import");
    fireEvent.press(previewAction);
    fireEvent.press(previewAction);

    expect(mockPreviewStorefrontImport).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Preparing CSV preview in progress")).toBeTruthy();
    expect(screen.getByLabelText("Paste storefront CSV").props.editable).toBe(false);

    resolvePreview?.(readyBatch);

    await waitFor(() =>
      expect(
        screen.getByText("Prepared 1 rows for review. Nothing has been published.")
      ).toBeTruthy()
    );
    expect(screen.getByText("Field Blend")).toBeTruthy();
    expect(screen.getByLabelText("Paste storefront CSV").props.editable).toBe(true);
  });

  it("uses an in-page mobile CSV fallback instead of a native-only alert", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ name: "mobile-products.csv", uri: "file://mobile-products.csv" }]
    });
    const screen = render(<StorefrontProductImportRoute />);

    fireEvent.press(screen.getByText("Choose CSV File"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "This device cannot read that selected file directly yet. Paste its CSV text below, then choose Preview Import."
        )
      ).toBeTruthy()
    );
    expect(mockPreviewStorefrontImport).not.toHaveBeenCalled();
  });

  it("rejects PDF extraction when upload returns no protected source URL", async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ name: "catalog.pdf", uri: "file://catalog.pdf" }]
    });
    mockUploadCourseMedia.mockResolvedValue({});
    const screen = render(<StorefrontProductImportRoute />);

    fireEvent.press(screen.getByText("Choose PDF Catalog"));

    await waitFor(() =>
      expect(
        screen.getByText("The PDF uploaded, but no protected file URL was returned.")
      ).toBeTruthy()
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(mockPreviewStorefrontImport).not.toHaveBeenCalled();
  });

  it("creates selected products once and keeps them explicitly draft-only", async () => {
    mockPreviewStorefrontImport.mockResolvedValue(readyBatch);
    let resolveApply: ((value: any) => void) | undefined;
    mockApplyStorefrontImport.mockReturnValue(
      new Promise((resolve) => {
        resolveApply = resolve;
      })
    );
    const screen = render(<StorefrontProductImportRoute />);

    fireEvent.changeText(
      screen.getByLabelText("Paste storefront CSV"),
      "name,sku,price\nField Blend,FIELD-1,12.99"
    );
    fireEvent.press(screen.getByText("Preview Import"));
    await screen.findByText("Field Blend");

    const applyAction = screen.getByText("Create Selected Drafts");
    fireEvent.press(applyAction);
    fireEvent.press(applyAction);

    expect(mockApplyStorefrontImport).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Creating selected draft products in progress")
    ).toBeTruthy();

    resolveApply?.({ importBatch: readyBatch, products: [{ id: "product-1" }] });
    await waitFor(() =>
      expect(
        screen.getByText(
          "Created or updated 1 draft products. Review them before publishing."
        )
      ).toBeTruthy()
    );
  });
});
