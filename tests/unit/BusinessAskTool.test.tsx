import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { getBusinessAskAttestation, startBusinessAsk } from "@/api/businessDeskProvider";
import BusinessAskTool from "@/features/businessDesk/BusinessAskTool";
import {
  useBusinessDeskProviderCapabilities,
  useBusinessDeskProviderOperation
} from "@/features/businessDesk/useBusinessDeskProviderOperation";

jest.mock("@/api/businessDeskProvider", () => {
  const actual = jest.requireActual("@/api/businessDeskProvider");
  return {
    ...actual,
    getBusinessAskAttestation: jest.fn(),
    startBusinessAsk: jest.fn()
  };
});

jest.mock("@/features/businessDesk/useBusinessDeskProviderOperation", () => ({
  useBusinessDeskProviderCapabilities: jest.fn(),
  useBusinessDeskProviderOperation: jest.fn()
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { testHref: href })
  };
});

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ header, children }: any) => React.createElement(View, null, header, children);
});

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

const mockStartBusinessAsk = startBusinessAsk as jest.MockedFunction<
  typeof startBusinessAsk
>;
const mockGetAttestation = getBusinessAskAttestation as jest.MockedFunction<
  typeof getBusinessAskAttestation
>;
const mockCapabilities = useBusinessDeskProviderCapabilities as jest.Mock;
const mockProviderOperation = useBusinessDeskProviderOperation as jest.Mock;

const digest = "a".repeat(64);
const timestamps = {
  createdAt: "2026-08-22T12:00:00.000Z",
  updatedAt: "2026-08-22T12:00:02.000Z",
  queuedAt: "2026-08-22T12:00:00.000Z",
  processingAt: "2026-08-22T12:00:01.000Z",
  completedAt: "2026-08-22T12:00:02.000Z",
  cancelledAt: null
};

function resultOperation(incomplete = false) {
  const result = {
    type: "business_ask" as const,
    schemaVersion: "business-desk-business-ask-v1" as const,
    resultDigestSha256: digest,
    answer: incomplete
      ? "The authorized records are insufficient to answer this question."
      : "The Spring quote needs a reviewed next step.",
    incomplete,
    answerCitationIds: incomplete ? [] : ["citation-1"],
    facts: incomplete
      ? []
      : [{ statement: "One quote is open.", citationIds: ["citation-1"] }],
    calculations: incomplete
      ? []
      : [
          {
            statement: "The quote is 25% above the recorded cost.",
            formula: "(quote - cost) / cost",
            inputs: ["quote", "cost"],
            citationIds: ["citation-1"],
            incomplete: false,
            verification: "provider_unverified" as const,
            requiresReview: true as const
          }
        ],
    assumptions: [],
    scenarios: [],
    recommendations: incomplete
      ? []
      : [
          {
            statement: "Review the quote with its owner.",
            citationIds: ["citation-1"],
            requiresReview: true as const
          }
        ],
    limitations: ["Only the selected date range was considered."],
    missingInformation: ["The next-contact date is missing."],
    citations: incomplete
      ? []
      : [
          {
            id: "citation-1",
            sourceType: "business_desk_record" as const,
            recordId: "507f191e810c19729de86010",
            parentRecordId: null,
            recordKind: "quote",
            title: "Spring quote",
            version: 3,
            sourceDate: "2026-08-21T12:00:00.000Z",
            dateRange: { from: "2026-07-01", to: "2026-08-22" }
          }
        ],
    dateRange: { from: "2026-07-01", to: "2026-08-22" },
    selectedRecordCount: incomplete ? 0 : 1,
    truncated: false,
    assistantDraftRecordId: "507f191e810c19729de86011",
    assistantDraftVersion: 1
  };
  return {
    id: "operation-1",
    kind: "business_ask" as const,
    state: "succeeded" as const,
    version: 2,
    clientOperationKey: "stable-business-ask-key",
    requestDigest: digest,
    cancellable: false,
    timestamps,
    error: null,
    credit: { credits: 1, status: "charged" as const },
    result
  };
}

