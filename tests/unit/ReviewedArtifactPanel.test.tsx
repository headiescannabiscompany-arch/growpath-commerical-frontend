import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION,
  BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES
} from "@/api/businessDeskArtifacts";
import ReviewedArtifactPanel from "@/features/businessDesk/ReviewedArtifactPanel";

const mockPreview = jest.fn();
const mockPrepare = jest.fn();
const mockHandoff = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

jest.mock("@/api/businessDeskArtifacts", () => ({
  ...jest.requireActual("@/api/businessDeskArtifacts"),
  previewBusinessDeskArtifact: (...args: any[]) => mockPreview(...args),
  prepareBusinessDeskArtifact: (...args: any[]) => mockPrepare(...args)
}));

jest.mock("@/features/businessDesk/reviewedArtifactHandoff", () => ({
  ...jest.requireActual("@/features/businessDesk/reviewedArtifactHandoff"),
  handoffReviewedBusinessDeskArtifact: (...args: any[]) => mockHandoff(...args)
}));

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, subtitle, children }: any) =>
    React.createElement(
      View,
      null,
      title ? React.createElement(Text, null, title) : null,
      subtitle ? React.createElement(Text, null, subtitle) : null,
      children
    );
});

const RECORD_ID = "507f191e810c19729de86020";
const REVISION_ID = "507f191e810c19729de86021";
const CHECKSUM = "a".repeat(64);
const PREVIEW_CONFIRMATION = "b".repeat(64);

function previewFixture(version = 4, content = '"name","value"\r\n"safe","=1+1"') {
  return {
    artifactKind: "job_redacted_csv" as const,
    artifact: {
      mode: "csv" as const,
      contentType: "text/csv; charset=utf-8" as const,
      filename: "job-redacted.csv",
      content,
      projectionVersion: BUSINESS_DESK_ARTIFACT_PROJECTION_VERSION,
      redactionProfile: BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.job_redacted_csv,
      fieldManifest: ["name", "value"],
      checksumSha256: CHECKSUM,
      bytes: content.length,
      rowCount: 2,
      recordCount: 1,
      deliveryStatus: "not_observed" as const
    },
    recordPins: [
      {
        recordId: RECORD_ID,
        revisionId: REVISION_ID,
        recordKind: "job" as const,
        version
      }
    ],
    previewConfirmationSha256: PREVIEW_CONFIRMATION
  };
}

function preparedFixture(preview = previewFixture(), idempotentReplay = false) {
  const { content: _content, ...metadata } = preview.artifact;
  return {
    artifactKind: preview.artifactKind,
    receipt: {
      id: "507f191e810c19729de86022",
      artifactKind: preview.artifactKind,
      exportKind: preview.artifactKind,
      recordPins: preview.recordPins,
      preparedArtifact: metadata,
      actorRelationship: { prepared: true as const },
      createdAt: "2026-08-22T18:00:00.000Z"
    },
    artifact: preview.artifact,
    recordPins: preview.recordPins,
    idempotentReplay
  };
}

function panel(
  overrides: Partial<React.ComponentProps<typeof ReviewedArtifactPanel>> = {}
) {
  return (
    <ReviewedArtifactPanel
      workspace={{ workspaceType: "commercial" }}
      artifactKind="job_redacted_csv"
      revisionSelections={[{ recordId: RECORD_ID, revisionNumber: 4 }]}
      expectedRedactionProfile={
        BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.job_redacted_csv
      }
      title="PII-redacted job CSV"
      selectionLabel="Pinned to saved job revision 4."
      disclosure="Direct customer contact PII and private location are omitted."
      previewButtonLabel="Preview PII-redacted job CSV"
      prepareButtonLabel="Confirm and export redacted job CSV"
      {...overrides}
    />
  );
}

describe("ReviewedArtifactPanel", () => {
  beforeEach(() => {
    mockPreview.mockReset().mockResolvedValue(previewFixture());
    mockPrepare.mockReset().mockResolvedValue(preparedFixture());
    mockHandoff.mockReset().mockResolvedValue({ method: "web-download" });
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  it("requires preview, supports cancel, and clears transient plaintext", async () => {
    const screen = render(panel());
    expect(screen.queryByLabelText("PII-redacted job CSV preview content")).toBeNull();

    fireEvent.press(screen.getByLabelText("Preview PII-redacted job CSV"));
    expect(
      (await screen.findByLabelText("PII-redacted job CSV preview content")).props
        .children
    ).toContain('"safe","=1+1"');
    expect(screen.getByText(`Content checksum: ${CHECKSUM}`)).toBeTruthy();
    expect(
      screen.getByText(`Preview confirmation: ${PREVIEW_CONFIRMATION}`)
    ).toBeTruthy();
    expect(mockPrepare).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Cancel PII-redacted job CSV preview"));
    expect(screen.queryByLabelText("PII-redacted job CSV preview content")).toBeNull();
    expect(
      screen.getByText(/No artifact was prepared, shared, delivered, or accepted/i)
    ).toBeTruthy();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("invalidates a preview when the exact revision selection changes", async () => {
    const screen = render(panel());
    fireEvent.press(screen.getByLabelText("Preview PII-redacted job CSV"));
    await screen.findByLabelText("PII-redacted job CSV preview content");

    screen.rerender(
      panel({
        revisionSelections: [{ recordId: RECORD_ID, revisionNumber: 5 }],
        selectionLabel: "Pinned to saved job revision 5."
      })
    );

    await waitFor(() =>
      expect(screen.queryByLabelText("PII-redacted job CSV preview content")).toBeNull()
    );
    expect(screen.getByText(/prior transient preview was cleared/i)).toBeTruthy();
    expect(screen.queryByLabelText("Confirm and export redacted job CSV")).toBeNull();
  });

  it("reuses the same operation key after an ambiguous prepare failure", async () => {
    mockPrepare
      .mockRejectedValueOnce(new Error("Connection closed after request"))
      .mockResolvedValueOnce(preparedFixture(previewFixture(), true));
    const screen = render(panel());
    fireEvent.press(screen.getByLabelText("Preview PII-redacted job CSV"));
    await screen.findByLabelText("PII-redacted job CSV preview content");

    fireEvent.press(screen.getByLabelText("Confirm and export redacted job CSV"));
    expect(await screen.findByText(/Connection closed after request/i)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Confirm and export redacted job CSV"));

    await waitFor(() => expect(mockPrepare).toHaveBeenCalledTimes(2));
    expect(mockPrepare.mock.calls[1][1].idempotencyKey).toBe(
      mockPrepare.mock.calls[0][1].idempotencyKey
    );
    expect(mockPrepare.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        previewConfirmationSha256: PREVIEW_CONFIRMATION,
        confirmed: true,
        expectedPreview: previewFixture()
      })
    );
    expect(mockHandoff).toHaveBeenCalledWith(previewFixture().artifact);
    expect(
      await screen.findByText(/Recovered the same audited preparation/i)
    ).toBeTruthy();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("clears preview and retry state on workspace switch", async () => {
    const screen = render(panel());
    fireEvent.press(screen.getByLabelText("Preview PII-redacted job CSV"));
    await screen.findByLabelText("PII-redacted job CSV preview content");

    screen.rerender(
      panel({
        workspace: { workspaceType: "facility", facilityId: "facility-two" }
      })
    );

    await waitFor(() =>
      expect(screen.queryByLabelText("PII-redacted job CSV preview content")).toBeNull()
    );
    expect(
      screen.getByText(/workspace or exact revision selection changed/i)
    ).toBeTruthy();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
