import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import StartGrowWizard from "@/features/grows/screens/StartGrowWizard";

const mockMutateAsync = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace })
}));

jest.mock("@/features/rooms/hooks", () => ({
  useRooms: () => ({
    data: [
      { id: "room-1", name: "Flower Room" },
      { id: "room-2", name: "Veg Room" }
    ],
    isLoading: false
  })
}));

jest.mock("@/features/grows/hooks", () => ({
  useCreateGrow: () => ({
    isPending: false,
    mutateAsync: (...args: any[]) => mockMutateAsync(...args)
  })
}));

describe("StartGrowWizard", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = { roomId: "room-1", roomName: "Flower Room" };
    mockMutateAsync.mockResolvedValue({ id: "grow-1" });
  });

  it("preselects and submits only the room that launched grow setup", async () => {
    const screen = render(<StartGrowWizard />);

    await waitFor(() => expect(screen.getByText("1 selected")).toBeTruthy());
    expect(screen.getByLabelText("Remove room Flower Room")).toBeTruthy();
    expect(screen.getByLabelText("Select room Veg Room")).toBeTruthy();
    expect(screen.getByText(/Create a production cycle in Flower Room/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Start grow"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: "Batch Cycle 1",
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        rooms: ["room-1"],
        roomIds: ["room-1"]
      })
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/onboarding/assign-plants",
      params: { growId: "grow-1" }
    });
  });

  it("returns to the originating room without starting a grow", async () => {
    const screen = render(<StartGrowWizard />);

    await waitFor(() => expect(screen.getByText("1 selected")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Back to room grows"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/home/facility/grows?roomId=room-1&roomName=Flower+Room"
    );
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("does not select every room when a room-scoped link is stale", async () => {
    mockParams = { roomId: "deleted-room", roomName: "Deleted Room" };
    const screen = render(<StartGrowWizard />);

    await waitFor(() => expect(screen.getByText("0 selected")).toBeTruthy());
    expect(
      screen.getByText(
        "The requested room is no longer available. Select one or more current rooms to continue."
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Start grow").props.accessibilityState).toEqual({
      disabled: true
    });
    expect(screen.getByLabelText("Select room Flower Room")).toBeTruthy();
    expect(screen.getByLabelText("Select room Veg Room")).toBeTruthy();
  });
});
