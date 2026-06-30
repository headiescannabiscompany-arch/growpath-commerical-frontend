import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import TrichomeAnalysisScreen from "@/screens/facility/TrichomeAnalysisScreen";

const mockCallAI = jest.fn();
const mockUploadImage = jest.fn();
const mockRequestPermissions = jest.fn();
const mockLaunchLibrary = jest.fn();

jest.mock("@/hooks/useAICall", () => ({
  useAICall: () => ({
    callAI: mockCallAI,
    loading: false,
    error: null,
    last: null
  })
}));

jest.mock("@/api/uploads", () => ({
  uploadImage: (...args: any[]) => mockUploadImage(...args)
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) =>
    mockRequestPermissions(...args),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args)
}));

describe("TrichomeAnalysisScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/trichome.jpg" }]
    });
    mockUploadImage.mockResolvedValue({ url: "/uploads/trichome.jpg" });
    mockCallAI.mockResolvedValue({});
  });

  it("uploads a selected trichome photo before sending AI analysis", async () => {
    const screen = render(
      <TrichomeAnalysisScreen facilityId="facility-1" growId="grow-1" />
    );

    fireEvent.press(screen.getByLabelText("Upload trichome photo"));

    await waitFor(() =>
      expect(mockUploadImage).toHaveBeenCalledWith("file:///tmp/trichome.jpg")
    );
    await waitFor(() =>
      expect(screen.getByDisplayValue("/uploads/trichome.jpg")).toBeTruthy()
    );

    fireEvent.press(screen.getByLabelText("Analyze trichome image"));

    await waitFor(() =>
      expect(mockCallAI).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: "harvest",
          fn: "analyzeTrichomes",
          args: expect.objectContaining({
            images: ["/uploads/trichome.jpg"]
          }),
          context: { growId: "grow-1" }
        })
      )
    );
  });
});
