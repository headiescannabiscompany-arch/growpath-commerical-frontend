import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityPlantsRoute from "@/app/home/facility/(tabs)/plants";

const mockApiRequest = jest.fn();
const mockCreatePlant = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
let mockFacilityRole = "manager";
let mockCanWritePlants = true;
let mockPlantParams: Record<string, string> = {
  growId: "grow-1",
  roomId: "room-1",
  contextName: "Summer crop"
};
let mockScreenBoundaryProps: any = null;

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockPlantParams
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/plants", () => ({
  createPlant: (...args: any[]) => mockCreatePlant(...args)
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { PLANTS_WRITE: "plants_write" },
  useEntitlements: () => ({
    facilityRole: mockFacilityRole,
    can: () => mockCanWritePlants
  })
}));
jest.mock("@/features/facility/useFacilityRooms", () => ({
  useFacilityRooms: () => ({ rooms: [{ id: "room-1", name: "Flower room" }] })
}));
jest.mock("@/features/facility/useFacilityGrows", () => ({
  useFacilityGrows: () => ({
    grows: [{ id: "grow-1", name: "Summer crop", roomId: "room-1" }]
  })
}));
jest.mock("@/hooks/useApiErrorHandler", () => {
  const clearError = jest.fn();
  const handleApiError = jest.fn();
  return { useApiErrorHandler: () => ({ error: null, clearError, handleApiError }) };
});
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: (props: any) => {
      mockScreenBoundaryProps = props;
      return React.createElement(View, null, props.children);
    }
  };
});
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

describe("FacilityPlantsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityRole = "manager";
    mockCanWritePlants = true;
    mockPlantParams = {
      growId: "grow-1",
      roomId: "room-1",
      contextName: "Summer crop"
    };
    mockScreenBoundaryProps = null;
    mockApiRequest.mockResolvedValue({ plants: [{ id: "plant-1", name: "Plant A" }] });
    mockCreatePlant.mockResolvedValue({ id: "plant-2" });
  });

  it("keeps a Back control on the top-level Facility plant list", async () => {
    mockPlantParams = {};
    render(<FacilityPlantsRoute />);

    await waitFor(() => expect(mockApiRequest).toHaveBeenCalled());
    expect(mockScreenBoundaryProps).toMatchObject({
      showBack: true,
      backFallbackHref: "/home/facility/dashboard"
    });
  });

  it("loads and creates plants inside the selected room and grow context", async () => {
    const screen = render(<FacilityPlantsRoute />);

    expect(screen.getByLabelText("Loading facility plants").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });

    await waitFor(() => expect(screen.getByText("Plant A")).toBeTruthy());
    expect(
      screen.getByRole("header", { name: "Summer crop → Plants" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getByRole("header", { name: "Plant coverage" }).props["aria-level"]
    ).toBe(2);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility-1/plants?growId=grow-1&roomId=room-1"
    );
    expect(screen.getByLabelText("Set plant stage to Veg").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: true }
    });
    expect(screen.getByLabelText("Set plant room to Flower room").props).toMatchObject({
      accessibilityRole: "radio",
      accessibilityState: { checked: true }
    });

    fireEvent.changeText(screen.getByLabelText("Plant name"), "Plant B");
    fireEvent.press(screen.getByLabelText("Set plant stage to Flower"));
    fireEvent.press(screen.getByLabelText("Create facility plant"));

    await waitFor(() =>
      expect(mockCreatePlant).toHaveBeenCalledWith("facility-1", {
        name: "Plant B",
        tag: undefined,
        strain: undefined,
        stage: "Flower",
        roomId: "room-1",
        growId: "grow-1"
      })
    );
  });

  it.each(["staff", "viewer"])(
    "keeps the %s role read-only even if a stale capability claims write access",
    async (role) => {
      mockFacilityRole = role;
      mockCanWritePlants = true;
      mockApiRequest.mockResolvedValue({ plants: [] });

      const screen = render(<FacilityPlantsRoute />);

      await waitFor(() => expect(screen.getByText("No plants yet")).toBeTruthy());
      expect(
        screen.getByText("Only facility owners and managers can create plants.")
      ).toBeTruthy();
      expect(
        screen.getByText(
          "Ask a facility owner or manager to create or link plants from a grow or room to start tracking room and batch coverage."
        )
      ).toBeTruthy();
      expect(screen.queryByText(/Create a plant above/)).toBeNull();
      expect(screen.queryByLabelText("Plant name")).toBeNull();
      expect(screen.queryByLabelText("Create facility plant")).toBeNull();
      expect(mockCreatePlant).not.toHaveBeenCalled();
    }
  );

  it("keeps a manager read-only when the plants-write capability is unavailable", async () => {
    mockCanWritePlants = false;

    const screen = render(<FacilityPlantsRoute />);

    await waitFor(() => expect(screen.getByText("Plant A")).toBeTruthy());
    expect(screen.queryByLabelText("Plant name")).toBeNull();
    expect(screen.queryByLabelText("Create facility plant")).toBeNull();
  });

  it("prevents duplicate plant creation while a save is pending", async () => {
    let finishCreate: (() => void) | undefined;
    mockCreatePlant.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishCreate = resolve;
        })
    );
    const screen = render(<FacilityPlantsRoute />);
    await waitFor(() => expect(screen.getByText("Plant A")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Plant name"), "Plant B");
    const create = screen.getByLabelText("Create facility plant");

    fireEvent.press(create);
    fireEvent.press(create);

    expect(mockCreatePlant).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Create facility plant").props.accessibilityState
    ).toMatchObject({ busy: true, disabled: true });
    finishCreate?.();
    await waitFor(() => expect(screen.getByText("Plant created.")).toBeTruthy());
    expect(screen.getByText("Plant created.").props.accessibilityLiveRegion).toBe(
      "polite"
    );
  });

  it("exposes plant records as named links", async () => {
    mockPlantParams = {};
    const screen = render(<FacilityPlantsRoute />);

    const plantLink = await screen.findByRole("link", { name: "Open plant Plant A" });
    expect(screen.getByLabelText("Facility plants").props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingBottom: 104 })
    );
    fireEvent.press(plantLink);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/plants/[id]",
      params: { id: "plant-1" }
    });
  });
});
