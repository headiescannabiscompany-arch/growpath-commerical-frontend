import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityAnalyticsRoute, {
  createFacilityAnalyticsStyles
} from "@/app/home/facility/(tabs)/analytics";
import { fetchFacilityAnalyticsOverview } from "@/api/facilityAnalytics";
import { getThemePalette } from "@/theme/appTheme";

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
let mockFacilityId: string | null = "facility-1";
let mockRole = "OWNER";
let mockAuth = { user: { id: "owner-1" }, token: "session-1" };
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockRole })
}));

const recorded = {
  roomStability: { stableRooms: 2, measuredRooms: 3, unknownRooms: 1 },
  taskCompletion: { total: 10, completed: 8, rate: 80 },
  sopCompliance: { applicableSteps: 20, completedSteps: 18, rate: 90 },
  sensorAlerts: { total: 4, recordedEvents: 120 },
  batches: { active: 3, completed: 7 },
  training: { staff: 6, assignments: 5, completedAssignments: 4, completionRate: 80 }
};
function pending() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter
}));

jest.mock("@/components/layout/AppPage", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children, header }: any) => React.createElement(View, null, header, children);
});

jest.mock("@/components/layout/AppCard", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});

jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacilityId })
}));

jest.mock("@/api/facilityAnalytics", () => ({
  fetchFacilityAnalyticsOverview: jest.fn()
}));

