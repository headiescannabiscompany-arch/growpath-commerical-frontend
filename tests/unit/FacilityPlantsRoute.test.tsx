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

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({
    growId: "grow-1",
    roomId: "room-1",
    contextName: "Summer crop"
  })
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
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

describe("FacilityPlantsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacilityRole = "manager";
    mockCanWritePlants = true;
    mockApiRequest.mockResolvedValue({ plants: [{ id: "plant-1", name: "Plant A" }] });
    mockCreatePlant.mockResolvedValue({ id: "plant-2" });
  });

  it("loads and creates plants inside the selected room and grow context", async () => {
    const screen = render(<FacilityPlantsRoute />);

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
});
