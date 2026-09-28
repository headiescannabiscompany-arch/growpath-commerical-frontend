import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PdfExportScreen from "@/app/home/personal/(tabs)/tools/pdf-export";
import { listToolRuns } from "@/api/toolRuns";
import {
  getWorkspaceGrowTimeline,
  listWorkspaceGrows,
  listWorkspaceLogs,
  listWorkspacePlants,
  listWorkspaceTasks
} from "@/features/grows/workspaceData";

const mockParams = jest.fn();
const mockCan = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams(),
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: mockCanGoBack })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TOOL_PDF_EXPORT: "TOOL_PDF_EXPORT" },
  useEntitlements: () => ({ can: mockCan })
}));
jest.mock("@/api/toolRuns", () => ({
  listToolRuns: jest.fn(async () => [])
}));
jest.mock("@/features/grows/workspaceData", () => ({
  getWorkspaceGrowTimeline: jest.fn(async () => []),
  listWorkspaceGrows: jest.fn(async () => []),
  listWorkspaceLogs: jest.fn(async () => []),
  listWorkspacePlants: jest.fn(async () => []),
  listWorkspaceTasks: jest.fn(async () => [])
}));
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/features/personal/tools/LockedToolCard", () => {
  const { Text } = require("react-native");
  return () => <Text>Export locked</Text>;
});
jest.mock("@/features/personal/tools/ToolResultSurface", () => {
  const { Text } = require("react-native");
  return () => <Text>Export package</Text>;
});

describe("grow-scoped export Back navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ growId: "grow-1", presentation: "timeline" });
    mockCan.mockReturnValue(false);
    mockCanGoBack.mockReturnValue(true);
    for (const loader of [
      getWorkspaceGrowTimeline,
      listWorkspaceGrows,
      listWorkspaceLogs,
      listWorkspacePlants,
      listWorkspaceTasks,
      listToolRuns
    ]) {
      (loader as jest.Mock).mockResolvedValue([]);
    }
  });

  it("returns a locked export to its grow instead of unrelated router history", () => {
    const screen = render(<PdfExportScreen />);
    expect(screen.getByText("Export locked")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-1/timeline");
    expect(mockBack).not.toHaveBeenCalled();
    expect(listWorkspaceLogs).not.toHaveBeenCalled();
    expect(listToolRuns).not.toHaveBeenCalled();
  });

  it("keeps the same return path when export is enabled", async () => {
    mockCan.mockReturnValue(true);
    const screen = render(<PdfExportScreen />);
    await waitFor(() =>
      expect(listWorkspaceLogs).toHaveBeenCalledWith("personal", "grow-1")
    );
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-1/timeline");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("retains workspace and encoded array parameters without history", () => {
    mockParams.mockReturnValue({ growId: ["grow/2", "unused"] });
    mockCanGoBack.mockReturnValue(false);
    const screen = render(<PdfExportScreen workspaceType="commercial" />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/commercial/grows/grow%2F2/timeline");
  });

  it("uses the first grow and presentation parameters and encodes the return segment", () => {
    mockParams.mockReturnValue({
      growId: ["grow/2", "unused"],
      presentation: ["timeline", "unused"]
    });
    const screen = render(<PdfExportScreen />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow%2F2/timeline");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("does not override the explicit wrapper's history behavior", () => {
    const screen = render(<PdfExportScreen backFallbackHref="/home/commercial/tools" />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not override commercial report history", () => {
    const screen = render(<PdfExportScreen workspaceType="commercial" />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps history for a grow report without the timeline presentation", () => {
    mockParams.mockReturnValue({ growId: "grow-1" });
    const screen = render(<PdfExportScreen />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps ordinary history behavior when no grow is selected", () => {
    mockParams.mockReturnValue({});
    const screen = render(<PdfExportScreen />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps the default profile fallback for a context-free direct link", () => {
    mockParams.mockReturnValue({});
    mockCanGoBack.mockReturnValue(false);
    const screen = render(<PdfExportScreen />);
    fireEvent.press(screen.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/profile");
  });
});
