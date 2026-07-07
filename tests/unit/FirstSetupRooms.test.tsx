import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FirstSetupRooms from "@/features/rooms/screens/FirstSetupRooms";

const mockReplace = jest.fn();
const mockMutateAsync = jest.fn();
const mockUseRooms = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/features/rooms/hooks", () => ({
  useRooms: () => mockUseRooms(),
  useBulkCreateRooms: () => ({ mutateAsync: mockMutateAsync })
}));

describe("FirstSetupRooms", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseRooms.mockReturnValue({ data: [], isLoading: false });
    mockMutateAsync.mockResolvedValue([
      { success: true },
      { success: true },
      { success: true },
      { success: true },
      { success: true }
    ]);
  });

  it("starts facility onboarding with flower, veg, mother, greenhouse, and dry/cure spaces", async () => {
    const screen = render(<FirstSetupRooms />);

    expect(screen.getByDisplayValue("Flower Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Veg Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Mother Room")).toBeTruthy();
    expect(screen.getByDisplayValue("Greenhouse")).toBeTruthy();
    expect(screen.getByDisplayValue("Dry/Cure Room")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Create rooms"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith([
        { name: "Flower Room" },
        { name: "Veg Room" },
        { name: "Mother Room" },
        { name: "Greenhouse" },
        { name: "Dry/Cure Room" }
      ])
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/onboarding/start-grow"));
  });
});
