import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import Inventory from "@/app/home/facility/(tabs)/inventory";
import Sops from "@/features/facility/routes/FacilitySopRunsIndexRoute";

const mockApi = jest.fn();
const mockMap = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockFacility = "facility-1";
let mockRole = "OWNER";
let mockToken = "session-1";
let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  Link: ({ children }: any) => children
}));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: any) => require("react").useEffect(cb, [cb])
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "qa" }, token: mockToken })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacility })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    INVENTORY_WRITE: "inventory",
    AUDIT_READ: "audit",
    SOP_RUNS_WRITE: "sops"
  },
  useEntitlements: () => ({ facilityRole: mockRole, can: () => mockRole === "OWNER" })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApi(...args)
}));
jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({ toInlineError: mockMap })
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/components/InlineError", () => ({
  InlineError: ({ error }: any) =>
    require("react").createElement(require("react-native").Text, null, error?.message)
}));
jest.mock("@/components/inventory/BusinessInventoryImportPanel", () => ({
  BusinessInventoryImportPanel: () => null
}));

describe.each([
  {
    name: "inventory",
    Component: Inventory,
    refresh: "Reload inventory",
    empty: "No inventory items yet.",
    unavailable: "Inventory unavailable. Retry to load current records.",
    action: "Create inventory item",
    stale:
      "Previously loaded inventory — refresh failed. These are not current verified counts."
  },
  {
    name: "sops",
    Component: Sops,
    refresh: "Refresh facility SOP runs",
    empty: "No SOP runs found.",
    unavailable: "SOP runs unavailable. Retry to load current records.",
    action: "Start SOP run",
    stale:
      "Previously loaded SOP runs — refresh failed. These are not current verified counts."
  }
])(
  "Facility $name list readiness",
  ({ name, Component, refresh, empty, unavailable, action, stale }) => {
    const rows = (title = "Saved record") =>
      name === "inventory"
        ? { items: [{ id: "row-1", name: title, quantity: 4, unit: "ea" }] }
        : { runs: [{ id: "row-1", title, steps: [], status: "active" }] };
    beforeEach(() => {
      jest.clearAllMocks();
      mockApi.mockReset();
      mockFacility = "facility-1";
      mockRole = "OWNER";
      mockToken = "session-1";
      mockParams = {};
      mockMap.mockReturnValue({ message: "Mapped error" });
      mockApi.mockResolvedValue(rows());
    });
    it("does not invent an empty list after initial failure and retries without a write", async () => {
      mockApi.mockRejectedValue(new Error("offline"));
      const screen = render(<Component />);
      expect(screen.queryByText(empty)).toBeNull();
      await screen.findByText(unavailable);
      expect(screen.getByText("Mapped error")).toBeTruthy();
      expect(screen.queryByText(empty)).toBeNull();
      expect(screen.queryByText("0 items")).toBeNull();
      expect(screen.queryAllByText("0/0")).toHaveLength(0);
      expect(screen.getByLabelText(action).props.accessibilityState.disabled).toBe(true);
      fireEvent.press(screen.getByLabelText(action));
      expect(mockRouter.push).not.toHaveBeenCalled();
      mockApi.mockResolvedValue(rows());
      fireEvent.press(screen.getByLabelText(refresh));
      await screen.findByText("Saved record");
      expect(screen.queryByText(unavailable)).toBeNull();
      expect(screen.getByLabelText(action).props.accessibilityState.disabled).toBe(false);
      expect(mockApi.mock.calls.every(([, options]) => !options?.method)).toBe(true);
    });
    it("retains and labels the last successful records, then recovers", async () => {
      const screen = render(<Component />);
      await screen.findByText("Saved record");
      if (name === "inventory")
        fireEvent.changeText(screen.getByLabelText("Search facility inventory"), "Saved");
      mockApi.mockRejectedValue(new Error("offline"));
      fireEvent.press(screen.getByLabelText(refresh));
      await screen.findByText(stale);
      expect(screen.getByText("Saved record")).toBeTruthy();
      expect(screen.getByLabelText(action).props.accessibilityState.disabled).toBe(true);
      if (name === "inventory") {
        expect(screen.getByLabelText("Search facility inventory").props.value).toBe(
          "Saved"
        );
        expect(
          screen.getByLabelText("Export facility inventory CSV").props.accessibilityState
            .disabled
        ).toBe(true);
      }
      mockApi.mockResolvedValue(rows("Saved updated"));
      fireEvent.press(screen.getByLabelText(refresh));
      await screen.findByText("Saved updated");
      expect(screen.queryByText(stale)).toBeNull();
    });
    it("prevents duplicate refreshes and keeps the current list visible", async () => {
      const screen = render(<Component />);
      await screen.findByText("Saved record");
      let resolve: any;
      mockApi.mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          })
      );
      fireEvent.press(screen.getByLabelText(refresh));
      fireEvent.press(screen.getByLabelText(refresh));
      expect(mockApi).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Saved record")).toBeTruthy();
      expect(screen.getByLabelText(refresh).props.accessibilityState.busy).toBe(true);
      await act(async () => resolve(rows()));
      expect(screen.getByLabelText(refresh).props.accessibilityState.disabled).toBe(
        false
      );
    });
    it("shows a real empty state only after a successful read", async () => {
      mockApi.mockResolvedValue({ items: [], runs: [] });
      const screen = render(<Component />);
      await screen.findByText(empty);
      expect(screen.queryByText(unavailable)).toBeNull();
    });
    it.each(["facility", "session", "role", "route"])(
      "discards a late response after changing %s",
      async (boundary) => {
        let resolve: any;
        mockApi.mockImplementationOnce(
          () =>
            new Promise((r) => {
              resolve = r;
            })
        );
        const screen = render(<Component />);
        if (boundary === "facility") mockFacility = "facility-2";
        if (boundary === "session") mockToken = "session-2";
        if (boundary === "role") mockRole = "VIEWER";
        if (boundary === "route") mockParams = { growId: "grow-2" };
        screen.rerender(<Component />);
        await screen.findByText("Saved record");
        await act(async () => resolve(rows("Old context record")));
        expect(screen.queryByText("Old context record")).toBeNull();
        expect(screen.getByText("Saved record")).toBeTruthy();
        if (boundary === "role") expect(screen.queryByLabelText(action)).toBeNull();
      }
    );
    it("uses a fallback when error mapping does not return inline feedback", async () => {
      mockMap.mockReturnValue(null);
      mockApi.mockRejectedValue(new Error("offline"));
      const screen = render(<Component />);
      await screen.findByText(unavailable);
      await waitFor(() =>
        expect(
          screen.getByText(
            "Unable to read or update this record. Check your access and try again."
          )
        ).toBeTruthy()
      );
    });
  }
);
