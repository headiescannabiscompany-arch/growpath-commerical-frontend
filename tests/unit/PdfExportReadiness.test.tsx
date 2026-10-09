import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import PdfExportScreen from "@/app/home/personal/(tabs)/tools/pdf-export";
import { listToolRuns } from "@/api/toolRuns";
import {
  getWorkspaceGrow,
  getWorkspaceGrowTimeline,
  listWorkspaceGrows,
  listWorkspaceLogs,
  listWorkspacePlants,
  listWorkspaceTasks
} from "@/features/grows/workspaceData";
import { exportToCsv } from "@/utils/exportToCsv";
import { exportVisualTimeline } from "@/utils/exportVisualTimeline";

const mockParams = jest.fn();
const mockAuth = jest.fn();
const mockAccess = jest.fn();
const mockRetryMe = jest.fn();
const mockCan = jest.fn();
const mockSurface = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams(),
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => false })
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth() }));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TOOL_PDF_EXPORT: "TOOL_PDF_EXPORT" },
  useEntitlements: () => mockAccess()
}));
jest.mock("@/api/toolRuns", () => ({ listToolRuns: jest.fn() }));
jest.mock("@/features/grows/workspaceData", () => ({
  getWorkspaceGrow: jest.fn(),
  getWorkspaceGrowTimeline: jest.fn(),
  listWorkspaceGrows: jest.fn(),
  listWorkspaceLogs: jest.fn(),
  listWorkspacePlants: jest.fn(),
  listWorkspaceTasks: jest.fn()
}));
jest.mock("@/utils/exportToCsv", () => ({ exportToCsv: jest.fn() }));
jest.mock("@/utils/exportVisualTimeline", () => ({
  exportVisualTimeline: jest.fn(),
  timelineSummaryForExport: (value: unknown) => String(value || "")
}));
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/features/personal/tools/LockedToolCard", () => {
  const { Text } = require("react-native");
  return () => <Text>Export locked</Text>;
});
jest.mock("@/features/personal/tools/ToolResultSurface", () => {
  const { Text, View, Pressable } = require("react-native");
  return (props: any) => {
    mockSurface(props);
    return (
      <View>
        <Text>{props.status}</Text>
        <Text>{props.summary}</Text>
        {props.metrics?.map((metric: any) => (
          <Text key={metric.key}>{`${metric.label}: ${metric.value}`}</Text>
        ))}
        {props.details}
        {props.actions?.map((action: any) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: Boolean(action.disabled) }}
            disabled={action.disabled}
            onPress={action.onPress}
          >
            <Text>{action.label}</Text>
          </Pressable>
        ))}
        <Text>{props.feedback}</Text>
      </View>
    );
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const log = (title: string) => ({
  id: title,
  title,
  date: "2026-10-09",
  notes: "Saved note"
});

