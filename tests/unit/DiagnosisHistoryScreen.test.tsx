import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DiagnosisHistoryScreen from "@/screens/DiagnosisHistoryScreen";

const mockGetDiagnosisHistory = jest.fn();
const mockNavigate = jest.fn();

jest.mock("@/api/diagnose", () => ({
  getDiagnosisHistory: (...args: any[]) => mockGetDiagnosisHistory(...args)
}));

jest.mock("@/components/ScreenContainer", () => {
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});

describe("DiagnosisHistoryScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetDiagnosisHistory.mockResolvedValue([
      {
        _id: "diag-1",
        issueSummary: "Possible pH drift",
        severity: 4,
        urgency: "high",
        cropCommonName: "Blueberry",
        scientificName: "Vaccinium corymbosum",
        cultivarOrStrain: "Duke",
        providerName: "openai",
        providerModel: "gpt-4o-mini",
        notes: "Yellow leaves",
        photos: ["/uploads/leaf.jpg"],
        feedbackCount: 1,
        feedbackSummary: {
          latestVerdict: "helpful",
          latestSymptomChange: "improved",
          latestNotes: "New growth improved after pH correction."
        },
        createdAt: "2026-06-30T12:00:00.000Z"
      }
    ]);
  });

  it("shows provider, crop context, and latest feedback after reload", async () => {
    const screen = render(
      <DiagnosisHistoryScreen navigation={{ navigate: mockNavigate }} />
    );

    await waitFor(() => expect(mockGetDiagnosisHistory).toHaveBeenCalled());

    expect(screen.getByText("Possible pH drift")).toBeTruthy();
    expect(screen.getByText("Blueberry / Vaccinium corymbosum / Duke")).toBeTruthy();
    expect(screen.getByText("Severity 4/5 · Urgency high")).toBeTruthy();
    expect(screen.getByText("Provider: openai · gpt-4o-mini")).toBeTruthy();
    expect(screen.getByText("1 feedback · helpful · improved")).toBeTruthy();
    expect(
      screen.getByText("Latest note: New growth improved after pH correction.")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Open diagnosis Possible pH drift"));

    expect(mockNavigate).toHaveBeenCalledWith("DiagnoseScreen", {
      diagnosisId: "diag-1",
      notes: "Yellow leaves",
      photos: ["/uploads/leaf.jpg"],
      feedbackSummary: {
        latestVerdict: "helpful",
        latestSymptomChange: "improved",
        latestNotes: "New growth improved after pH correction."
      }
    });
  });
});