describe("FacilityAnalyticsRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchFacilityAnalyticsOverview).mockReset().mockResolvedValue(recorded);
    mockFacilityId = "facility-1";
    mockRole = "OWNER";
    mockAuth = { user: { id: "owner-1" }, token: "session-1" };
  });

  it("uses the active Night palette for headings and metric text", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilityAnalyticsStyles(palette);

    expect(styles.title.color).toBe(palette.text);
    expect(styles.subtitle.color).toBe(palette.textMuted);
    expect(styles.metric.borderColor).toBe(palette.border);
    expect(styles.value.color).toBe(palette.text);
    expect(styles.label.color).toBe(palette.text);
    expect(styles.detail.color).toBe(palette.textMuted);
  });

  it("renders recorded facility analytics and unknown stability coverage", async () => {
    jest.mocked(fetchFacilityAnalyticsOverview).mockResolvedValue({
      roomStability: { stableRooms: 2, measuredRooms: 3, unknownRooms: 1 },
      taskCompletion: { total: 10, completed: 8, rate: 80 },
      sopCompliance: { applicableSteps: 20, completedSteps: 18, rate: 90 },
      sensorAlerts: { total: 4, recordedEvents: 120 },
      batches: { active: 3, completed: 7 },
      training: { staff: 6, assignments: 5, completedAssignments: 4, completionRate: 80 }
    });

    const screen = render(<FacilityAnalyticsRoute />);
    expect(screen.getByLabelText("Loading facility analytics").props).toMatchObject({
      accessibilityLiveRegion: "polite",
      accessibilityRole: "progressbar"
    });
    await waitFor(() => expect(screen.getByText("2/3")).toBeTruthy());
    expect(fetchFacilityAnalyticsOverview).toHaveBeenCalledWith("facility-1");
    expect(
      screen.getByRole("header", { name: "Facility Analytics" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByText("1 rooms unknown")).toBeTruthy();
    expect(
      screen.getByRole("header", { name: "SOP compliance" }).props["aria-level"]
    ).toBe(2);
    expect(screen.getByRole("header", { name: "Sensor alerts" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Active batches" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Training completion" })).toBeTruthy();
    expect(
      screen.getByLabelText("Refresh facility analytics").props.accessibilityState
    ).toMatchObject({ busy: false, disabled: false });
  });

  it("redirects to Facility selection instead of loading forever without context", () => {
    mockFacilityId = null;

    render(<FacilityAnalyticsRoute />);

    expect(mockReplace).toHaveBeenCalledWith("/home/facility/select");
    expect(fetchFacilityAnalyticsOverview).not.toHaveBeenCalled();
  });

  it("prevents duplicate analytics refresh requests while one is pending", async () => {
    jest.mocked(fetchFacilityAnalyticsOverview).mockResolvedValue({} as any);
    const screen = render(<FacilityAnalyticsRoute />);
    await waitFor(() =>
      expect(
        screen.getByLabelText("Refresh facility analytics").props.accessibilityState
      ).toMatchObject({ busy: false, disabled: false })
    );
    const callsBeforeRefresh = jest.mocked(fetchFacilityAnalyticsOverview).mock.calls
      .length;
    jest
      .mocked(fetchFacilityAnalyticsOverview)
      .mockImplementation(() => new Promise(() => {}));
    const refresh = screen.getByLabelText("Refresh facility analytics");

    fireEvent.press(refresh);
    fireEvent.press(refresh);

    expect(fetchFacilityAnalyticsOverview).toHaveBeenCalledTimes(callsBeforeRefresh + 1);
    expect(
      screen.getByLabelText("Refresh facility analytics").props.accessibilityState
    ).toMatchObject({ busy: true, disabled: true });
    screen.unmount();
  });

  it("keeps metrics unknown during initial load, failure and read-only Retry", async () => {
    jest
      .mocked(fetchFacilityAnalyticsOverview)
      .mockRejectedValueOnce(new Error("offline"));
    const screen = render(<FacilityAnalyticsRoute />);
    expect(screen.queryByText("0/0")).toBeNull();
    expect(screen.queryByText("0%")).toBeNull();
    await screen.findByText("Analytics unavailable. Retry to load recorded metrics.");
    expect(screen.getAllByText("Unknown")).toHaveLength(6);
    expect(screen.queryByText("0 of 0 tasks")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh facility analytics"));
    await screen.findByText("8 of 10 tasks");
    expect(
      screen.queryByText("Analytics unavailable. Retry to load recorded metrics.")
    ).toBeNull();
    expect(fetchFacilityAnalyticsOverview).toHaveBeenCalledTimes(2);
  });

  it("labels retained metrics during refresh and failure, clearing the notice after Retry", async () => {
    const screen = render(<FacilityAnalyticsRoute />);
    await screen.findByText("8 of 10 tasks");
    jest
      .mocked(fetchFacilityAnalyticsOverview)
      .mockRejectedValueOnce(new Error("offline"));
    fireEvent.press(screen.getByLabelText("Refresh facility analytics"));
    expect(screen.getByText(/Previously loaded analytics shown/)).toBeTruthy();
    await screen.findByText("Retry analytics");
    expect(screen.getByText("8 of 10 tasks")).toBeTruthy();
    expect(
      screen.getByText(
        "Previously loaded analytics shown. Retry to refresh the recorded metrics."
      )
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Refresh facility analytics"));
    await waitFor(() =>
      expect(screen.queryByText(/Previously loaded analytics shown/)).toBeNull()
    );
  });

  it.each([null, [], "invalid"])(
    "rejects an unusable response %j without false zero metrics",
    async (result) => {
      jest.mocked(fetchFacilityAnalyticsOverview).mockResolvedValueOnce(result as any);
      const screen = render(<FacilityAnalyticsRoute />);
      await screen.findByText("Retry analytics");
      expect(screen.getAllByText("Unknown")).toHaveLength(6);
    }
  );

  it("preserves explicit recorded zeros but leaves absent, negative and malformed metrics unknown", async () => {
    jest.mocked(fetchFacilityAnalyticsOverview).mockResolvedValueOnce({
      taskCompletion: { rate: 0, completed: 0, total: 0 },
      sopCompliance: { rate: 101, completedSteps: -1, applicableSteps: "0" },
      batches: { active: null, completed: 0 },
      sensorAlerts: { total: -4, recordedEvents: 1.2 },
      training: { completionRate: NaN }
    });
    const screen = render(<FacilityAnalyticsRoute />);
    await screen.findByText("0 of 0 tasks");
    expect(screen.getAllByText("0%")).toHaveLength(1);
    expect(screen.getByText("SOP step counts unavailable")).toBeTruthy();
    expect(screen.getByText("Event coverage unavailable")).toBeTruthy();
    expect(screen.getByText("0 completed runs")).toBeTruthy();
    expect(screen.getByText("Training coverage unavailable")).toBeTruthy();
  });

  it.each(["account", "session", "facility", "role"])(
    "discards old metrics and late reads on %s change",
    async (change) => {
      const screen = render(<FacilityAnalyticsRoute />);
      await screen.findByText("8 of 10 tasks");
      const old = pending();
      const fresh = pending();
      jest
        .mocked(fetchFacilityAnalyticsOverview)
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(fresh.promise);
      fireEvent.press(screen.getByLabelText("Refresh facility analytics"));
      if (change === "account") mockAuth = { ...mockAuth, user: { id: "owner-2" } };
      if (change === "session") mockAuth = { ...mockAuth, token: "session-2" };
      if (change === "facility") mockFacilityId = "facility-2";
      if (change === "role") mockRole = "VIEWER";
      screen.rerender(<FacilityAnalyticsRoute />);
      expect(screen.queryByText("8 of 10 tasks")).toBeNull();
      await act(async () => old.resolve(recorded));
      expect(screen.queryByText("8 of 10 tasks")).toBeNull();
      await act(async () =>
        fresh.resolve({
          ...recorded,
          taskCompletion: { total: 20, completed: 2, rate: 10 }
        })
      );
      expect(screen.getByText("2 of 20 tasks")).toBeTruthy();
    }
  );

  it("ignores a late read after unmount", async () => {
    const late = pending();
    jest.mocked(fetchFacilityAnalyticsOverview).mockReturnValueOnce(late.promise);
    const screen = render(<FacilityAnalyticsRoute />);
    screen.unmount();
    await act(async () => late.resolve(recorded));
    expect(fetchFacilityAnalyticsOverview).toHaveBeenCalledTimes(1);
  });
});
