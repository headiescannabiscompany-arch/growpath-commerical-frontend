import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import Plants from "@/app/home/facility/(tabs)/plants";
import Journal from "@/app/home/facility/(tabs)/logs";

const mockApi = jest.fn();
const mockCreate = jest.fn();
const mockMap = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockFacility = "facility-1";
let mockRole = "OWNER";
let mockToken = "session-1";
let mockParams: Record<string, string> = { growId: "grow-1" };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "qa" }, token: mockToken })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacility })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { PLANTS_WRITE: "plants", GROWLOGS_WRITE: "logs" },
  useEntitlements: () => ({ facilityRole: mockRole, can: () => true })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApi(...args)
}));
jest.mock("@/api/plants", () => ({
  createPlant: (...args: any[]) => mockCreate(...args)
}));
jest.mock("@/features/facility/useFacilityRooms", () => ({
  useFacilityRooms: () => ({ rooms: [] })
}));
jest.mock("@/features/facility/useFacilityGrows", () => ({
  useFacilityGrows: () => ({ grows: [] })
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

describe.each([
  {
    name: "plants",
    Component: Plants,
    refresh: "Refresh facility plants",
    input: "Plant name",
    save: "Create facility plant",
    unknown: "Plant count unknown",
    empty: "No plants yet",
    unavailable: "Plants unavailable. Retry to load current records.",
    stale:
      "Previously loaded plants — refresh failed. These are not current verified counts."
  },
  {
    name: "journal",
    Component: Journal,
    refresh: "Refresh facility journal",
    input: "Facility journal title",
    save: "Save facility journal entry",
    unknown: "Journal count unknown",
    empty: "No log entries yet",
    unavailable: "Journal unavailable. Retry to load current records.",
    stale:
      "Previously loaded journal — refresh failed. These are not current verified counts."
  }
])(
  "Facility $name readiness",
  ({ name, Component, refresh, input, save, unknown, empty, unavailable, stale }) => {
    const rows = (title = "Saved record") =>
      name === "plants"
        ? { plants: [{ id: "row-1", name: title }] }
        : { growlogs: [{ id: "row-1", title }] };
    beforeEach(() => {
      jest.clearAllMocks();
      mockApi.mockReset();
      mockCreate.mockReset();
      mockFacility = "facility-1";
      mockRole = "OWNER";
      mockToken = "session-1";
      mockParams = { growId: "grow-1" };
      mockMap.mockReturnValue({ message: "Mapped request error" });
      mockApi.mockResolvedValue(rows());
      mockCreate.mockResolvedValue({ id: "created" });
    });

    it("keeps initial and failed counts unknown, maps errors and offers Retry", async () => {
      mockApi.mockRejectedValue(new Error("offline"));
      const screen = render(<Component />);
      expect(screen.getByText(unknown)).toBeTruthy();
      expect(screen.queryByText(empty)).toBeNull();
      await screen.findByText(unavailable);
      expect(screen.getByText("Mapped request error")).toBeTruthy();
      expect(mockMap).toHaveBeenCalled();
      fireEvent.changeText(screen.getByLabelText(input), "Unsaved draft");
      expect(screen.getByLabelText(save).props.accessibilityState.disabled).toBe(true);
      fireEvent.press(screen.getByLabelText(save));
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockApi.mock.calls.some(([, opts]) => opts?.method === "POST")).toBe(false);
      mockApi.mockResolvedValue(rows());
      fireEvent.press(screen.getByLabelText(refresh));
      await screen.findByText("Saved record");
      expect(screen.getByLabelText(input).props.value).toBe("Unsaved draft");
      expect(screen.queryByText(unknown)).toBeNull();
      expect(screen.getByLabelText(save).props.accessibilityState.disabled).toBe(false);
    });

    it("labels retained data on refresh failure and preserves unfinished input", async () => {
      const screen = render(<Component />);
      await screen.findByText("Saved record");
      fireEvent.changeText(screen.getByLabelText(input), "Draft retained");
      mockApi.mockRejectedValue(new Error("offline"));
      fireEvent.press(screen.getByLabelText(refresh));
      await screen.findByText(stale);
      expect(screen.getByText("Saved record")).toBeTruthy();
      expect(screen.getByLabelText(input).props.value).toBe("Draft retained");
      expect(screen.getByLabelText(save).props.accessibilityState.disabled).toBe(true);
      mockApi.mockResolvedValue(rows("Recovered record"));
      fireEvent.press(screen.getByLabelText(refresh));
      await screen.findByText("Recovered record");
      expect(screen.queryByText(stale)).toBeNull();
    });

    it.each(["facility", "role", "session", "grow"])(
      "clears drafts and ignores late reads across %s changes",
      async (change) => {
        const screen = render(<Component />);
        await screen.findByText("Saved record");
        fireEvent.changeText(screen.getByLabelText(input), "Old draft");
        let finishOld!: (value: any) => void;
        mockApi.mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finishOld = resolve;
            })
        );
        fireEvent.press(screen.getByLabelText(refresh));
        if (change === "facility") mockFacility = "facility-2";
        if (change === "role") mockRole = "VIEWER";
        if (change === "session") mockToken = "session-2";
        if (change === "grow") mockParams = { growId: "grow-2" };
        mockApi.mockResolvedValue(rows("Current record"));
        screen.rerender(<Component />);
        await screen.findByText("Current record");
        await act(async () => finishOld(rows("Late old record")));
        expect(screen.queryByText("Late old record")).toBeNull();
        expect(screen.queryByText("Saved record")).toBeNull();
        expect(screen.queryByLabelText(input)?.props.value || "").toBe("");
      }
    );

    it("serializes reads and writes without clearing a failed-save draft", async () => {
      const screen = render(<Component />);
      await screen.findByText("Saved record");
      fireEvent.changeText(screen.getByLabelText(input), "Keep failed draft");
      let failSave!: (reason: Error) => void;
      const pendingSave = new Promise((_resolve, reject) => {
        failSave = reject;
      });
      if (name === "plants") mockCreate.mockImplementation(() => pendingSave);
      else
        mockApi.mockImplementation((_url, opts) =>
          opts?.method === "POST" ? pendingSave : Promise.resolve(rows())
        );
      fireEvent.press(screen.getByLabelText(save));
      const count = mockApi.mock.calls.length;
      expect(screen.getByLabelText(refresh).props.accessibilityState.disabled).toBe(true);
      fireEvent.press(screen.getByLabelText(refresh));
      expect(mockApi).toHaveBeenCalledTimes(count);
      await act(async () => failSave(new Error("save unavailable")));
      await screen.findByText("Mapped request error");
      expect(screen.getByLabelText(input).props.value).toBe("Keep failed draft");
      expect(screen.getByLabelText(input).props.editable).toBe(true);
    });

    it("blocks writes during a pending refresh", async () => {
      const screen = render(<Component />);
      await screen.findByText("Saved record");
      fireEvent.changeText(screen.getByLabelText(input), "Draft");
      let finish!: (value: any) => void;
      mockApi.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          })
      );
      fireEvent.press(screen.getByLabelText(refresh));
      expect(screen.getByLabelText(save).props.accessibilityState.disabled).toBe(true);
      fireEvent.press(screen.getByLabelText(save));
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockApi.mock.calls.some(([, opts]) => opts?.method === "POST")).toBe(false);
      await act(async () => finish(rows()));
      await waitFor(() =>
        expect(screen.getByLabelText(save).props.accessibilityState.disabled).toBe(false)
      );
    });

    it("ignores an old save completion after changing grow context", async () => {
      const screen = render(<Component />);
      await screen.findByText("Saved record");
      fireEvent.changeText(screen.getByLabelText(input), "Old save");
      let finish!: (value: any) => void;
      const pending = new Promise((resolve) => {
        finish = resolve;
      });
      if (name === "plants") mockCreate.mockImplementation(() => pending);
      else
        mockApi.mockImplementation((_url, opts) =>
          opts?.method === "POST" ? pending : Promise.resolve(rows())
        );
      fireEvent.press(screen.getByLabelText(save));
      mockParams = { growId: "grow-2" };
      screen.rerender(<Component />);
      await screen.findByText("Saved record");
      fireEvent.changeText(screen.getByLabelText(input), "New context draft");
      const requests = mockApi.mock.calls.length;
      await act(async () => finish({ id: "saved" }));
      expect(screen.getByLabelText(input).props.value).toBe("New context draft");
      expect(mockApi).toHaveBeenCalledTimes(requests);
      expect(screen.queryByText(/Plant created\.|Journal entry saved/)).toBeNull();
    });
  }
);
