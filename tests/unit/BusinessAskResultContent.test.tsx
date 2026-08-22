import React from "react";
import { render } from "@testing-library/react-native";

import type { BusinessAskResult } from "@/api/businessDeskProvider";
import BusinessAskResultContent from "@/features/businessDesk/BusinessAskResultContent";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { testHref: href })
  };
});

function result(overrides: Partial<BusinessAskResult> = {}): BusinessAskResult {
  const citation = {
    id: "S001",
    sourceType: "business_desk_record" as const,
    recordId: "507f191e810c19729de86010",
    parentRecordId: null,
    recordKind: "quote",
    title: "Spring quote",
    version: 3,
    sourceDate: "2026-08-21T12:00:00.000Z",
    dateRange: { from: "2026-07-01", to: "2026-08-22" }
  };
  return {
    type: "business_ask",
    schemaVersion: "business-desk-business-ask-v1",
    resultDigestSha256: "a".repeat(64),
    answer: "Review the open quote.",
    incomplete: false,
    answerCitationIds: [citation.id],
    facts: [],
    calculations: [],
    assumptions: [],
    scenarios: [],
    recommendations: [],
    limitations: [],
    missingInformation: [],
    citations: [citation],
    kpiSnapshot: {
      scope: "in_selected_sources",
      dateRange: { from: "2026-07-01", to: "2026-08-22" },
      selectedSourceCount: 1,
      truncated: false,
      omittedSourceCount: 0,
      metrics: [
        {
          key: "open_quotes",
          count: 1,
          complete: true,
          sourceIds: [citation.id]
        }
      ]
    },
    dateRange: { from: "2026-07-01", to: "2026-08-22" },
    selectedRecordCount: 1,
    truncated: false,
    assistantDraftRecordId: "507f191e810c19729de86011",
    assistantDraftVersion: 1,
    ...overrides
  };
}

describe("Business Ask verified result content", () => {
  it("labels populated KPI counts as scoped and links their exact citations", () => {
    const screen = render(
      <BusinessAskResultContent
        result={result()}
        basePath="/home/commercial/business-desk"
        operationId="507f191e810c19729de86001"
      />
    );
    expect(screen.getByText("KPI snapshot · in selected sources")).toBeTruthy();
    expect(screen.getByText("1 in selected sources")).toBeTruthy();
    const link = screen.getByLabelText(
      "Inspect Open quotes KPI source Spring quote · revision 3"
    );
    expect(link.props.testHref).toBe(
      "/home/commercial/business-desk/source?operationId=507f191e810c19729de86001&citationId=S001"
    );
    expect(screen.getByText(/through 2026-08-22 UTC/i)).toBeTruthy();
  });

  it("does not turn a truncated KPI zero into a real zero", () => {
    const partial = result({
      truncated: true,
      kpiSnapshot: {
        scope: "in_selected_sources",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        selectedSourceCount: 1,
        truncated: true,
        omittedSourceCount: 2,
        metrics: [
          {
            key: "open_quotes",
            count: 0,
            complete: false,
            sourceIds: []
          }
        ]
      }
    });
    const screen = render(
      <BusinessAskResultContent
        result={partial}
        basePath="/home/commercial/business-desk"
        operationId="507f191e810c19729de86001"
      />
    );
    expect(screen.getByText("Unknown · partial sources")).toBeTruthy();
    expect(screen.getByText(/displayed zero is not a real zero/i)).toBeTruthy();
    expect(screen.getByText(/2 additional matching sources were omitted/i)).toBeTruthy();
    expect(screen.queryByText("0 in selected sources")).toBeNull();
  });

  it("labels an empty KPI selection as not a zero", () => {
    const empty = result({
      kpiSnapshot: {
        scope: "in_selected_sources",
        dateRange: { from: "2026-07-01", to: "2026-08-22" },
        selectedSourceCount: 1,
        truncated: false,
        omittedSourceCount: 0,
        metrics: []
      }
    });
    const screen = render(
      <BusinessAskResultContent
        result={empty}
        basePath="/home/commercial/business-desk"
        operationId="507f191e810c19729de86001"
      />
    );
    expect(screen.getByText(/No KPI categories were included.*not a zero/i)).toBeTruthy();
  });
});
