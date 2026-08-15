import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import NewGrowScreen from "@/app/home/personal/(tabs)/grows/new";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockApiRequest = jest.fn();
const mockAppendGrowPhotos = jest.fn();
const mockSavePersonalGrowCropIdentity = jest.fn();
const mockListCropProfiles = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockPersistImageUris = jest.fn();
const mockEntitlementsCan = jest.fn();
let mockLimits: Record<string, number> = {};
let mockSearchParams: Record<string, string> = {};

function chooseDate(
  screen: ReturnType<typeof render>,
  accessibilityLabel: string,
  value: string
) {
  const [year, month] = value.split("-").map(Number);
  fireEvent.press(screen.getByLabelText(accessibilityLabel));
  fireEvent(screen.getByLabelText(`${accessibilityLabel} year`), "valueChange", year);
  fireEvent(screen.getByLabelText(`${accessibilityLabel} month`), "valueChange", month);
  fireEvent.press(screen.getByLabelText(`${accessibilityLabel} day ${value}`));
  fireEvent.press(screen.getByLabelText(`${accessibilityLabel} use selected date`));
}

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush
  }),
  useLocalSearchParams: () => mockSearchParams,
  usePathname: () => "/home/personal/grows/new",
  Link: ({ children }: any) => children
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "personal-pro-user",
      growInterests: {
        crops: ["Fruit Trees & Bushes"],
        environment: ["Outdoor"],
        methods: ["Organic (Amended Soil)"],
        experience: ["Intermediate"]
      }
    }
  })
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn()
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/grows", () => ({
  appendGrowPhotos: (...args: any[]) => mockAppendGrowPhotos(...args),
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args),
  savePersonalGrowCropIdentity: (...args: any[]) =>
    mockSavePersonalGrowCropIdentity(...args)
}));

