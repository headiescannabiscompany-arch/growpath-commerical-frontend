import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { BusinessInventoryImportPanel } from "@/components/inventory/BusinessInventoryImportPanel";

const mockApplyImport = jest.fn();
const mockGetImport = jest.fn();
const mockPickCsv = jest.fn();
const mockReadAsStringAsync = jest.fn();
const mockPreviewImport = jest.fn();
const mockReviewImport = jest.fn();
const mockWithdrawImport = jest.fn();

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockPickCsv(...args)
}));

jest.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: (...args: any[]) => mockReadAsStringAsync(...args)
}));

jest.mock("@/api/businessInventory", () => ({
  applyBusinessInventoryImport: (...args: any[]) => mockApplyImport(...args),
  getBusinessInventoryImport: (...args: any[]) => mockGetImport(...args),
  previewBusinessInventoryImport: (...args: any[]) => mockPreviewImport(...args),
  reviewBusinessInventoryImport: (...args: any[]) => mockReviewImport(...args),
  withdrawBusinessInventoryImport: (...args: any[]) => mockWithdrawImport(...args)
}));

const palette = {
  accent: "#198754",
  accentSoft: "#dff5e8",
  accentText: "#ffffff",
  border: "#cad5cf",
  danger: "#b42318",
  link: "#146c43",
  page: "#f7faf8",
  success: "#15803d",
  surface: "#ffffff",
  surfaceMuted: "#f0f4f1",
  surfaceStrong: "#e8efea",
  text: "#17231c",
  textMuted: "#5f6f65",
  textSoft: "#3d4d43",
  warning: "#9a6700"
};

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette })
}));

const previewRecord = {
  id: "import-1",
  sourceName: "supplier.csv",
  sourceDigest: "digest-1",
  status: "preview" as const,
  rowSummary: {
    total: 2,
    existingSkuConflicts: [{ sku: "SOIL-1", name: "Living Soil" }]
  }
};

const reviewedRecord = {
  ...previewRecord,
  status: "conflict" as const
};

const defaultMapping = {
  sku: "sku",
  name: "name",
  quantity: "quantity",
  unit: "unit",
  reorderPoint: "reorderPoint",
  category: "category",
  vendor: "vendor",
  locationId: "locationId",
  authorizedUnitCost: "authorizedUnitCost",
  currency: "currency",
  sourceFreshnessAt: "sourceFreshnessAt",
  lotCode: "lotCode",
  batchCode: "batchCode",
  receivedAt: "receivedAt",
  expiresAt: "expiresAt"
};

const requiredOnlyMapping = {
  sku: "sku",
  name: "name",
  quantity: "quantity",
  unit: "",
  reorderPoint: "",
  category: "",
  vendor: "",
  locationId: "",
  authorizedUnitCost: "",
  currency: "",
  sourceFreshnessAt: "",
  lotCode: "",
  batchCode: "",
  receivedAt: "",
  expiresAt: ""
};

const requiredWithUnitMapping = { ...requiredOnlyMapping, unit: "unit" };

function renderPanel(canWrite = true) {
  const onApplied = jest.fn().mockResolvedValue(undefined);
  const screen = render(
    <BusinessInventoryImportPanel
      canWrite={canWrite}
      onApplied={onApplied}
      workspace={{ facilityId: "facility-1" }}
    />
  );
  return { onApplied, screen };
}

