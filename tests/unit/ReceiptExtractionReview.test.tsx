import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import type { ExpenseReceiptExtractionResult } from "@/api/businessDeskProvider";
import ReceiptExtractionReview from "@/features/businessDesk/ReceiptExtractionReview";

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, subtitle, children }: any) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, subtitle),
      children
    );
});

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return ({ accessibilityLabel, label, onChange, value }: any) =>
    React.createElement(TextInput, {
      accessibilityLabel: accessibilityLabel || label,
      onChangeText: onChange,
      value
    });
});

const digest = "a".repeat(64);

function result(
  overrides: Partial<ExpenseReceiptExtractionResult["fields"]> = {},
  itemLines: ExpenseReceiptExtractionResult["itemLines"] = []
): ExpenseReceiptExtractionResult {
  const field = <T,>(value: T) => ({ value, confidenceBasisPoints: 9000 });
  return {
    type: "expense_receipt_extraction",
    schemaVersion: "business-desk-expense-receipt-v1",
    resultDigestSha256: digest,
    fields: {
      merchant: field("Garden Supply"),
      occurredAt: field("2026-08-22"),
      amountMinor: field(1525),
      taxMinor: field(125),
      currency: field("USD"),
      minorUnitDigits: field(2),
      category: field("supplies"),
      paymentMethod: field("card"),
      notes: field("Source note"),
      ...overrides
    },
    itemLines,
    missingFields: [],
    validationErrors: [],
    duplicate: { status: "unique" },
    provenance: {
      sourceAttachmentId: "507f191e810c19729de86012",
      sourceContentSha256: digest,
      provider: "openai",
      model: "configured-model",
      schemaVersion: "business-desk-expense-receipt-v1",
      promptVersion: "receipt-v1",
      extractedAt: "2026-08-22T12:00:02.000Z",
      fieldConfidenceBasisPoints: { merchant: 9000 }
    },
    reviewerChanges: []
  };
}

describe("Receipt extraction review", () => {
  it("stages exact safe-integer money and quantity text without rounding", () => {
    const screen = render(
      <ReceiptExtractionReview
        result={result(
          {
            amountMinor: { value: Number.MAX_SAFE_INTEGER, confidenceBasisPoints: 8000 },
            taxMinor: { value: 1, confidenceBasisPoints: 8000 }
          },
          [
            {
              description: "Bulk material",
              quantityMicros: Number.MAX_SAFE_INTEGER,
              unitAmountMinor: 1,
              lineTotalMinor: 1,
              category: "materials",
              confidenceBasisPoints: 7000
            }
          ]
        )}
        selectedRecordVersion={4}
        initialRecordTitle="August receipt"
        applicable
        applying={false}
        onApply={jest.fn()}
      />
    );

    expect(screen.getByLabelText("Extracted full amount").props.value).toBe(
      "90071992547409.91"
    );
    expect(screen.getByLabelText("Extracted tax shown").props.value).toBe("0.01");
    expect(screen.getByLabelText("Extracted item 1 quantity").props.value).toBe(
      "9007199254.740991"
    );
  });

  it("requires explicit Apply and returns reviewed title and notes with exact values", () => {
    const onApply = jest.fn();
    const screen = render(
      <ReceiptExtractionReview
        result={result()}
        selectedRecordVersion={4}
        initialRecordTitle="August receipt"
        applicable
        applying={false}
        onApply={onApply}
      />
    );
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.changeText(
      screen.getByLabelText("Reviewed expense title"),
      "Reviewed August receipt"
    );
    fireEvent.changeText(
      screen.getByLabelText("Reviewer notes"),
      "Matched the protected PDF."
    );
    fireEvent.press(
      screen.getByLabelText("Apply reviewed receipt extraction as a new expense revision")
    );

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Reviewed August receipt",
        amountMinor: 1525,
        taxMinor: 125,
        reviewNotes: "Matched the protected PDF."
      })
    );
  });

  it("keeps a missing provider date staged until the reviewer supplies it", () => {
    const onApply = jest.fn();
    const screen = render(
      <ReceiptExtractionReview
        result={result({
          occurredAt: { value: null, confidenceBasisPoints: 0 }
        })}
        selectedRecordVersion={4}
        initialRecordTitle="August receipt"
        applicable
        applying={false}
        onApply={onApply}
      />
    );

    expect(screen.getByLabelText("Reviewed extracted expense date").props.value).toBe("");
    fireEvent.press(
      screen.getByLabelText("Apply reviewed receipt extraction as a new expense revision")
    );
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText("Review and choose the expense date.")).toBeTruthy();

    fireEvent.changeText(
      screen.getByLabelText("Reviewed extracted expense date"),
      "2026-08-21"
    );
    fireEvent.press(
      screen.getByLabelText("Apply reviewed receipt extraction as a new expense revision")
    );
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ occurredAt: "2026-08-21" })
    );
  });

  it("disables Apply when the result is not bound to the selected READY source", () => {
    const screen = render(
      <ReceiptExtractionReview
        result={result()}
        selectedRecordVersion={4}
        initialRecordTitle="August receipt"
        applicable={false}
        applying={false}
        onApply={jest.fn()}
      />
    );
    expect(
      screen.getByLabelText("Apply reviewed receipt extraction as a new expense revision")
        .props.accessibilityState.disabled
    ).toBe(true);
  });
});
