import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockCreatePlant = jest.fn();
const mockPersistImageUris = jest.fn();
const mockAttachPhotos = jest.fn();
const mockLaunchLibrary = jest.fn();

jest.mock("@/api/plants", () => ({
  createPlant: (...args: any[]) => mockCreatePlant(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUris: (...args: any[]) => mockPersistImageUris(...args)
}));

jest.mock("@/utils/growPhotoAttachment", () => ({
  maybePromptAttachPhotosToGrow: (...args: any[]) => mockAttachPhotos(...args)
}));

jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images", Videos: "Videos" },
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: (...args: any[]) => mockLaunchLibrary(...args)
}));

jest.mock("@/components/ScreenContainer", () => {
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock("@/components/PrimaryButton", () => {
  const { Pressable, Text } = require("react-native");
  return ({ children, onPress, disabled, title }: any) => (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
      {children || <Text>{title}</Text>}
    </Pressable>
  );
});

describe("CreatePlantScreen photo persistence", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/plant.jpg" }]
    });
    mockPersistImageUris.mockResolvedValue(["/uploads/plant.jpg"]);
    mockCreatePlant.mockResolvedValue({ _id: "plant-1" });
    mockAttachPhotos.mockResolvedValue({ prompted: true, attached: false });
  });

  it("uploads selected photos before creating the plant and offers grow attachment", async () => {
    const CreatePlantScreen = require("@/screens/CreatePlantScreen").default;
    const navigation = { replace: jest.fn() };
    const screen = render(<CreatePlantScreen navigation={navigation} />);

    fireEvent.press(screen.getByText("Add Photos"));
    await waitFor(() => expect(mockLaunchLibrary).toHaveBeenCalled());
    fireEvent.changeText(
      screen.getByPlaceholderText("e.g., Plant #1, Northern Lights"),
      "Plant 1"
    );
    fireEvent.changeText(screen.getByPlaceholderText("e.g., Girl Scout Cookies"), "GSC");
    fireEvent.press(screen.getByText("Create Grow"));

    await waitFor(() => expect(mockCreatePlant).toHaveBeenCalled());

    expect(mockPersistImageUris).toHaveBeenCalledWith(["file:///tmp/plant.jpg"]);
    expect(mockAttachPhotos).toHaveBeenCalledWith(["/uploads/plant.jpg"]);
  });
});