describe("BusinessInventoryImportPanel", () => {
  beforeEach(() => {
    mockApplyImport.mockReset();
    mockGetImport.mockReset();
    mockPickCsv.mockReset();
    mockReadAsStringAsync.mockReset();
    mockPreviewImport.mockReset();
    mockReviewImport.mockReset();
    mockWithdrawImport.mockReset();
  });

  it("exposes an explicit read-only state without import actions", () => {
    const { screen } = renderPanel(false);

    expect(
      screen.getByLabelText("Inventory CSV import").props.accessibilityState
    ).toEqual({ expanded: false, disabled: true });
    expect(
      screen.getByText("Your role can view inventory but cannot import it.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Choose inventory CSV file")).toBeNull();
    expect(screen.queryByLabelText("Paste inventory CSV")).toBeNull();
  });

  it("requires preview and reviewed conflict choices before apply", async () => {
    mockPreviewImport.mockResolvedValue(previewRecord);
    mockReviewImport.mockResolvedValue(reviewedRecord);
    mockApplyImport.mockResolvedValue({
      import: {
        ...reviewedRecord,
        status: "applied",
        rowSummary: { ...reviewedRecord.rowSummary, applied: 2 }
      }
    });
    const { onApplied, screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Inventory import source name"),
      " supplier.csv "
    );
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity,unit\nSOIL-1,Living Soil,4,bag\nKELP-1,Kelp Meal,2,lb"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() => expect(mockPreviewImport).toHaveBeenCalledTimes(1));
    expect(mockPreviewImport).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      {
        sourceName: "supplier.csv",
        rows: [
          { sku: "SOIL-1", name: "Living Soil", quantity: "4", unit: "bag" },
          { sku: "KELP-1", name: "Kelp Meal", quantity: "2", unit: "lb" }
        ],
        mapping: requiredWithUnitMapping
      }
    );
    expect(screen.getByText("2 rows · 1 existing SKU conflicts")).toBeTruthy();
    expect(screen.getByText("Conflict: SOIL-1 · Living Soil")).toBeTruthy();
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);

    fireEvent.press(screen.getByRole("radio", { name: "Update existing fields" }));
    fireEvent.press(screen.getByRole("radio", { name: "On-hand snapshot" }));
    fireEvent.press(screen.getByLabelText("Confirm inventory import review"));

    await waitFor(() => expect(mockReviewImport).toHaveBeenCalledTimes(1));
    expect(mockReviewImport).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      previewRecord,
      {
        conflictPolicy: "update_fields",
        quantityMode: "set_on_hand",
        mapping: requiredWithUnitMapping
      }
    );
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(false);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Confirm inventory import review").props.accessibilityState
          .busy
      ).toBe(false)
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Apply reviewed inventory import"));
    });
    await waitFor(() => expect(mockApplyImport).toHaveBeenCalledTimes(1));
    expect(mockApplyImport).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      reviewedRecord
    );
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText("Applied 2 inventory rows with audited, retry-safe movements.")
    ).toBeTruthy();
    expect(screen.getByText("Import status: applied")).toBeTruthy();
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(screen.queryByLabelText("Withdraw reviewed inventory import")).toBeNull();
  });

  it("leaves absent optional columns blank in the preview mapping", async () => {
    mockPreviewImport.mockResolvedValue(previewRecord);
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil,4"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() => expect(mockPreviewImport).toHaveBeenCalledTimes(1));
    expect(mockPreviewImport.mock.calls[0][1].mapping).toEqual(requiredOnlyMapping);
    expect(screen.getByLabelText("Inventory import unit column").props.value).toBe("");
    expect(
      screen.getByLabelText("Inventory import authorizedUnitCost column").props.value
    ).toBe("");
    expect(screen.getByLabelText("Inventory import expiresAt column").props.value).toBe(
      ""
    );
  });

  it("refetches a failed apply and requires a fresh saved review before retry", async () => {
    const savedReview = {
      ...reviewedRecord,
      reviewedAt: "2026-08-22T12:00:00.000Z",
      reviewedBy: "user-1",
      reviewedMapping: {
        ...defaultMapping,
        conflictPolicy: "skip_existing",
        quantityMode: "receive"
      }
    };
    const resetAfterFailure = {
      ...savedReview,
      reviewedAt: null,
      reviewedBy: "",
      rowSummary: { total: 2, requiresReview: true }
    };
    const savedAgain = {
      ...savedReview,
      reviewedAt: "2026-08-22T12:05:00.000Z",
      rowSummary: { total: 2, requiresReview: false }
    };
    const applied = {
      ...savedAgain,
      status: "applied" as const,
      rowSummary: { ...savedAgain.rowSummary, applied: 2 }
    };
    mockPreviewImport.mockResolvedValue(previewRecord);
    mockReviewImport.mockResolvedValueOnce(savedReview).mockResolvedValueOnce(savedAgain);
    mockApplyImport
      .mockRejectedValueOnce(new Error("Apply connection interrupted"))
      .mockResolvedValueOnce({ import: applied });
    mockGetImport.mockResolvedValueOnce(resetAfterFailure);
    const { onApplied, screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil,4\nKELP-1,Kelp Meal,2"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));
    await waitFor(() => expect(mockPreviewImport).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Confirm inventory import review"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
          .disabled
      ).toBe(false)
    );

    fireEvent.press(screen.getByLabelText("Apply reviewed inventory import"));
    await waitFor(() => expect(mockGetImport).toHaveBeenCalledTimes(1));
    expect(mockGetImport).toHaveBeenCalledWith({ facilityId: "facility-1" }, "import-1");
    expect(screen.getByRole("alert")).toHaveTextContent("Apply connection interrupted");
    expect(
      screen.getByText(
        "The apply attempt stopped. Review the current import state again before retrying."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Review required: confirm the current mapping and quantity choices again before applying."
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);

    fireEvent.press(screen.getByLabelText("Confirm inventory import review"));
    await waitFor(() => expect(mockReviewImport).toHaveBeenCalledTimes(2));
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(false);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
          .busy
      ).toBe(false)
    );
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Apply reviewed inventory import"));
    });
    await waitFor(() => expect(mockApplyImport).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Import status: applied")).toBeTruthy();
  });

  it("preserves applied truth after an interrupted apply response", async () => {
    const savedReview = {
      ...reviewedRecord,
      reviewedAt: "2026-08-22T12:00:00.000Z",
      reviewedMapping: {
        ...defaultMapping,
        conflictPolicy: "skip_existing",
        quantityMode: "receive"
      }
    };
    const applied = {
      ...savedReview,
      status: "applied" as const,
      appliedAt: "2026-08-22T12:01:00.000Z",
      rowSummary: { total: 2, applied: 2 }
    };
    mockPreviewImport.mockResolvedValue(previewRecord);
    mockReviewImport.mockResolvedValue(savedReview);
    mockApplyImport.mockRejectedValue(new Error("Response interrupted"));
    mockGetImport.mockResolvedValue(applied);
    const { onApplied, screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil,4\nKELP-1,Kelp Meal,2"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));
    await waitFor(() => expect(mockPreviewImport).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByLabelText("Confirm inventory import review"));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
          .disabled
      ).toBe(false)
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
          .busy
      ).toBe(false)
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Apply reviewed inventory import"));
    });
    await waitFor(() => expect(mockGetImport).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Import status: applied at/)).toBeTruthy();
    expect(
      screen.getByText(
        "The import was applied even though its first response was interrupted. Its applied state and audit evidence were preserved."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);
  });

  it("infers the extended reviewed mapping without changing canonical field keys", async () => {
    mockPreviewImport.mockResolvedValue({
      ...previewRecord,
      detectedColumns: [
        "SKU",
        "Description",
        "Qty",
        "UOM",
        "Min Stock",
        "Item Category",
        "Supplier Name",
        "Shelf",
        "Unit Cost",
        "Currency Code",
        "Source As Of",
        "Lot Number",
        "Batch Number",
        "Date Received",
        "Expiry Date"
      ]
    });
    const { screen } = renderPanel();
    const csv =
      "SKU,Description,Qty,UOM,Min Stock,Item Category,Supplier Name,Shelf,Unit Cost,Currency Code,Source As Of,Lot Number,Batch Number,Date Received,Expiry Date\nSOIL-1,Living Soil,4,bag,1,soil,Vendor A,Shelf A,12.50,USD,2026-08-01,LOT-1,BATCH-1,2026-08-02,2027-08-02";

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(screen.getByLabelText("Paste inventory CSV"), csv);
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() => expect(mockPreviewImport).toHaveBeenCalledTimes(1));
    expect(mockPreviewImport.mock.calls[0][1].mapping).toEqual({
      sku: "SKU",
      name: "Description",
      quantity: "Qty",
      unit: "UOM",
      reorderPoint: "Min Stock",
      category: "Item Category",
      vendor: "Supplier Name",
      locationId: "Shelf",
      authorizedUnitCost: "Unit Cost",
      currency: "Currency Code",
      sourceFreshnessAt: "Source As Of",
      lotCode: "Lot Number",
      batchCode: "Batch Number",
      receivedAt: "Date Received",
      expiresAt: "Expiry Date"
    });
    expect(
      screen.getByLabelText("Inventory import authorizedUnitCost column").props.value
    ).toBe("Unit Cost");
    expect(
      screen.getByLabelText("Inventory import sourceFreshnessAt column").props.value
    ).toBe("Source As Of");
  });

  it("resumes an existing reviewed duplicate and can withdraw it without applying", async () => {
    const duplicateError = {
      code: "HTTP_ERROR",
      data: {
        error: {
          code: "DUPLICATE_IMPORT",
          importId: "import-1",
          status: "conflict"
        }
      },
      message: "This exact source already has an import review."
    };
    const resumed = {
      ...reviewedRecord,
      reviewedAt: "2026-08-22T12:00:00.000Z",
      detectedColumns: ["SKU", "Name", "Qty"],
      reviewedMapping: {
        ...defaultMapping,
        sku: "SKU",
        name: "Name",
        quantity: "Qty",
        conflictPolicy: "update_fields",
        quantityMode: "set_on_hand"
      }
    };
    mockPreviewImport.mockRejectedValue(duplicateError);
    mockGetImport.mockResolvedValue(resumed);
    mockWithdrawImport.mockResolvedValue({ ...resumed, status: "rejected" });
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "SKU,Name,Qty\nSOIL-1,Living Soil,4"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() => expect(mockGetImport).toHaveBeenCalledTimes(1));
    expect(mockGetImport).toHaveBeenCalledWith({ facilityId: "facility-1" }, "import-1");
    expect(
      screen.getByText("Resumed the existing import review for this exact source.")
    ).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: "Update existing fields" }).props
        .accessibilityState.checked
    ).toBe(true);
    expect(
      screen.getByRole("radio", { name: "On-hand snapshot" }).props.accessibilityState
        .checked
    ).toBe(true);
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(false);

    fireEvent.press(screen.getByLabelText("Withdraw reviewed inventory import"));
    await waitFor(() => expect(mockWithdrawImport).toHaveBeenCalledTimes(1));
    expect(mockWithdrawImport).toHaveBeenCalledWith(
      { facilityId: "facility-1" },
      resumed
    );
    expect(screen.getByText("Import status: rejected")).toBeTruthy();
    expect(
      screen.getByText(
        "Reviewed import withdrawn. No inventory rows were applied; the audit record remains."
      )
    ).toBeTruthy();
    expect(mockApplyImport).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Withdraw reviewed inventory import")).toBeNull();
  });

  it("blocks apply for audited location, unit, and closed-lot conflicts", async () => {
    const blockedRecord = {
      ...previewRecord,
      status: "conflict" as const,
      rowSummary: {
        total: 2,
        locationConflicts: [
          {
            row: 2,
            sku: "SOIL-1",
            lotCode: "LOT-9",
            currentLocation: "Shelf A",
            requestedLocation: "Shelf B",
            resolution: "Use an audited move after import."
          }
        ],
        unitConflicts: [
          {
            row: 3,
            sku: "KELP-1",
            currentUnit: "lb",
            requestedUnit: "kg",
            resolution: "Keep the existing unit or create a separate SKU."
          }
        ],
        closedLotConflicts: [
          {
            row: 4,
            sku: "SOIL-2",
            lotCode: "LOT-CLOSED",
            status: "consumed",
            resolution: "Create a new lot for newly received stock."
          }
        ]
      }
    };
    mockPreviewImport.mockResolvedValue(blockedRecord);
    mockReviewImport.mockResolvedValue(blockedRecord);
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil,4\nKELP-1,Kelp Meal,2"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() =>
      expect(
        screen.getByText(
          "Row 2: SOIL-1 / lot LOT-9 is at Shelf A; requested Shelf B. Use an audited move after import."
        )
      ).toBeTruthy()
    );
    expect(
      screen.getByText(
        "Row 3: KELP-1 is recorded in lb; requested kg. Keep the existing unit or create a separate SKU."
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Row 4: SOIL-2 / lot LOT-CLOSED cannot be imported with status consumed. Create a new lot for newly received stock."
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);

    fireEvent.press(screen.getByLabelText("Confirm inventory import review"));
    await waitFor(() => expect(mockReviewImport).toHaveBeenCalledTimes(1));
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(
      screen.getByText(
        "The file still has blocking row problems. Correct it and prepare a new preview."
      )
    ).toBeTruthy();
    expect(mockApplyImport).not.toHaveBeenCalled();
  });

  it("does not treat a raw duplicate preview as a saved review", async () => {
    mockPreviewImport.mockRejectedValue({
      code: "DUPLICATE_IMPORT",
      data: { error: { importId: "import-1", status: "preview" } }
    });
    mockGetImport.mockResolvedValue({
      ...previewRecord,
      reviewedAt: null,
      reviewedMapping: {
        ...defaultMapping,
        conflictPolicy: "skip_existing",
        quantityMode: "receive"
      }
    });
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil,4"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() => expect(mockGetImport).toHaveBeenCalledTimes(1));
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);
  });

  it("preserves an already-applied duplicate without reconstructing cleared rows", async () => {
    mockPreviewImport.mockRejectedValue({
      code: "DUPLICATE_IMPORT",
      data: { error: { importId: "import-1", status: "applied" } }
    });
    mockGetImport.mockResolvedValue({
      ...previewRecord,
      status: "applied",
      appliedAt: "2026-08-22T12:00:00.000Z",
      previewRows: undefined,
      rowSummary: { total: 2, applied: 2 }
    });
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil,4"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() =>
      expect(screen.getByText(/Import status: applied at/)).toBeTruthy()
    );
    expect(
      screen.getByText(
        "This exact source was already applied. Its applied state and audit evidence were preserved."
      )
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Apply reviewed inventory import").props.accessibilityState
        .disabled
    ).toBe(true);
    expect(screen.queryByLabelText("Withdraw reviewed inventory import")).toBeNull();
  });

  it("keeps preview single-flight and locks conflicting fields", async () => {
    let resolvePreview: ((value: unknown) => void) | undefined;
    mockPreviewImport.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePreview = resolve;
        })
    );
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name\nSOIL-1,Living Soil"
    );
    const preview = screen.getByLabelText("Preview inventory import");
    fireEvent.press(preview);
    fireEvent.press(preview);

    expect(mockPreviewImport).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Paste inventory CSV").props.editable).toBe(false);
    expect(
      screen.getByLabelText("Choose inventory CSV file").props.accessibilityState
    ).toEqual({ disabled: true, busy: true });

    await act(async () => {
      resolvePreview?.(previewRecord);
    });
    await waitFor(() =>
      expect(screen.getByText("Prepared 2 rows. Nothing has changed yet.")).toBeTruthy()
    );
  });

  it("reads a native picked CSV from its asset URI and prepares the preview", async () => {
    const csv = "sku,name,quantity\nSOIL-1,Living Soil,4";
    mockPickCsv.mockResolvedValue({
      canceled: false,
      assets: [{ name: "warehouse-export.csv", uri: "file:///warehouse-export.csv" }]
    });
    mockReadAsStringAsync.mockResolvedValue(csv);
    mockPreviewImport.mockResolvedValue(previewRecord);
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.press(screen.getByLabelText("Choose inventory CSV file"));

    await waitFor(() => expect(mockPreviewImport).toHaveBeenCalledTimes(1));
    expect(mockReadAsStringAsync).toHaveBeenCalledWith("file:///warehouse-export.csv");
    expect(screen.getByLabelText("Inventory import source name").props.value).toBe(
      "warehouse-export.csv"
    );
    expect(screen.getByLabelText("Paste inventory CSV").props.value).toBe(csv);
  });

  it("rejects duplicate normalized headers before sending an import preview", async () => {
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "SKU, sku ,name\nONE,TWO,Living Soil"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /duplicate or ambiguous headers: "SKU" and "sku"/i
      )
    );
    expect(mockPreviewImport).not.toHaveBeenCalled();
  });

  it("rejects CSV rows whose width does not match the header", async () => {
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "CSV row 2 has 2 columns; expected 3."
      )
    );
    expect(mockPreviewImport).not.toHaveBeenCalled();
  });

  it("locks import semantics after any rows were applied and reports hidden issues", async () => {
    mockPreviewImport.mockResolvedValue({
      ...previewRecord,
      status: "conflict",
      rowSummary: {
        total: 9,
        applied: 1,
        existingSkuConflicts: Array.from({ length: 7 }, (_, index) => ({
          sku: `SKU-${index}`,
          name: `Item ${index}`
        })),
        invalidRows: Array.from({ length: 8 }, (_, index) => ({
          row: index + 2,
          problems: ["name"]
        })),
        requiresReview: true
      }
    });
    const { screen } = renderPanel();

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(
      screen.getByLabelText("Paste inventory CSV"),
      "sku,name,quantity\nSOIL-1,Living Soil,4"
    );
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() =>
      expect(screen.getByText(/1 rows were already applied/)).toBeTruthy()
    );
    expect(screen.getByLabelText("Inventory import sku column").props.editable).toBe(
      false
    );
    expect(
      screen.getByRole("radio", { name: "Update existing fields" }).props
        .accessibilityState.disabled
    ).toBe(true);
    expect(screen.getByText(/2 more existing SKU conflicts/)).toBeTruthy();
    expect(screen.getByText(/3 more invalid rows/)).toBeTruthy();
  });

  it("reports preview failures in page without clearing source text", async () => {
    mockPreviewImport.mockRejectedValue(new Error("Preview service unavailable"));
    const { screen } = renderPanel();
    const csv = "sku,name\nSOIL-1,Living Soil";

    fireEvent.press(screen.getByLabelText("Inventory CSV import"));
    fireEvent.changeText(screen.getByLabelText("Paste inventory CSV"), csv);
    fireEvent.press(screen.getByLabelText("Preview inventory import"));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Preview service unavailable")
    );
    expect(screen.getByLabelText("Paste inventory CSV").props.value).toBe(csv);
  });
});
