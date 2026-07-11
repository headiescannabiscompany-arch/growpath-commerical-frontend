import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import NewGrowScreen from "@/app/home/personal/(tabs)/grows/new";

const mockReplace = jest.fn();
const mockApiRequest = jest.fn();
const mockAppendGrowPhotos = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockPersistImageUris = jest.fn();
const mockEntitlementsCan = jest.fn();
let mockLimits: Record<string, number> = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace
  }),
  Link: ({ children }: any) => children
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
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
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
    mockLimits = {};
    mockListPersonalGrows.mockResolvedValue([]);
    mockPersistImageUris.mockResolvedValue([]);
    mockApiRequest.mockResolvedValue({ grow: { id: "grow-bruce-banner" } });
  });

  it("locks grow creation after the free one-grow limit is used", async () => {
    mockEntitlementsCan.mockImplementation(
      (capability) => capability !== "GROWS_PERSONAL_WRITE"
    );
    mockLimits = { maxGrows: 1 };
    mockListPersonalGrows.mockResolvedValue([{ id: "grow-1" }]);

    render(<NewGrowScreen />);

    await waitFor(() => expect(screen.getByText("Create grows with Pro")).toBeTruthy());
    expect(screen.getByText("Shared Back /home/personal/grows")).toBeTruthy();
    expect(
      screen.getByText(
        "Free accounts can create one grow. Upgrade to create more grows and save unlimited grow history."
      )
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Back to grows"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("lets free personal users create their first grow within the limit", async () => {
    mockEntitlementsCan.mockImplementation(
      (capability) => capability !== "GROWS_PERSONAL_WRITE"
    );
    mockLimits = { maxGrows: 1 };
    mockListPersonalGrows.mockResolvedValue([]);

    render(<NewGrowScreen />);

    await waitFor(() => expect(screen.getByLabelText("Grow name")).toBeTruthy());
    expect(screen.getByText("Shared Back /home/personal/grows")).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText("Grow name"), "First Free Grow");
    fireEvent.changeText(screen.getByLabelText("Anchor date"), "2026-01-01");
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
    fireEvent.changeText(screen.getByLabelText("Grow name"), "Bruce Banner Auto");
    fireEvent.changeText(screen.getByLabelText("Anchor date"), "2026-01-01");
    fireEvent.press(screen.getByLabelText("Show advanced fields"));
    fireEvent.changeText(screen.getByLabelText("Start date"), "2026-01-01");
    fireEvent.changeText(screen.getByLabelText("Germination date"), "2026-01-03");
    fireEvent.changeText(screen.getByLabelText("Clone cut date"), "2026-01-04");
    fireEvent.changeText(screen.getByLabelText("Transplant date"), "2026-01-15");
    fireEvent.changeText(screen.getByLabelText("Flip date"), "2026-02-14");
    fireEvent.changeText(screen.getByLabelText("Flower day 1"), "2026-02-15");
    fireEvent.changeText(screen.getByLabelText("Expected harvest date"), "2026-04-15");
    fireEvent.changeText(screen.getByLabelText("Actual harvest date"), "2026-04-20");
    fireEvent.changeText(screen.getByLabelText("Dry start date"), "2026-04-20");
    fireEvent.changeText(screen.getByLabelText("Cure start date"), "2026-04-30");
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
});