function capabilityValue() {
  return {
    capabilities: {
      expenseReceiptExtraction: {
        enabled: false,
        requiresReview: true as const,
        creditCost: 1,
        code: "unavailable"
      },
      businessAsk: {
        enabled: true,
        createsDraftOnly: true as const,
        creditCost: 1,
        code: null
      },
      maxAskRecords: 50,
      maxAskDateRangeDays: 366,
      askRecordKinds: [
        "price_margin_scenario",
        "quote",
        "lead",
        "job",
        "expense",
        "vendor_comparison",
        "cash_flow_snapshot"
      ],
      inventorySelection: "explicit_boolean"
    },
    loading: false,
    error: null,
    reload: jest.fn()
  };
}

function operationValue(operation: ReturnType<typeof resultOperation> | null = null) {
  return {
    operation,
    busy: null,
    error: null,
    notice: "",
    start: jest.fn(async (_signature: string, submit: any) =>
      submit("stable-business-ask-key", new AbortController().signal)
    ),
    refresh: jest.fn(),
    cancel: jest.fn(),
    startNewAttempt: jest.fn()
  };
}

function attestationValue() {
  return {
    operationId: "operation-1",
    kind: "business_ask" as const,
    state: "succeeded" as const,
    providerInputDigestSha256: "1".repeat(64),
    sourceManifestDigestSha256: "2".repeat(64),
    resultDigestSha256: digest,
    provider: "openai",
    model: "configured-model",
    schemaVersion: "business-desk-business-ask-v1",
    promptVersion: "business-ask-v1",
    completedAt: "2026-08-22T12:00:02.000Z",
    sources: [
      {
        id: "citation-1",
        sourceType: "business_desk_record" as const,
        recordId: "507f191e810c19729de86010",
        parentRecordId: null,
        recordKind: "quote",
        version: 3,
        sourceDate: "2026-08-21T12:00:00.000Z"
      }
    ]
  };
}

