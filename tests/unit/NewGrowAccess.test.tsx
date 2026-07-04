import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import NewGrowScreen from "@/app/home/personal/(tabs)/grows/new";

const mockReplace = jest.fn();
const mockApiRequest = jest.fn();
const mockAppendGrowPhotos = jest.fn();
const mockPersistImageUris = jest.fn();
const mockEntitlementsCan = jest.fn();

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
  appendGrowPhotos: (...args: any[]) => mockAppendGrowPhotos(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  isPersistedImageUri: (uri: string) => /^https?:\/\//.test(uri) || uri.startsWith("/"),
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    GROWS_PERSONAL_WRITE: "GROWS_PERSONAL_WRITE"
  },
  useEntitlements: () => ({
    can: mockEntitlementsCan
  })
}));

describe("NewGrowScreen access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntitlementsCan.mockReturnValue(true);
    mockPersistImageUris.mockResolvedValue([]);
    mockApiRequest.mockResolvedValue({ grow: { id: "grow-bruce-banner" } });
  });

  it("locks grow creation for free personal accounts", () => {
    mockEntitlementsCan.mockImplementation(
      (capability) => capability !== "GROWS_PERSONAL_WRITE"
    );

    render(<NewGrowScreen />);

    expect(screen.getByText("Create grows with Pro")).toBeTruthy();
    expect(
      screen.getByText(
        "Free accounts can browse GrowPathAI and use free tools. Upgrade to create and save personal grow records."
      )
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Back to grows"));
    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("lets pro personal users create a grow record", async () => {
    render(<NewGrowScreen />);

    fireEvent.changeText(screen.getByLabelText("Grow name"), "Bruce Banner Auto");
    fireEvent.changeText(screen.getByLabelText("Anchor date"), "2026-01-01");
    fireEvent.press(screen.getByLabelText("Create grow"));

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalled());
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/personal/grows",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          name: "Bruce Banner Auto",
          anchorDate: "2026-01-01"
        })
      })
    );
    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("/home/personal/grows")
    );
  });
});