describe("export data readiness", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams.mockReturnValue({ growId: "grow-1", presentation: "timeline" });
    mockAuth.mockReturnValue({
      user: { id: "owner-1", role: "user" },
      token: "session-1",
      isAuthed: true,
      isHydrating: false,
      meStatus: "ready",
      retryMe: mockRetryMe
    });
    mockCan.mockReturnValue(true);
    mockAccess.mockReturnValue({ ready: true, mode: "personal", can: mockCan });
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([
      { id: "grow-1", name: "Tomatoes" }
    ]);
    (getWorkspaceGrow as jest.Mock).mockResolvedValue(null);
    for (const loader of [
      listWorkspaceLogs,
      listWorkspacePlants,
      listWorkspaceTasks,
      listToolRuns,
      getWorkspaceGrowTimeline
    ]) {
      (loader as jest.Mock).mockResolvedValue([]);
    }
    (exportToCsv as jest.Mock).mockResolvedValue({ method: "web-download" });
    (exportVisualTimeline as jest.Mock).mockResolvedValue("web-download");
  });

  it("withholds readiness, counts and export controls while any required read is pending", async () => {
    const pending = deferred<any[]>();
    (listWorkspaceLogs as jest.Mock).mockReturnValue(pending.promise);
    const screen = render(<PdfExportScreen />);
    expect(screen.getByText("Loading export data…")).toBeTruthy();
    expect(screen.queryByText("READY")).toBeNull();
    expect(screen.queryByText("Logs: 0")).toBeNull();
    expect(screen.queryByLabelText("Export CSV")).toBeNull();
    await act(async () => pending.resolve([log("Current note")]));
    await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());
  });

  it("makes a failed read retryable without claiming a valid empty export", async () => {
    (listWorkspaceLogs as jest.Mock).mockRejectedValueOnce(new Error("offline"));
    const screen = render(<PdfExportScreen />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load export data.")).toBeTruthy()
    );
    expect(screen.queryByText("READY")).toBeNull();
    expect(screen.queryByLabelText("Export CSV")).toBeNull();
    fireEvent.press(screen.getByLabelText("Retry export data"));
    await waitFor(() =>
      expect(screen.getByText("No records are available to export.")).toBeTruthy()
    );
    expect(screen.getByLabelText("Export CSV").props.accessibilityState.disabled).toBe(
      true
    );
  });

  it("drops the previous grow and ignores its late response", async () => {
    const previous = deferred<any[]>();
    (listWorkspaceLogs as jest.Mock).mockReturnValueOnce(previous.promise);
    const screen = render(<PdfExportScreen />);
    mockParams.mockReturnValue({ growId: "grow-2" });
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([
      { id: "grow-2", name: "Peppers" }
    ]);
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Current grow")]);
    screen.rerender(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText(/Current grow/)).toBeTruthy());
    await act(async () => previous.resolve([log("Previous grow")]));
    expect(screen.queryByText(/Previous grow/)).toBeNull();
    expect(screen.getByText(/Current grow/)).toBeTruthy();
  });

  it.each([
    ["grows", listWorkspaceGrows],
    ["logs", listWorkspaceLogs],
    ["plants", listWorkspacePlants],
    ["tasks", listWorkspaceTasks],
    ["runs", listToolRuns],
    ["timeline", getWorkspaceGrowTimeline]
  ])("withholds the complete package when %s fail", async (_name, loader) => {
    (loader as jest.Mock).mockRejectedValue(new Error("private transport details"));
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByLabelText("Retry export data")).toBeTruthy());
    expect(screen.queryByText("READY")).toBeNull();
    expect(screen.queryByText("EMPTY")).toBeNull();
    expect(screen.queryByText(/private transport details/)).toBeNull();
    expect(exportToCsv).not.toHaveBeenCalled();
    expect(exportVisualTimeline).not.toHaveBeenCalled();
  });

  it("serializes Retry and requests strict reads without changing the data source", async () => {
    (listWorkspaceLogs as jest.Mock).mockRejectedValueOnce(new Error("offline"));
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByLabelText("Retry export data")).toBeTruthy());
    const pending = deferred<any[]>();
    (listWorkspaceLogs as jest.Mock).mockReturnValue(pending.promise);
    const retry = screen.getByLabelText("Retry export data");
    act(() => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(listWorkspaceLogs).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Loading export data…")).toBeTruthy();
    expect(listWorkspaceGrows).toHaveBeenLastCalledWith("personal", {
      throwOnError: true,
      verifyRecords: true
    });
    for (const loader of [
      listWorkspaceLogs,
      listWorkspacePlants,
      listWorkspaceTasks,
      getWorkspaceGrowTimeline
    ]) {
      expect(loader).toHaveBeenLastCalledWith("personal", "grow-1", {
        throwOnError: true,
        verifyRecords: true
      });
    }
    expect(listToolRuns).toHaveBeenLastCalledWith({
      workspaceType: "personal",
      growId: "grow-1"
    });
    await act(async () => pending.resolve([]));
    expect(screen.getByText("EMPTY")).toBeTruthy();
  });

  it("does not export a selected grow missing from the current owner list", async () => {
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([]);
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Unavailable grow")]);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByLabelText("Retry export data")).toBeTruthy());
    expect(screen.queryByText(/Unavailable grow/)).toBeNull();
    expect(screen.queryByLabelText("Export CSV")).toBeNull();
    expect(screen.getByLabelText("Back")).toBeTruthy();
  });

  it("keeps whole-workspace aggregation and lists grows once", async () => {
    mockParams.mockReturnValue({});
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([
      { id: "grow-1" },
      { id: "grow-2" }
    ]);
    (listWorkspaceLogs as jest.Mock).mockImplementation(async (_workspace, growId) => [
      log(growId)
    ]);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("Logs: 2")).toBeTruthy());
    expect(listWorkspaceGrows).toHaveBeenCalledTimes(1);
    expect(getWorkspaceGrowTimeline).not.toHaveBeenCalled();
    expect(listToolRuns).toHaveBeenCalledWith({ workspaceType: "personal" });
    expect(screen.queryByLabelText("Export Visual Timeline")).toBeNull();
  });

  it("preserves explicit CSV and visual timeline delivery", async () => {
    const events = [{ id: "event-1", kind: "log", title: "Saved observation" }];
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Tomatoes note")]);
    (getWorkspaceGrowTimeline as jest.Mock).mockResolvedValue(events);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());
    expect(exportToCsv).not.toHaveBeenCalled();
    expect(exportVisualTimeline).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(screen.getByLabelText("Export CSV")));
    expect(exportToCsv).toHaveBeenCalledWith(
      "growpath-export",
      expect.arrayContaining([expect.objectContaining({ title: "Tomatoes note" })]),
      expect.any(Array)
    );
    await act(async () =>
      fireEvent.press(screen.getByLabelText("Export Visual Timeline"))
    );
    expect(exportVisualTimeline).toHaveBeenCalledWith(
      "Tomatoes — Visual Grow Timeline",
      events
    );
    expect(screen.getByText("Viewer-friendly timeline download prepared.")).toBeTruthy();
  });

  it.each(["account", "session", "grow", "workspace", "capability", "facility"])(
    "discards loaded rows and captured export callbacks after %s changes",
    async (change) => {
      (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Prior scope note")]);
      (getWorkspaceGrowTimeline as jest.Mock).mockResolvedValue([
        { id: "event-1", kind: "log" }
      ]);
      const screen = render(<PdfExportScreen />);
      await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());
      const oldActions = mockSurface.mock.calls.at(-1)![0].actions;
      const next = deferred<any[]>();
      (listWorkspaceLogs as jest.Mock).mockReturnValue(next.promise);
      if (change === "account")
        mockAuth.mockReturnValue({ ...mockAuth(), user: { id: "owner-2" } });
      if (change === "session")
        mockAuth.mockReturnValue({ ...mockAuth(), token: "session-2" });
      if (change === "grow") mockParams.mockReturnValue({ growId: "grow-2" });
      if (change === "workspace")
        mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
      if (change === "facility")
        mockAccess.mockReturnValue({
          ...mockAccess(),
          mode: "facility",
          facilityId: "facility-1"
        });
      if (change === "capability") mockCan.mockReturnValue(false);
      screen.rerender(
        <PdfExportScreen
          workspaceType={change === "workspace" ? "commercial" : "personal"}
        />
      );
      expect(screen.queryByText(/Prior scope note/)).toBeNull();
      await act(async () => {
        for (const action of oldActions) await action.onPress();
      });
      expect(exportToCsv).not.toHaveBeenCalled();
      expect(exportVisualTimeline).not.toHaveBeenCalled();
      if (change === "facility" || change === "capability")
        expect(listWorkspaceLogs).toHaveBeenCalledTimes(1);
      await act(async () => next.resolve([]));
    }
  );

  it("ignores an older A response after A to B to A navigation", async () => {
    const oldA = deferred<any[]>();
    (listWorkspaceLogs as jest.Mock).mockReturnValueOnce(oldA.promise);
    const screen = render(<PdfExportScreen />);
    mockParams.mockReturnValue({ growId: "grow-2" });
    screen.rerender(<PdfExportScreen />);
    mockParams.mockReturnValue({ growId: "grow-1" });
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("New A")]);
    screen.rerender(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText(/New A/)).toBeTruthy());
    await act(async () => oldA.resolve([log("Old A")]));
    expect(screen.queryByText(/Old A/)).toBeNull();
    expect(screen.getByText(/New A/)).toBeTruthy();
  });

  it("waits for settled access and retries session bootstrap without calling export readers", async () => {
    mockAccess.mockReturnValue({
      ...mockAccess(),
      ready: false,
      bootstrapError: "offline"
    });
    const recovery = deferred<void>();
    mockRetryMe.mockReturnValue(recovery.promise);
    const screen = render(<PdfExportScreen />);
    expect(screen.getByText("Unable to verify export access.")).toBeTruthy();
    expect(screen.queryByText("Export locked")).toBeNull();
    const retry = screen.getByLabelText("Retry export access");
    act(() => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
    expect(listWorkspaceGrows).not.toHaveBeenCalled();
    await act(async () => recovery.resolve());
    mockAccess.mockReturnValue({ ...mockAccess(), ready: true, bootstrapError: null });
    screen.rerender(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
  });

  it.each(["hydrating", "signed-out", "locked", "facility"])(
    "does not read private records for %s state",
    (state) => {
      if (state === "hydrating")
        mockAuth.mockReturnValue({ ...mockAuth(), isHydrating: true });
      if (state === "signed-out")
        mockAuth.mockReturnValue({ ...mockAuth(), isAuthed: false, user: null });
      if (state === "locked") mockCan.mockReturnValue(false);
      if (state === "facility")
        mockAccess.mockReturnValue({ ...mockAccess(), mode: "facility" });
      const screen = render(<PdfExportScreen />);
      expect(listWorkspaceGrows).not.toHaveBeenCalled();
      expect(listToolRuns).not.toHaveBeenCalled();
      expect(screen.queryByText("READY")).toBeNull();
    }
  );

  it("does not leak feedback from delivery already started in an old scope", async () => {
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Saved note")]);
    const delivery = deferred<{ method: string }>();
    (exportToCsv as jest.Mock).mockReturnValue(delivery.promise);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("Export CSV"));
    mockAuth.mockReturnValue({ ...mockAuth(), token: "session-2" });
    screen.rerender(<PdfExportScreen />);
    await act(async () => delivery.resolve({ method: "web-download" }));
    expect(screen.queryByText("CSV download prepared.")).toBeNull();
    expect(exportToCsv).toHaveBeenCalledTimes(1);
  });

  it("does not start deferred whole-workspace child reads after unmount", async () => {
    mockParams.mockReturnValue({});
    const pending = deferred<any[]>();
    (listWorkspaceGrows as jest.Mock).mockReturnValue(pending.promise);
    const screen = render(<PdfExportScreen />);
    screen.unmount();
    await act(async () => pending.resolve([{ id: "grow-1" }]));
    expect(listWorkspaceLogs).not.toHaveBeenCalled();
    expect(listWorkspacePlants).not.toHaveBeenCalled();
    expect(listWorkspaceTasks).not.toHaveBeenCalled();
  });

  it("ignores an old account's late error after a successful new account read", async () => {
    const oldRead = deferred<any[]>();
    (listWorkspaceLogs as jest.Mock).mockReturnValueOnce(oldRead.promise);
    const screen = render(<PdfExportScreen />);
    mockAuth.mockReturnValue({
      ...mockAuth(),
      user: { id: "owner-2" },
      token: "session-2"
    });
    screen.rerender(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
    await act(async () => oldRead.reject(new Error("old private error")));
    expect(screen.queryByLabelText("Retry export data")).toBeNull();
    expect(screen.getByText("EMPTY")).toBeTruthy();
  });

  it("does not erase settled data during an unchanged-session background account refresh", async () => {
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Current record")]);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());
    mockAuth.mockReturnValue({ ...mockAuth(), meStatus: "loading" });
    screen.rerender(<PdfExportScreen />);
    expect(screen.getByText(/Current record/)).toBeTruthy();
    expect(listWorkspaceGrows).toHaveBeenCalledTimes(1);
  });

  it("keeps failed access recovery retryable without exposing private errors or data", async () => {
    mockAccess.mockReturnValue({
      ...mockAccess(),
      ready: false,
      bootstrapError: "offline"
    });
    mockRetryMe.mockRejectedValue(new Error("private auth transport path"));
    const screen = render(<PdfExportScreen />);
    await act(async () => fireEvent.press(screen.getByLabelText("Retry export access")));
    expect(screen.getByText("Unable to verify export access.")).toBeTruthy();
    expect(
      screen.getByLabelText("Retry export access").props.accessibilityState.disabled
    ).toBe(false);
    expect(screen.queryByText(/private auth transport path/)).toBeNull();
    expect(listWorkspaceGrows).not.toHaveBeenCalled();
  });

  it("preserves a selected archived Personal grow and its saved export title", async () => {
    (listWorkspaceGrows as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "grow-1", name: "Archived tomatoes" }]);
    const events = [{ id: "event-1", kind: "log", title: "Saved observation" }];
    (getWorkspaceGrowTimeline as jest.Mock).mockResolvedValue(events);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());
    expect(listWorkspaceGrows).toHaveBeenNthCalledWith(2, "personal", {
      throwOnError: true,
      verifyRecords: true,
      archived: true
    });
    await act(async () =>
      fireEvent.press(screen.getByLabelText("Export Visual Timeline"))
    );
    expect(exportVisualTimeline).toHaveBeenCalledWith(
      "Archived tomatoes — Visual Grow Timeline",
      events
    );
  });

  it("fails closed when the required archived lookup fails", async () => {
    (listWorkspaceGrows as jest.Mock)
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("archived unavailable"));
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Do not export")]);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByLabelText("Retry export data")).toBeTruthy());
    expect(screen.queryByText(/Do not export/)).toBeNull();
    expect(screen.queryByLabelText("Export CSV")).toBeNull();
  });

  it("rejects a selected grow absent from both owner lists", async () => {
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([{ id: "different-grow" }]);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByLabelText("Retry export data")).toBeTruthy());
    expect(listWorkspaceGrows).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("EMPTY")).toBeNull();
  });

  it("never reads archived grows for a whole-workspace export", async () => {
    mockParams.mockReturnValue({});
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([]);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
    expect(listWorkspaceGrows).toHaveBeenCalledTimes(1);
    expect(listWorkspaceGrows).not.toHaveBeenCalledWith(
      "personal",
      expect.objectContaining({ archived: true })
    );
  });

  it("does not start an archived lookup after a selected-grow read becomes stale", async () => {
    const oldRead = deferred<any[]>();
    (listWorkspaceGrows as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: "grow-2" }]);
    (listWorkspaceLogs as jest.Mock).mockReturnValueOnce(oldRead.promise);
    const screen = render(<PdfExportScreen />);
    mockParams.mockReturnValue({ growId: "grow-2" });
    screen.rerender(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
    await act(async () => oldRead.resolve([log("Old grow")]));
    expect(listWorkspaceGrows).toHaveBeenCalledTimes(2);
    expect(listWorkspaceGrows).not.toHaveBeenCalledWith(
      "personal",
      expect.objectContaining({ archived: true })
    );
    expect(screen.queryByText(/Old grow/)).toBeNull();
  });

  it("ignores a late archived result from an older account", async () => {
    const archived = deferred<any[]>();
    (listWorkspaceLogs as jest.Mock).mockResolvedValueOnce([
      log("Previous owner record")
    ]);
    (listWorkspaceGrows as jest.Mock)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(archived.promise);
    const screen = render(<PdfExportScreen />);
    await waitFor(() => expect(listWorkspaceGrows).toHaveBeenCalledTimes(2));
    mockAuth.mockReturnValue({
      ...mockAuth(),
      user: { id: "owner-2" },
      token: "session-2"
    });
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([
      { id: "grow-1", name: "New owner grow" }
    ]);
    screen.rerender(<PdfExportScreen />);
    await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
    await act(async () =>
      archived.resolve([{ id: "grow-1", name: "Previous owner grow" }])
    );
    expect(screen.queryByText("READY")).toBeNull();
    expect(screen.queryByText(/Previous owner record/)).toBeNull();
    expect(screen.getByText("EMPTY")).toBeTruthy();
  });

  it("exports an older Commercial grow absent from the paginated list using exact owner metadata", async () => {
    mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([{ id: "newer-grow" }]);
    (getWorkspaceGrow as jest.Mock).mockResolvedValue({
      id: "grow-1",
      name: "Older trial grow"
    });
    const events = [{ id: "event-1", kind: "log", title: "Saved observation" }];
    (getWorkspaceGrowTimeline as jest.Mock).mockResolvedValue(events);
    const screen = render(<PdfExportScreen workspaceType="commercial" />);
    await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());
    expect(getWorkspaceGrow).toHaveBeenCalledWith("commercial", "grow-1", {
      verifyRecords: true
    });
    expect(listWorkspaceGrows).toHaveBeenCalledTimes(1);
    await act(async () =>
      fireEvent.press(screen.getByLabelText("Export Visual Timeline"))
    );
    expect(exportVisualTimeline).toHaveBeenCalledWith(
      "Older trial grow — Visual Grow Timeline",
      events
    );
  });

  it.each([null, { id: "foreign-grow", name: "Other grow" }, { name: "Malformed grow" }])(
    "withholds Commercial export after invalid exact metadata %p",
    async (record) => {
      mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
      (listWorkspaceGrows as jest.Mock).mockResolvedValue([]);
      (getWorkspaceGrow as jest.Mock).mockResolvedValue(record);
      (listWorkspaceLogs as jest.Mock).mockResolvedValue([log("Unavailable context")]);
      const screen = render(<PdfExportScreen workspaceType="commercial" />);
      await waitFor(() =>
        expect(screen.getByLabelText("Retry export data")).toBeTruthy()
      );
      expect(screen.queryByText(/Unavailable context/)).toBeNull();
      expect(screen.queryByLabelText("Export CSV")).toBeNull();
    }
  );

  it("makes a failed Commercial exact lookup retryable", async () => {
    mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([]);
    (getWorkspaceGrow as jest.Mock).mockRejectedValue(
      new Error("private exact lookup failure")
    );
    const screen = render(<PdfExportScreen workspaceType="commercial" />);
    await waitFor(() => expect(screen.getByLabelText("Retry export data")).toBeTruthy());
    expect(screen.queryByText(/private exact lookup failure/)).toBeNull();
    expect(screen.queryByText("EMPTY")).toBeNull();
  });

  it.each(["listed selected grow", "whole workspace"])(
    "skips exact Commercial metadata for %s",
    async (context) => {
      mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
      if (context === "whole workspace") mockParams.mockReturnValue({});
      const screen = render(<PdfExportScreen workspaceType="commercial" />);
      await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
      expect(getWorkspaceGrow).not.toHaveBeenCalled();
    }
  );

  it("does not start Commercial metadata fallback after the source scope becomes stale", async () => {
    mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
    const oldRead = deferred<any[]>();
    (listWorkspaceGrows as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: "grow-2" }]);
    (listWorkspaceLogs as jest.Mock).mockReturnValueOnce(oldRead.promise);
    const screen = render(<PdfExportScreen workspaceType="commercial" />);
    mockParams.mockReturnValue({ growId: "grow-2" });
    screen.rerender(<PdfExportScreen workspaceType="commercial" />);
    await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
    await act(async () => oldRead.resolve([log("Old record")]));
    expect(getWorkspaceGrow).not.toHaveBeenCalled();
    expect(screen.queryByText(/Old record/)).toBeNull();
  });

  it("ignores late Commercial metadata after an account change", async () => {
    mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
    const oldMetadata = deferred<any>();
    (listWorkspaceGrows as jest.Mock).mockResolvedValueOnce([]);
    (listWorkspaceLogs as jest.Mock).mockResolvedValueOnce([
      log("Old Commercial record")
    ]);
    (getWorkspaceGrow as jest.Mock).mockReturnValue(oldMetadata.promise);
    const screen = render(<PdfExportScreen workspaceType="commercial" />);
    await waitFor(() => expect(getWorkspaceGrow).toHaveBeenCalledTimes(1));
    mockAuth.mockReturnValue({
      ...mockAuth(),
      user: { id: "owner-2" },
      token: "session-2"
    });
    screen.rerender(<PdfExportScreen workspaceType="commercial" />);
    await waitFor(() => expect(screen.getByText("EMPTY")).toBeTruthy());
    await act(async () => oldMetadata.resolve({ id: "grow-1", name: "Old owner grow" }));
    expect(screen.queryByText(/Old Commercial record/)).toBeNull();
    expect(screen.getByText("EMPTY")).toBeTruthy();
  });
});