describe("Business Ask UI", () => {
  beforeEach(() => {
    mockStartBusinessAsk.mockReset();
    mockGetAttestation.mockReset().mockResolvedValue(attestationValue());
    mockCapabilities.mockReset().mockReturnValue(capabilityValue());
    mockProviderOperation.mockReset().mockReturnValue(operationValue());
  });

  it("submits one bounded source selection without autonomous action claims", async () => {
    mockStartBusinessAsk.mockResolvedValue({
      operation: resultOperation(),
      idempotentReplay: false
    });
    const screen = render(
      <BusinessAskTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    fireEvent.changeText(
      screen.getByLabelText("Business Ask question"),
      "Which work needs attention?"
    );
    fireEvent.press(screen.getByLabelText("Ask Business Desk AI"));

    await waitFor(() => expect(mockStartBusinessAsk).toHaveBeenCalledTimes(1));
    expect(mockStartBusinessAsk).toHaveBeenCalledWith(
      { workspaceType: "commercial" },
      expect.objectContaining({
        clientOperationKey: "stable-business-ask-key",
        question: "Which work needs attention?",
        recordKinds: [
          "price_margin_scenario",
          "quote",
          "lead",
          "job",
          "expense",
          "vendor_comparison",
          "cash_flow_snapshot"
        ],
        includeInventory: true
      }),
      expect.objectContaining({ signal: expect.any(Object) })
    );
    expect(screen.getByText(/never perform actions/i)).toBeTruthy();
    expect(screen.getByText(/selects sources by their last-updated time/i)).toBeTruthy();
  });

  it("renders cited sections, audit digests, and authorized source-inspector links", async () => {
    mockProviderOperation.mockReturnValue(operationValue(resultOperation()));
    const screen = render(
      <BusinessAskTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await screen.findByText("The Spring quote needs a reviewed next step.")
    ).toBeTruthy();
    expect(screen.getByText("Facts")).toBeTruthy();
    expect(
      screen.getByText(/Provider-unverified calculation · review required/i)
    ).toBeTruthy();
    expect(screen.getByText("Recommendations requiring review")).toBeTruthy();
    expect(screen.getByText("Limitations")).toBeTruthy();
    expect(screen.getByText("Missing information")).toBeTruthy();
    const source = screen.getAllByLabelText(
      "Inspect cited source Spring quote · revision 3"
    )[0];
    expect(source.props.testHref).toBe(
      "/home/commercial/business-desk/source?operationId=operation-1&citationId=citation-1"
    );
    expect(await screen.findByText(/Provider input SHA-256: 1111/i)).toBeTruthy();
    expect(screen.getByText(/Source manifest SHA-256: 2222/i)).toBeTruthy();
  });

  it("prominently distinguishes an attested insufficient answer from a zero", async () => {
    mockGetAttestation.mockResolvedValueOnce({
      ...attestationValue(),
      sources: []
    });
    mockProviderOperation.mockReturnValue(operationValue(resultOperation(true)));
    const screen = render(
      <BusinessAskTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );
    expect(
      await screen.findByText(/explicit incomplete result, not a zero/i)
    ).toBeTruthy();
  });

  it("fails closed when attestation digests do not match the rendered answer", async () => {
    mockGetAttestation.mockResolvedValueOnce({
      ...attestationValue(),
      resultDigestSha256: "f".repeat(64)
    });
    mockProviderOperation.mockReturnValue(operationValue(resultOperation()));
    const screen = render(
      <BusinessAskTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await screen.findByText(/does not match this answer and its cited sources/i)
    ).toBeTruthy();
    expect(screen.queryByText(/Provider input SHA-256:/i)).toBeNull();
    expect(screen.queryByText("The Spring quote needs a reviewed next step.")).toBeNull();
  });

  it("accepts cited sources as a verified subset of a larger selected manifest", async () => {
    const operation = resultOperation();
    operation.result.selectedRecordCount = 3;
    mockProviderOperation.mockReturnValue(operationValue(operation));
    mockGetAttestation.mockResolvedValueOnce({
      ...attestationValue(),
      sources: [
        ...attestationValue().sources,
        {
          id: "inventory-item-1",
          sourceType: "business_inventory_item",
          recordId: "507f191e810c19729de86020",
          parentRecordId: null,
          recordKind: "business_inventory_item",
          version: null,
          sourceDate: "2026-08-21T13:00:00.000Z"
        },
        {
          id: "inventory-lot-1",
          sourceType: "business_inventory_lot",
          recordId: "507f191e810c19729de86021",
          parentRecordId: "507f191e810c19729de86020",
          recordKind: "business_inventory_lot",
          version: null,
          sourceDate: "2026-08-21T13:00:00.000Z"
        }
      ]
    });

    const screen = render(
      <BusinessAskTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await screen.findByText("The Spring quote needs a reviewed next step.")
    ).toBeTruthy();
    expect(screen.getByText(/3 redacted source references attested/i)).toBeTruthy();
  });

  it("withholds the answer when a cited source is missing from the attested manifest", async () => {
    mockProviderOperation.mockReturnValue(operationValue(resultOperation()));
    mockGetAttestation.mockResolvedValueOnce({
      ...attestationValue(),
      sources: [
        {
          ...attestationValue().sources[0],
          recordId: "507f191e810c19729de86099"
        }
      ]
    });
    const screen = render(
      <BusinessAskTool
        workspace={{ workspaceType: "commercial" }}
        workspaceLabel="Commercial"
        basePath="/home/commercial/business-desk"
      />
    );

    expect(
      await screen.findByText(/does not match this answer and its cited sources/i)
    ).toBeTruthy();
    expect(screen.queryByText("The Spring quote needs a reviewed next step.")).toBeNull();
  });

  it("clears question, source choices, and prior applicability on workspace change", async () => {
    const screen = render(
      <BusinessAskTool
        workspace={{ workspaceType: "facility", facilityId: "facility-a" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    fireEvent.changeText(screen.getByLabelText("Business Ask question"), "Private A");
    fireEvent.press(screen.getByLabelText("Include Quotes"));
    expect(screen.getByLabelText("Include Quotes").props.accessibilityState.checked).toBe(
      false
    );

    screen.rerender(
      <BusinessAskTool
        workspace={{ workspaceType: "facility", facilityId: "facility-b" }}
        workspaceLabel="Facility"
        basePath="/home/facility/business-desk"
      />
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Business Ask question").props.value).toBe("")
    );
    expect(screen.getByLabelText("Include Quotes").props.accessibilityState.checked).toBe(
      true
    );
  });
});
