import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import StartGrowWizard from "@/features/grows/screens/StartGrowWizard";

const mockMutateAsync = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockAssign = jest.fn();
let mockParams: Record<string, string> = {};
let mockEntitlements: any;

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack
  })
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
    mockEntitlements = { ready: true, facilityRole: "OWNER" };
    mockMutateAsync.mockResolvedValue({ id: "grow-1" });
    mockCanGoBack.mockReturnValue(true);
  });

  it("preselects and submits only the room that launched grow setup", async () => {
    const screen = render(<StartGrowWizard />);

    await waitFor(() => expect(screen.getByText("1 room selected")).toBeTruthy());
    expect(screen.getByLabelText("Remove room Flower Room")).toBeTruthy();
    expect(screen.getByLabelText("Select room Veg Room")).toBeTruthy();
    expect(screen.getByText(/Create a production cycle in Flower Room/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Select crop Cannabis"));

    fireEvent.press(screen.getByLabelText("Start grow"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        name: "Batch Cycle 1",
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        rooms: ["room-1"],
        roomIds: ["room-1"],
        cropTypes: ["Cannabis"],
        growInterests: { crops: ["Cannabis"] },
        planning: expect.objectContaining({
          lifeSpanPath: "unknown",
          productionPattern: "unknown",
          dormancyPattern: "unknown",
          roomIds: ["room-1"]
        })
      }))
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/onboarding/assign-plants",
      params: { growId: "grow-1" }
    });
  });

  it("persists reviewed tomato identity and lifecycle without cannabis timing", async () => {
    const screen = render(<StartGrowWizard />);

    await waitFor(() => expect(screen.getByText("1 room selected")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Crop common name"), "tomato");
    fireEvent.changeText(screen.getByLabelText("Cultivar"), "Brandywine");
    fireEvent.press(screen.getByLabelText("Match crop guidance"));
    fireEvent.press(screen.getByLabelText("Select crop Vegetables"));

    expect(screen.getByText(/Solanum lycopersicum \(reviewed lifecycle\)/)).toBeTruthy();
    expect(screen.getByText(/Determinate cultivars concentrate fruit production/)).toBeTruthy();
    expect(screen.queryByText(/vegetative weeks/i)).toBeNull();
    expect(screen.queryByText(/flower days/i)).toBeNull();

    fireEvent.press(screen.getByLabelText("Start grow"));

    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          cropCommonName: "tomato",
          scientificName: "Solanum lycopersicum",
          cultivar: "Brandywine",
          cropProfileId: "tomato-solanum-lycopersicum-lifecycle-v1",
          cropTypes: ["Vegetables"],
          cropIdentity: expect.objectContaining({
            commonName: "tomato",
            scientificName: "Solanum lycopersicum",
            userConfirmed: true
          }),
          planning: expect.objectContaining({
            lifeSpanPath: "climate_dependent_perennial",
            productionPattern: "cultivar_dependent",
            dormancyPattern: "climate_dependent"
          })
        })
      )
    );
  });

  it("returns to the originating room without starting a grow", async () => {
    const screen = render(<StartGrowWizard />);

    await waitFor(() => expect(screen.getByText("1 room selected")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Back to room grows"));

    expect(mockCanGoBack).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("uses the explicit room URL in a browser even when router history exists", async () => {
    const originalLocation = (globalThis as any).location;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { assign: mockAssign }
    });

    try {
      const screen = render(<StartGrowWizard />);

      await waitFor(() => expect(screen.getByText("1 room selected")).toBeTruthy());
      fireEvent.press(screen.getByLabelText("Back to room grows"));

      expect(mockAssign).toHaveBeenCalledWith(
        "/home/facility/grows?roomId=room-1&roomName=Flower+Room"
      );
      expect(mockCanGoBack).not.toHaveBeenCalled();
      expect(mockBack).not.toHaveBeenCalled();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    } finally {
      if (originalLocation === undefined) {
        delete (globalThis as any).location;
      } else {
        Object.defineProperty(globalThis, "location", {
          configurable: true,
          value: originalLocation
        });
      }
    }
  });

  it("does not select every room when a room-scoped link is stale", async () => {
    mockParams = { roomId: "deleted-room", roomName: "Deleted Room" };
    const screen = render(<StartGrowWizard />);

    await waitFor(() => expect(screen.getByText("0 rooms selected")).toBeTruthy());
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

  it("removes all grow creation controls from a Viewer direct route", () => {
    mockEntitlements = { ready: true, facilityRole: "VIEWER" };
    const screen = render(<StartGrowWizard />);

    expect(screen.getByRole("header", { name: "Grow setup is read-only" })).toBeTruthy();
    expect(screen.queryByLabelText("Grow or batch name")).toBeNull();
    expect(screen.queryByLabelText("Start grow")).toBeNull();
    expect(screen.getByLabelText("Back to facility grows")).toBeTruthy();
  });
});
