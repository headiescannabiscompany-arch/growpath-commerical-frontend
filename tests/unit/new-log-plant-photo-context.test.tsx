import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import NewLogScreen from "@/app/home/personal/(tabs)/logs/new";

const mockReplace = jest.fn();
const mockCreatePersonalLog = jest.fn();
const mockListToolRuns = jest.fn();
const mockListPersonalPlants = jest.fn();
const mockPersistImageUris = jest.fn();
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockEntitlementsCan = jest.fn();
const mockRouterBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    growId: "grow-1",
    plantId: "plant-olive-1",
    toolRunId: "toolrun-vpd-1"
  }),
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: mockRouterBack
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

  it("locks journal creation for free personal accounts", async () => {
    mockEntitlementsCan.mockImplementation(
      (capability) => capability !== "LOGS_PERSONAL_WRITE"
    );

    const { getByText } = render(<NewLogScreen />);

    expect(getByText("Create journal entries with Pro")).toBeTruthy();
    expect(
      getByText(
        "Free accounts can browse grow history and use free tools. Upgrade to save journal entries, photos, and AI-assisted log notes."
      )
    ).toBeTruthy();
    await waitFor(() =>
      expect(mockListToolRuns).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    fireEvent.press(getByText("Back"));
    expect(mockRouterBack).toHaveBeenCalled();
    expect(mockCreatePersonalLog).not.toHaveBeenCalled();
  });

  it("creates logs and photo metadata with selected plant context", async () => {
    const { getByLabelText, getByText } = render(<NewLogScreen />);

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
