import React from "react";
import { StyleSheet } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import NewLogScreen, { createNewLogStyles } from "@/app/home/personal/(tabs)/logs/new";
import { createToolPlantContextPickerStyles } from "@/features/personal/tools/ToolPlantContextPicker";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockCreatePersonalLog = jest.fn();
const mockListToolRuns = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockPersistImageUris = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockEntitlementsCan = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    growId: "grow-1",
    plantId: "plant-olive-1",
    toolRunId: "toolrun-vpd-1"
  }),
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn()
  }),
  Link: ({ children }: any) => children
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestMediaLibraryPermissionsAsync(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchImageLibraryAsync(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    DIAGNOSE_AI: "DIAGNOSE_AI",
    LOGS_PERSONAL_WRITE: "LOGS_PERSONAL_WRITE"
  },
  useEntitlements: () => ({ can: mockEntitlementsCan })
}));

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({
      palette: actual.getThemePalette("night", "dark")
    })
  };
});

jest.mock("@/api/logs", () => ({
  createPersonalLog: (...args: any[]) => mockCreatePersonalLog(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args)
}));

jest.mock("@/api/plants", () => ({
  listPersonalPlants: (...args: any[]) => mockListPersonalPlants(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args),
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/api/logInsights", () => ({
  suggestLogInsights: jest.fn()
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

describe("NewLogScreen plant/photo context", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntitlementsCan.mockReturnValue(true);
    mockListPersonalPlants.mockResolvedValue([
      {
        id: "plant-olive-1",
        growId: "grow-1",
        name: "Olive patio tree",
        cropCommonName: "Olive",
        scientificName: "Olea europaea",
        cultivar: "Arbequina",
        cropProfileId: "crop-olive-1",
        growthProfile: {
          phenoLabel: "compact-container",
          sizeMetrics: { canopyWidthCm: 140 }
        }
      }
    ]);
    mockListToolRuns.mockResolvedValue([
      {
        id: "toolrun-vpd-1",
        _id: "toolrun-vpd-1",
        growId: "grow-1",
        plantId: "plant-olive-1",
        toolType: "vpd",
        selectedPlantContext: {
          id: "plant-olive-1",
          name: "Olive patio tree"
        }
      }
    ]);
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/olive-leaf.jpg",
          width: 1200,
          height: 900,
          mimeType: "image/jpeg",
          fileSize: 345678
        }
      ]
    });
    mockPersistImageUris.mockResolvedValue(["https://cdn.example.com/olive-leaf.jpg"]);
    mockCreatePersonalLog.mockResolvedValue({ id: "log-1" });
  });

  it("keeps journal creation available for free personal accounts", async () => {
    mockEntitlementsCan.mockImplementation(
      (capability) => capability !== "LOGS_PERSONAL_WRITE"
    );

    const { getByLabelText, getByText, queryByText } = render(<NewLogScreen />);

    expect(getByText("Shared Back /home/personal/grows/grow-1/journal")).toBeTruthy();
    expect(queryByText("Create journal entries with Pro")).toBeNull();
    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    fireEvent.changeText(getByLabelText("Log title"), "Free grow journal");
    fireEvent.changeText(getByLabelText("Log notes"), "Basic grow log for free plan.");
    fireEvent.press(getByLabelText("Create log"));

    await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalled());
    expect(mockCreatePersonalLog).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        title: "Free grow journal",
        notes: "Basic grow log for free plan."
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-1/journal");
  });

  it("uses the active Night palette for journal fields, photos, and action states", async () => {
    const palette = getThemePalette("night", "dark");
    const styles = createNewLogStyles(palette);
    const plantPickerStyles = createToolPlantContextPickerStyles(palette);
    const screen = render(<NewLogScreen />);

    expect(styles.container.backgroundColor).toBe(palette.page);
    expect(styles.input).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.photoTile).toEqual(
      expect.objectContaining({
        backgroundColor: palette.card,
        borderColor: palette.border
      })
    );
    expect(styles.error).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surfaceMuted,
        borderColor: palette.danger,
        color: palette.danger
      })
    );
    expect(styles.primaryButton.backgroundColor).toBe(palette.accent);
    expect(styles.secondaryButton).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.accent
      })
    );
    expect(plantPickerStyles.pill).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border
      })
    );
    expect(plantPickerStyles.pillText.color).toBe(palette.text);
    expect(plantPickerStyles.pillOn.backgroundColor).toBe(palette.accent);

    for (const label of ["Log title", "Log notes", "Photo URL"]) {
      const input = screen.getByLabelText(label);
      expect(input.props.placeholderTextColor).toBe(palette.textMuted);
      expect(StyleSheet.flatten(input.props.style)).toEqual(
        expect.objectContaining({
          backgroundColor: palette.surface,
          borderColor: palette.border,
          color: palette.text
        })
      );
    }

    const plantContextLabel = await screen.findByText("Plant context");
    expect(StyleSheet.flatten(plantContextLabel.props.style).color).toBe(palette.text);
    expect(
      StyleSheet.flatten(screen.getByText("Olive patio tree").props.style).color
    ).toBe(palette.accentText);

    fireEvent.press(screen.getByLabelText("Attach log photos"));
    const remove = await screen.findByText("Remove");
    expect(remove).toBeTruthy();
  });

  it("creates logs and photo metadata with selected plant context", async () => {
    const { getByLabelText, getByText } = render(<NewLogScreen />);

    expect(getByText("Shared Back /home/personal/grows/grow-1/journal")).toBeTruthy();
    await waitFor(() =>
      expect(mockListPersonalPlants).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({ growId: "grow-1" })
    );

    fireEvent.changeText(getByLabelText("Log title"), "Olive canopy check");
    fireEvent.changeText(
      getByLabelText("Log notes"),
      "Checked leaf color and canopy size."
    );
    fireEvent.press(getByLabelText("Attach log photos"));
    await waitFor(() => expect(getByText("Remove")).toBeTruthy());

    fireEvent.press(getByLabelText("Create log"));

    await waitFor(() => expect(mockCreatePersonalLog).toHaveBeenCalled());
    expect(mockPersistImageUris).toHaveBeenCalledWith(["file:///tmp/olive-leaf.jpg"]);
    expect(mockCreatePersonalLog).toHaveBeenCalledWith(
      expect.objectContaining({
        growId: "grow-1",
        plantId: "plant-olive-1",
        toolRunId: "toolrun-vpd-1",
        title: "Olive canopy check",
        photos: ["https://cdn.example.com/olive-leaf.jpg"],
        photoMetadata: [
          expect.objectContaining({
            growId: "grow-1",
            plantId: "plant-olive-1",
            url: "https://cdn.example.com/olive-leaf.jpg",
            mimeType: "image/jpeg",
            width: 1200,
            height: 900,
            sizeBytes: 345678,
            consentForAI: false,
            consentForTraining: false
          })
        ]
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-1/journal");
  });
});
