import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityRoomsTab from "@/app/home/facility/(tabs)/rooms";

const mockReplace = jest.fn();
const mockCreateRoom = jest.fn();
const mockDeleteRoom = jest.fn();
const mockFetchRooms = jest.fn();
const mockUpdateRoom = jest.fn();
const mockCreateBatchCycle = jest.fn();
const mockCreateEquipment = jest.fn();
const mockDeleteBatchCycle = jest.fn();
const mockListBatchCycles = jest.fn();
const mockListEquipment = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { ROOMS_EQUIPMENT_STAFF: "rooms_equipment_staff" },
  useEntitlements: () => ({
    facilityRole: "OWNER",
    can: () => true
  })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    selectedId: "facility-1"
  })
}));

jest.mock("@/api/rooms", () => ({
  createRoom: (...args: any[]) => mockCreateRoom(...args),
  deleteRoom: (...args: any[]) => mockDeleteRoom(...args),
  fetchRooms: (...args: any[]) => mockFetchRooms(...args),
  updateRoom: (...args: any[]) => mockUpdateRoom(...args)
}));

jest.mock("@/api/facilityWorkflows", () => ({
  createBatchCycle: (...args: any[]) => mockCreateBatchCycle(...args),
  createEquipment: (...args: any[]) => mockCreateEquipment(...args),
  deleteBatchCycle: (...args: any[]) => mockDeleteBatchCycle(...args),
  listBatchCycles: (...args: any[]) => mockListBatchCycles(...args),
  listEquipment: (...args: any[]) => mockListEquipment(...args)
}));

describe("FacilityRoomsTab", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFetchRooms.mockResolvedValue([
      {
        id: "room-existing",
        name: "Existing Dry Room",
        roomType: "dry",
        createdAt: "2026-07-07T00:00:00Z"
      }
    ]);
    mockListEquipment.mockResolvedValue([
      {
        id: "eq-existing",
        name: "Existing Dry Room Temp/RH",
        roomId: "room-existing",
        type: "sensor"
      }
    ]);
    mockListBatchCycles.mockResolvedValue([]);
    mockCreateRoom.mockImplementation((_facilityId, input) => ({
      id: `room-${String(input.name).toLowerCase().replaceAll(" ", "-")}`,
      ...input
    }));
    mockCreateEquipment.mockResolvedValue({ id: "eq-new" });
  });

  it("previews controller devices as facility rooms and creates missing rooms/devices", async () => {
    const screen = render(<FacilityRoomsTab />);

    await waitFor(() =>
      expect(screen.getByText("Controller Room Import Preview")).toBeTruthy()
    );
    expect(mockFetchRooms).toHaveBeenCalledWith("facility-1");

    fireEvent.changeText(screen.getByLabelText("Facility import provider"), "Pulse");
    fireEvent.changeText(
      screen.getByLabelText("Facility import device list"),
      "Flower Room 1 Temp/RH\nFlower Room 1 CO2\nVeg Room Temp/RH\nExisting Dry Room Temp/RH"
    );

    expect(screen.getByText("Flower Room 1")).toBeTruthy();
    expect(screen.getByText("Veg Room")).toBeTruthy();
    expect(screen.getAllByText("Existing Dry Room").length).toBeGreaterThan(1);
    expect(screen.getByText(/air_temperature, relative_humidity, co2/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Create imported facility rooms"));

    await waitFor(() =>
      expect(mockCreateRoom).toHaveBeenCalledWith("facility-1", {
        name: "Flower Room 1",
        roomType: "flower",
        trackingMode: "batch"
      })
    );
    expect(mockCreateRoom).toHaveBeenCalledWith("facility-1", {
      name: "Veg Room",
      roomType: "veg",
      trackingMode: "batch"
    });
    expect(mockCreateEquipment).toHaveBeenCalledWith("facility-1", {
      name: "Flower Room 1 Temp/RH",
      type: "sensor",
      roomId: "room-flower-room-1",
      status: "active",
      provider: "Pulse",
      metrics: ["air_temperature", "relative_humidity"],
      integrationMapping: expect.objectContaining({
        source: "facility_room_import_preview",
        provider: "Pulse",
        permissionLevel: "read-only",
        rawDeviceName: "Flower Room 1 Temp/RH",
        suggestedRoomName: "Flower Room 1",
        suggestedRoomType: "flower",
        normalizedMetrics: ["air_temperature", "relative_humidity"],
        sensorStreams: [
          expect.objectContaining({
            providerMetricKey: "air_temperature",
            normalizedMetric: "air_temperature",
            suggestedRoomName: "Flower Room 1",
            suggestedDeviceName: "Flower Room 1 Temp/RH"
          }),
          expect.objectContaining({
            providerMetricKey: "relative_humidity",
            normalizedMetric: "relative_humidity",
            suggestedRoomName: "Flower Room 1",
            suggestedDeviceName: "Flower Room 1 Temp/RH"
          })
        ]
      })
    });
    expect(mockCreateEquipment).toHaveBeenCalledWith("facility-1", {
      name: "Flower Room 1 CO2",
      type: "sensor",
      roomId: "room-flower-room-1",
      status: "active",
      provider: "Pulse",
      metrics: ["co2"],
      integrationMapping: expect.objectContaining({
        normalizedMetrics: ["co2"],
        rawDeviceName: "Flower Room 1 CO2"
      })
    });
    expect(mockCreateEquipment).toHaveBeenCalledWith("facility-1", {
      name: "Veg Room Temp/RH",
      type: "sensor",
      roomId: "room-veg-room",
      status: "active",
      provider: "Pulse",
      metrics: ["air_temperature", "relative_humidity"],
      integrationMapping: expect.objectContaining({
        normalizedMetrics: ["air_temperature", "relative_humidity"],
        rawDeviceName: "Veg Room Temp/RH"
      })
    });
    expect(mockCreateRoom).not.toHaveBeenCalledWith(
      "facility-1",
      expect.objectContaining({ name: "Existing Dry Room" })
    );
    expect(mockCreateEquipment).not.toHaveBeenCalledWith(
      "facility-1",
      expect.objectContaining({ name: "Existing Dry Room Temp/RH" })
    );
    await waitFor(() =>
      expect(screen.getByText("Created 2 rooms and 3 devices from Pulse.")).toBeTruthy()
    );
  });
});
