import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PhenoMatrixScreen from "@/app/home/personal/(tabs)/tools/pheno-matrix";

const mockSaveToolRunAndCreateTasks = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn()
  })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TOOL_PHENO_MATRIX: "tool_pheno_matrix" },
  useEntitlements: () => ({
    plan: "pro",
    mode: "personal",
    can: () => true
  })
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref }: any) =>
      React.createElement(
        View,
        null,
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/features/personal/tools/ToolResultSurface", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return ({ title, actions = [] }: { title: string; actions?: any[] }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      ...actions.map((action) =>
        React.createElement(
          Pressable,
          { key: action.key, onPress: action.onPress },
          React.createElement(Text, null, action.label)
        )
      )
    );
});

jest.mock("@/features/personal/tools/saveToolRunAndOpenJournal", () => ({
  saveToolRunResult: jest.fn(),
  saveToolRunAndCreateTasks: (...args: any[]) => mockSaveToolRunAndCreateTasks(...args)
}));

describe("PhenoMatrixScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockSaveToolRunAndCreateTasks.mockResolvedValue({
      ok: true,
      toolRunId: "toolrun-pheno-1",
      taskIds: ["task-1", "task-2", "task-3", "task-4"]
    });
  });

  it("creates a source-linked pheno decision task plan from the matrix result", async () => {
    const screen = render(<PhenoMatrixScreen />);

    expect(screen.getByText("Pheno Matrix")).toBeTruthy();
    expect(screen.getByText("Shared Back /home/personal/tools")).toBeTruthy();

    fireEvent.press(screen.getByText("Create Pheno Decision Tasks"));

    await waitFor(() =>
      expect(mockSaveToolRunAndCreateTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          growId: "grow-1",
          toolKey: "pheno-matrix",
          tasks: expect.arrayContaining([
            expect.objectContaining({
              title: "Review pheno keeper evidence: Plant 3"
            }),
            expect.objectContaining({
              title: "Verify clone and stress response: Plant 3"
            }),
            expect.objectContaining({
              title: "Record dry/cure smoke and hash notes: Plant 3"
            }),
            expect.objectContaining({
              title: "Mark final keeper/reject/watch decision: Plant 3"
            })
          ])
        })
      )
    );
  });
});
