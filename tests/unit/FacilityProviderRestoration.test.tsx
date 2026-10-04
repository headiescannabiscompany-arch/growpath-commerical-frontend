import React from "react";
import { Text } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { FacilityProvider } from "@/facility/FacilityProvider";
import FacilityLayout from "@/app/home/facility/_layout";
import { resetFacilityStore, useFacility } from "@/state/useFacility";

const mockGetFacilities = jest.fn();
const mockSetMode = jest.fn();
const mockOperationalRead = jest.fn();
let mockPath = "/home/facility/team";
const row = { id: "db-1", canonicalFacilityId: "public:facility-1", name: "QA Facility" };
jest.mock("@/api/facilities", () => ({ getFacilities: () => mockGetFacilities() }));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner-1" }, token: "session-1" })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: true,
    mode: "facility",
    facilityId: "public:facility-1",
    facilityRole: "OWNER"
  })
}));
jest.mock("@/state/useAccountMode", () => ({
  useAccountMode: () => ({ setMode: mockSetMode })
}));
jest.mock("expo-router", () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ replace: jest.fn() }),
  Stack: () => {
    const React = require("react");
    const { Text } = require("react-native");
    const { selectedId } = require("@/state/useFacility").useFacility();
    React.useEffect(() => {
      mockOperationalRead(selectedId);
    }, [selectedId]);
    return React.createElement(Text, null, `Operational Facility ${selectedId}`);
  },
  Redirect: () => null
}));

function Selection() {
  const { selectedId } = useFacility();
  return <Text>{`Selection ${selectedId || "none"}`}</Text>;
}
function App() {
  return (
    <FacilityProvider>
      <Selection />
      <FacilityLayout />
    </FacilityProvider>
  );
}
beforeEach(() => {
  resetFacilityStore();
  jest.clearAllMocks();
  mockGetFacilities.mockReset().mockResolvedValue([row]);
  mockPath = "/home/facility/team";
});
afterEach(() => resetFacilityStore());

it("holds operational routes until the real provider and route restore an exact row", async () => {
  let resolve!: (rows: any[]) => void;
  mockGetFacilities.mockReturnValueOnce(
    new Promise((r) => {
      resolve = r;
    })
  );
  const screen = render(<App />);
  expect(screen.getByText("Selection none")).toBeTruthy();
  expect(mockOperationalRead).not.toHaveBeenCalled();
  expect(mockGetFacilities).toHaveBeenCalledTimes(1);
  await act(async () => resolve([{ id: "unrelated", name: "Other" }, row]));
  await waitFor(() => expect(screen.getByText("Operational Facility db-1")).toBeTruthy());
  expect(mockOperationalRead).toHaveBeenCalledTimes(1);
  expect(mockOperationalRead).toHaveBeenCalledWith("db-1");
  expect(mockSetMode).toHaveBeenCalledWith("facility");
});

it("cannot bypass failed restoration with a provider placeholder or first-row fallback", async () => {
  mockGetFacilities.mockResolvedValueOnce([{ id: "unrelated", name: "Other" }]);
  const screen = render(<App />);
  const retry = await screen.findByLabelText("Retry Facility selection");
  expect(screen.getByText("Selection none")).toBeTruthy();
  expect(mockOperationalRead).not.toHaveBeenCalled();
  fireEvent.press(retry);
  await waitFor(() => expect(screen.getByText("Operational Facility db-1")).toBeTruthy());
  expect(mockGetFacilities).toHaveBeenCalledTimes(2);
});

it("keeps failed reads unselected and allows retry", async () => {
  mockGetFacilities.mockRejectedValueOnce(new Error("offline"));
  const screen = render(<App />);
  const retry = await screen.findByLabelText("Retry Facility selection");
  expect(mockOperationalRead).not.toHaveBeenCalled();
  fireEvent.press(retry);
  await waitFor(() => expect(mockOperationalRead).toHaveBeenCalledWith("db-1"));
});

it("does not start background selection outside the Facility route boundary", () => {
  const screen = render(
    <FacilityProvider>
      <Selection />
    </FacilityProvider>
  );
  expect(screen.getByText("Selection none")).toBeTruthy();
  expect(mockGetFacilities).not.toHaveBeenCalled();
});
