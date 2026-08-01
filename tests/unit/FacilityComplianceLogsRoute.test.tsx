import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ComplianceLogsScreen, {
  createComplianceLogsStyles
} from "@/screens/facility/ComplianceLogsScreen";
import type { ThemePalette } from "@/theme/appTheme";

const mockCreateLog = jest.fn();
const mockCan = jest.fn();
let mockFacilityRole = "VIEWER";

const mockPalette = {
  card: "#151D27",
  surface: "#151D27",
  border: "#283545",
  text: "#F4F7FB",
  textMuted: "#AAB6C5",
  accent: "#78AAFF",
  accentText: "#FFFFFF"
} as ThemePalette;

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette: mockPalette })
}));

jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children, showBack, backFallbackHref }: any) => {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        {showBack ? <Text>Back {backFallbackHref}</Text> : null}
        {children}
      </View>
    );
  }
}));

jest.mock("@/components/LoadingSpinner", () => () => null);
jest.mock("@/components/ErrorState", () => () => null);

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { COMPLIANCE_WRITE: "COMPLIANCE_WRITE" },
  useEntitlements: () => ({ can: mockCan, facilityRole: mockFacilityRole })
}));

jest.mock("@/hooks/useComplianceLogs", () => ({
  useComplianceLogs: () => ({
    data: [],
    isLoading: false,
    error: null,
    createLog: mockCreateLog,
    creating: false,
    refetch: jest.fn()
  })
}));

describe("Facility compliance logs direct route", () => {
  beforeEach(() => {
    mockCreateLog.mockReset();
    mockCan.mockReset();
    mockFacilityRole = "VIEWER";
  });

  it("is read-only and accurately headed for a Viewer", () => {
    mockCan.mockReturnValue(false);
    const screen = render(<ComplianceLogsScreen />);

    expect(screen.getByText("Compliance Logs")).toBeTruthy();
    expect(screen.getByText("No compliance logs yet")).toBeTruthy();
    expect(screen.getAllByRole("header")).toHaveLength(2);
    expect(screen.queryByLabelText("Compliance log title")).toBeNull();
    expect(screen.queryByLabelText("Create compliance log")).toBeNull();
    expect(screen.getByText("Back /home/facility/compliance")).toBeTruthy();
  });

  it("keeps the complete creation form available to an authorized Staff writer", async () => {
    mockFacilityRole = "STAFF";
    mockCan.mockReturnValue(true);
    mockCreateLog.mockResolvedValue({ id: "log-1" });
    const screen = render(<ComplianceLogsScreen />);

    expect(screen.getAllByRole("radio")).toHaveLength(8);
    fireEvent.changeText(
      screen.getByLabelText("Compliance log title"),
      "Daily room check"
    );
    fireEvent.changeText(
      screen.getByLabelText("Compliance log notes"),
      "No issues found"
    );
    fireEvent.press(screen.getByLabelText("Create compliance log"));

    await waitFor(() =>
      expect(mockCreateLog).toHaveBeenCalledWith({
        type: "DAILY_CHECK",
        title: "Daily room check",
        notes: "No issues found"
      })
    );
  });

  it("uses the active palette for cards, fields, copy, and actions", () => {
    const styles = createComplianceLogsStyles(mockPalette);
    expect(styles.card.backgroundColor).toBe(mockPalette.card);
    expect(styles.input.backgroundColor).toBe(mockPalette.surface);
    expect(styles.input.color).toBe(mockPalette.text);
    expect(styles.h1.color).toBe(mockPalette.text);
    expect(styles.primaryButton.backgroundColor).toBe(mockPalette.accent);
  });
});