jest.mock("@/api/cropKnowledge", () => ({
  listCropProfiles: (...args: any[]) => mockListCropProfiles(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  isPersistedImageUri: (uri: string) => /^https?:\/\//.test(uri) || uri.startsWith("/"),
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args),
  resolveImageUri: (uri: string) => uri
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    GROWS_PERSONAL_WRITE: "GROWS_PERSONAL_WRITE"
  },
  useEntitlements: () => ({
    can: mockEntitlementsCan,
    limits: mockLimits
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

describe("NewGrowScreen access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntitlementsCan.mockReturnValue(true);
    mockSearchParams = {};
    mockLimits = {};
    mockListPersonalGrows.mockResolvedValue([]);
    mockPersistImageUris.mockResolvedValue([]);
    mockApiRequest.mockResolvedValue({ grow: { id: "grow-bruce-banner" } });
    mockSavePersonalGrowCropIdentity.mockResolvedValue({ id: "grow-bruce-banner" });
    mockListCropProfiles.mockResolvedValue([]);
  });

  it("locks grow creation after the free one-grow limit is used", async () => {
    mockEntitlementsCan.mockReturnValue(true);
    mockLimits = { maxGrows: 1 };
    mockListPersonalGrows.mockResolvedValue([{ id: "grow-1" }]);

    render(<NewGrowScreen />);

    await waitFor(() => expect(screen.getByText("Free grow limit reached")).toBeTruthy());
    expect(screen.getByText("Shared Back /home/personal/grows")).toBeTruthy();
    expect(
      screen.getByText(
        "Free includes one active grow. Upgrade to Pro to create up to 10 active grows."
      )
    ).toBeTruthy();
    expect(mockListPersonalGrows).toHaveBeenCalled();
    expect(screen.queryByText("Back to grows")).toBeNull();
    expect(screen.getAllByText("Shared Back /home/personal/grows")).toHaveLength(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("lets free personal users create their first grow within the limit", async () => {
    mockEntitlementsCan.mockReturnValue(true);
    mockLimits = { maxGrows: 1 };
    mockListPersonalGrows.mockResolvedValue([]);

    render(<NewGrowScreen />);

    await waitFor(() => expect(screen.getByLabelText("Grow name")).toBeTruthy());
    expect(screen.getByText("Shared Back /home/personal/grows")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Grow name"), "First Free Grow");
    chooseDate(screen, "Anchor date", "2026-01-01");
    fireEvent.press(screen.getByLabelText("Create grow"));

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalled());
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/personal/grows",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          name: "First Free Grow",
          anchorDate: "2026-01-01"
        })
      })
    );
  });

  it("lets pro personal users create a grow record", async () => {
    render(<NewGrowScreen />);

    expect(screen.getByText("Shared Back /home/personal/grows")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText("Grow Planner / Auto Calendar")).toBeTruthy()
    );
    expect(screen.getByLabelText("Plant count")).toBeTruthy();
    expect(screen.getByLabelText("Veg length (weeks)")).toBeTruthy();
    expect(screen.getByLabelText("Expected flower days")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Grow name"), "Bruce Banner Auto");
    chooseDate(screen, "Anchor date", "2026-01-01");
    fireEvent.press(screen.getByLabelText("Show advanced fields"));
    chooseDate(screen, "Start date", "2026-01-01");
    chooseDate(screen, "Germination date", "2026-01-03");
    chooseDate(screen, "Clone cut date", "2026-01-04");
    chooseDate(screen, "Transplant date", "2026-01-15");
    chooseDate(screen, "Flip date", "2026-02-14");
    chooseDate(screen, "Flower day 1", "2026-02-15");
    chooseDate(screen, "Expected harvest date", "2026-04-15");
    chooseDate(screen, "Actual harvest date", "2026-04-20");
    chooseDate(screen, "Dry start date", "2026-04-20");
    chooseDate(screen, "Cure start date", "2026-04-30");
    fireEvent.press(screen.getByLabelText("Create grow"));

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalled());
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/personal/grows",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          name: "Bruce Banner Auto",
          anchorDate: "2026-01-01",
          startDate: "2026-01-01",
          germinationDate: "2026-01-03",
          cloneCutDate: "2026-01-04",
          transplantDate: "2026-01-15",
          flipDate: "2026-02-14",
          flowerDay1Date: "2026-02-15",
          expectedHarvestDate: "2026-04-15",
          actualHarvestDate: "2026-04-20",
          dryStartDate: "2026-04-20",
          cureStartDate: "2026-04-30"
        })
      })
    );
    await waitFor(() =>
      expect(screen.getByText("Grow created: Bruce Banner Auto")).toBeTruthy()
    );
    fireEvent.press(screen.getByText("Open Grow Dashboard"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-bruce-banner");
  });

  it("preserves a confirmed Plant ID when it creates the grow", async () => {
    mockSearchParams = {
      source: "ai",
      name: "Tomato grow",
      cropCommonName: "Tomato",
      scientificName: "Solanum lycopersicum",
      commonNames: "tomato,garden tomato",
      cultivar: "Brandywine",
      cropProfileId: "crop-profile-tomato",
      sourceToolRunId: "plant-id-run-1"
    };

    render(<NewGrowScreen />);

    await waitFor(() => expect(screen.getByDisplayValue("Tomato grow")).toBeTruthy());
    expect(screen.getByDisplayValue("Tomato")).toBeTruthy();
    expect(screen.getByDisplayValue("Solanum lycopersicum")).toBeTruthy();
    expect(screen.getByLabelText("Establishment weeks")).toBeTruthy();
    expect(screen.getByLabelText("Expected days to first harvest")).toBeTruthy();
    chooseDate(screen, "Anchor date", "2026-08-14");
    fireEvent.press(screen.getByLabelText("Create grow"));

    await waitFor(() =>
      expect(mockSavePersonalGrowCropIdentity).toHaveBeenCalledWith(
        "grow-bruce-banner",
        expect.objectContaining({
          cropCommonName: "Tomato",
          scientificName: "Solanum lycopersicum",
          commonNames: ["tomato", "garden tomato"],
          cultivar: "Brandywine",
          cropProfileId: "crop-profile-tomato",
          sourceToolRunId: "plant-id-run-1",
          userConfirmed: true
        })
      )
    );
  });
});
