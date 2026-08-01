import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LogDetailScreen, {
  createLogDetailStyles
} from "@/app/home/personal/(tabs)/logs/[logId]";
import { API_URL } from "@/api/apiRequest";
import { getThemePalette } from "@/theme/appTheme";

const mockGetPersonalLog = jest.fn();
const mockUpdatePersonalLog = jest.fn();
const mockDeletePersonalLog = jest.fn();

jest.mock("@/api/logs", () => ({
  getPersonalLog: (...args: any[]) => mockGetPersonalLog(...args),
  updatePersonalLog: (...args: any[]) => mockUpdatePersonalLog(...args),
  deletePersonalLog: (...args: any[]) => mockDeletePersonalLog(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ logId: "log-1" }),
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() })
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  const palette = actual.getThemePalette("night", "dark");
  return {
    ...actual,
    useAppTheme: () => ({
      mode: "night",
      resolvedMode: "night",
      palette,
      hydrated: true,
      systemScheme: "night",
      autoUsesLocation: false,
      themeLocation: null
    })
  };
});

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/components/nav/BackButton", () => {
  const { View } = require("react-native");
  return function MockBackButton() {
    return <View testID="back-button" />;
  };
});

describe("LogDetailScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetPersonalLog.mockResolvedValue({
      id: "log-1",
      growId: "grow-1",
      plantId: "plant-1",
      type: "photo",
      date: "2026-06-30T12:00:00.000Z",
      title: "Leaf photo",
      notes: "Attached symptom photo.",
      photos: ["/uploads/log-photo.jpg"],
      photoMetadata: [
        {
          url: "/uploads/log-photo.jpg",
          mimeType: "image/jpeg",
          width: 1600,
          height: 1200
        }
      ],
      tags: ["yellowing"],
      createdAt: "2026-06-30T12:00:00.000Z",
      updatedAt: "2026-06-30T12:00:00.000Z"
    });
  });

  it("uses the active Night palette for journal content, fields, photos, and actions", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createLogDetailStyles(palette);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.center.backgroundColor).toBe(palette.page);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.meta.color).toBe(palette.textMuted);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.card.borderColor).toBe(palette.border);
    expect(styles.input.backgroundColor).toBe(palette.surfaceStrong);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.notesInput.borderColor).toBe(palette.border);
    expect(styles.tag.backgroundColor).toBe(palette.accentSoft);
    expect(styles.rejectedTag.color).toBe(palette.danger);
    expect(styles.photoTile.backgroundColor).toBe(palette.card);
    expect(styles.photoFallback.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.photoFallbackTitle.color).toBe(palette.warning);
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.primaryButtonText.color).toBe(palette.accentText);
    expect(styles.secondaryButton.backgroundColor).toBe(palette.surface);
    expect(styles.dangerButton.borderColor).toBe(palette.danger);
    expect(styles.feedback.backgroundColor).toBe(palette.surfaceMuted);
  });

  it("renders uploaded log photos with absolute API image URLs", async () => {
    const screen = render(<LogDetailScreen />);

    await waitFor(() => expect(mockGetPersonalLog).toHaveBeenCalledWith("log-1"));
    expect(screen.getByText("Leaf photo")).toBeTruthy();
    expect(screen.getByText("image/jpeg | 1600x1200")).toBeTruthy();

    const image = screen.getByLabelText("Journal photo 1");
    expect(image.props.source).toEqual({
      uri: `${API_URL}/uploads/log-photo.jpg`
    });
  });

  it("shows a stable fallback when an uploaded log photo cannot load", async () => {
    const screen = render(<LogDetailScreen />);

    await waitFor(() => expect(mockGetPersonalLog).toHaveBeenCalledWith("log-1"));
    const image = screen.getByLabelText("Journal photo 1");
    fireEvent(image, "error");

    expect(screen.getByText("Photo unavailable")).toBeTruthy();
    expect(screen.getByText("/uploads/log-photo.jpg")).toBeTruthy();
    expect(screen.getByText("image/jpeg | 1600x1200")).toBeTruthy();
  });

  it("uses the Night accent for every editable journal field selection", async () => {
    const screen = render(<LogDetailScreen />);
    const palette = getThemePalette("night", "dark");

    await waitFor(() => expect(screen.getByText("Leaf photo")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Edit log entry"));

    ["Edit log title", "Edit log type", "Edit log notes", "Edit log tags"].forEach(
      (label) => {
        const field = screen.getByLabelText(label);
        expect(field.props.placeholderTextColor).toBe(palette.textMuted);
        expect(field.props.selectionColor).toBe(palette.accent);
      }
    );
  });
});
