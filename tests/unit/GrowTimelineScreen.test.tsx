import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import GrowTimelineScreen from "@/app/home/personal/(tabs)/grows/[growId]/timeline";

const mockGetPersonalGrowTimeline = jest.fn();

jest.mock("@/api/grows", () => ({
  getPersonalGrowTimeline: (...args: any[]) => mockGetPersonalGrowTimeline(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  Link: ({ children }: any) => children
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/components/personal/GrowWorkspaceNav", () => {
  const { View } = require("react-native");
  return () => <View testID="grow-workspace-nav" />;
});

describe("GrowTimelineScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetPersonalGrowTimeline.mockResolvedValue([
      {
        id: "Diagnosis:diag-1",
        type: "diagnosis_created",
        sourceModel: "Diagnosis",
        sourceId: "diag-1",
        title: "Possible pH drift",
        summary: "Lower leaves show marginal chlorosis.",
        timestamp: "2026-06-30T12:00:00.000Z",
        tags: ["diagnosis"],
        payload: {
          overallHealth: "watch",
          feedbackCount: 1
        }
      },
      {
        id: "DiagnosisFeedback:feedback-1",
        type: "diagnosis_feedback",
        sourceModel: "DiagnosisFeedback",
        sourceId: "feedback-1",
        title: "Diagnosis feedback: not accurate",
        summary: "Symptoms worsened after the first recommendation.",
        timestamp: "2026-06-30T13:00:00.000Z",
        tags: ["diagnosis_feedback", "not_accurate", "worse"],
        payload: {
          verdict: "not_accurate",
          symptomChange: "worse",
          confirmedIssue: "Heat stress",
          actionsTaken: ["Raised light", "Increased airflow"],
          providerName: "OpenAI",
          providerModel: "gpt-test"
        }
      }
    ]);
  });

  it("renders diagnosis feedback outcome details on the grow timeline", async () => {
    const screen = render(<GrowTimelineScreen />);

    await waitFor(() =>
      expect(mockGetPersonalGrowTimeline).toHaveBeenCalledWith("grow-1")
    );

    expect(screen.getByText("Possible pH drift")).toBeTruthy();
    expect(screen.getByText("Overall health: watch")).toBeTruthy();
    expect(screen.getByText("Feedback: 1 response(s)")).toBeTruthy();
    expect(screen.getByText("Diagnosis feedback: not accurate")).toBeTruthy();
    expect(screen.getByText("Verdict: not accurate")).toBeTruthy();
    expect(screen.getByText("Symptoms: worse")).toBeTruthy();
    expect(screen.getByText("Confirmed issue: Heat stress")).toBeTruthy();
    expect(screen.getByText("Actions: Raised light, Increased airflow")).toBeTruthy();
    expect(screen.getByText("Provider: OpenAI, gpt-test")).toBeTruthy();
  });
});
