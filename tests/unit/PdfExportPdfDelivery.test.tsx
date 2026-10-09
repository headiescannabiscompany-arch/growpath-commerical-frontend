import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import PdfExportScreen from "@/app/home/personal/(tabs)/tools/pdf-export";
import { listToolRuns } from "@/api/toolRuns";
import {
  getWorkspaceGrowTimeline,
  listWorkspaceGrows,
  listWorkspaceLogs,
  listWorkspacePlants,
  listWorkspaceTasks
} from "@/features/grows/workspaceData";
import { exportToCsv } from "@/utils/exportToCsv";
import { exportVisualTimeline } from "@/utils/exportVisualTimeline";
import { downloadPersonalGrowTimelinePdf } from "@/utils/personalGrowPdfDownload";

const mockParams = jest.fn();
const mockAuth = jest.fn();
const mockAccess = jest.fn();
const mockCan = jest.fn();
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
jest.mock("@/utils/personalGrowPdfDownload", () => ({
  downloadPersonalGrowTimelinePdf: jest.fn()
}));
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/components/personal/EvidenceReviewPanel", () => () => null);
jest.mock("@/features/personal/tools/LockedToolCard", () => {
  const { Text } = require("react-native");
  return () => <Text>Export locked</Text>;
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (value: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function pressHandler(screen: ReturnType<typeof render>, label: string) {
  let node = screen.getByLabelText(label);
  while (typeof node.props.onPress !== "function" && node.parent) node = node.parent;
  return node.props.onPress as () => Promise<void>;
}

function result(method = "web-download") {
  return { filename: "growpath-timeline.pdf", method, dispose: jest.fn() };
}

async function ready(screen: ReturnType<typeof render>) {
  await waitFor(() => expect(screen.getByLabelText("Export PDF")).toBeTruthy());
}

describe("selected Personal grow PDF delivery", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams.mockReturnValue({ growId: "grow-1", presentation: "timeline" });
    mockAuth.mockReturnValue({
      user: { id: "owner-1", role: "user" },
      token: "session-1",
      isAuthed: true,
      isHydrating: false,
      meStatus: "ready"
    });
    mockCan.mockReturnValue(true);
    mockAccess.mockReturnValue({
      ready: true,
      mode: "personal",
      plan: "pro",
      can: mockCan
    });
    (listWorkspaceGrows as jest.Mock).mockResolvedValue([
      { id: "grow-1", name: "Tomatoes" },
      { id: "grow-2", name: "Peppers" }
    ]);
    for (const loader of [listWorkspacePlants, listWorkspaceTasks, listToolRuns]) {
      (loader as jest.Mock).mockResolvedValue([]);
    }
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([
      { id: "log-1", title: "Watered", date: "2026-10-09", notes: "Saved note" }
    ]);
    (getWorkspaceGrowTimeline as jest.Mock).mockResolvedValue([
      {
        id: "event-1",
        type: "log_created",
        title: "Watered",
        timestamp: "2026-10-09T12:00:00Z"
      }
    ]);
    (downloadPersonalGrowTimelinePdf as jest.Mock).mockResolvedValue(result());
    (exportToCsv as jest.Mock).mockResolvedValue({ method: "web-download" });
    (exportVisualTimeline as jest.Mock).mockResolvedValue("web-download");
  });

  it("requires an explicit action, preserves HTML/CSV, and states the actual PDF scope", async () => {
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    expect(downloadPersonalGrowTimelinePdf).not.toHaveBeenCalled();
    expect(mockCan).toHaveBeenCalledWith("TOOL_PDF_EXPORT");
    expect(screen.getByLabelText("Export CSV")).toBeTruthy();
    expect(screen.getByLabelText("Export Visual Timeline")).toBeTruthy();
    expect(
      screen.getByText(/bounded timeline history, not a complete backup/)
    ).toBeTruthy();
    expect(screen.getByText(/at most 8 MiB each/)).toBeTruthy();
    expect(screen.getByText(/Unsupported text or unavailable photos/)).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
    expect(downloadPersonalGrowTimelinePdf).toHaveBeenCalledWith("grow-1", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      signal: expect.any(AbortSignal),
      isCurrentScope: expect.any(Function)
    });
    expect(
      screen.getByText("PDF download requested. Check your browser downloads.")
    ).toBeTruthy();
    expect(exportToCsv).not.toHaveBeenCalled();
    expect(exportVisualTimeline).not.toHaveBeenCalled();
  });

  it.each(["commercial", "all-workspace"])(
    "does not offer a PDF for %s",
    async (scope) => {
      if (scope === "commercial")
        mockAccess.mockReturnValue({ ready: true, mode: "commercial", can: mockCan });
      else mockParams.mockReturnValue({});
      const screen = render(
        <PdfExportScreen
          workspaceType={scope === "commercial" ? "commercial" : "personal"}
        />
      );
      await waitFor(() => expect(screen.getByLabelText("Export CSV")).toBeTruthy());
      expect(screen.queryByLabelText("Export PDF")).toBeNull();
      expect(downloadPersonalGrowTimelinePdf).not.toHaveBeenCalled();
    }
  );

  it.each(["loading", "read-failure", "locked", "signed-out", "facility"])(
    "does not offer or request PDF while %s",
    async (condition) => {
      if (condition === "loading")
        (listWorkspaceLogs as jest.Mock).mockReturnValue(new Promise(() => {}));
      if (condition === "read-failure")
        (listWorkspaceLogs as jest.Mock).mockRejectedValue(new Error("private"));
      if (condition === "locked") mockCan.mockReturnValue(false);
      if (condition === "signed-out") mockAuth.mockReturnValue({ isAuthed: false });
      if (condition === "facility")
        mockAccess.mockReturnValue({ ready: true, mode: "facility", can: mockCan });
      const screen = render(<PdfExportScreen />);
      await act(async () => {});
      expect(screen.queryByLabelText("Export PDF")).toBeNull();
      expect(downloadPersonalGrowTimelinePdf).not.toHaveBeenCalled();
    }
  );

  it("permits a known selected grow's empty timeline PDF without pretending CSV has rows", async () => {
    (listWorkspaceLogs as jest.Mock).mockResolvedValue([]);
    (getWorkspaceGrowTimeline as jest.Mock).mockResolvedValue([]);
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
    expect(downloadPersonalGrowTimelinePdf).toHaveBeenCalledTimes(1);
    expect(exportToCsv).not.toHaveBeenCalled();
  });

  it("withholds PDF when the device time zone cannot be determined", async () => {
    const resolved = jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions");
    resolved.mockReturnValue({
      ...new Intl.DateTimeFormat().resolvedOptions(),
      timeZone: ""
    });
    try {
      const screen = render(<PdfExportScreen />);
      await ready(screen);
      expect(screen.getByText(/device's time zone could not be determined/)).toBeTruthy();
      await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
      expect(downloadPersonalGrowTimelinePdf).not.toHaveBeenCalled();
    } finally {
      resolved.mockRestore();
    }
  });

  it("serializes simultaneous captured PDF/HTML/CSV callbacks before a render can disable them", async () => {
    const pending = deferred<any>();
    (downloadPersonalGrowTimelinePdf as jest.Mock).mockReturnValue(pending.promise);
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    const pdf = pressHandler(screen, "Export PDF");
    const csv = pressHandler(screen, "Export CSV");
    const html = pressHandler(screen, "Export Visual Timeline");
    let first!: Promise<void>;
    act(() => {
      first = pdf();
      void pdf();
      void csv();
      void html();
    });
    expect(downloadPersonalGrowTimelinePdf).toHaveBeenCalledTimes(1);
    expect(exportToCsv).not.toHaveBeenCalled();
    expect(exportVisualTimeline).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve(result());
      await first;
    });
  });

  it.each(["CSV", "Visual Timeline"])(
    "does not start PDF while %s is preparing",
    async (format) => {
      const pending = deferred<any>();
      const exporter = format === "CSV" ? exportToCsv : exportVisualTimeline;
      (exporter as jest.Mock).mockReturnValue(pending.promise);
      const screen = render(<PdfExportScreen />);
      await ready(screen);
      const pdf = pressHandler(screen, "Export PDF");
      const existing = pressHandler(screen, `Export ${format}`);
      let first!: Promise<void>;
      act(() => {
        first = existing();
        void pdf();
      });
      expect(downloadPersonalGrowTimelinePdf).not.toHaveBeenCalled();
      await act(async () => {
        pending.resolve(format === "CSV" ? { method: "web-download" } : "web-download");
        await first;
      });
    }
  );

  it("reports the native handoff without claiming a file was saved", async () => {
    (downloadPersonalGrowTimelinePdf as jest.Mock).mockResolvedValue(
      result("native-share-file")
    );
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
    expect(screen.getByText("PDF share sheet opened.")).toBeTruthy();
  });

  it.each([
    [
      "PDF_TEXT_UNSUPPORTED",
      "Some saved text uses unsupported characters. No PDF was saved."
    ],
    ["PDF_PHOTO_UNAVAILABLE", "A saved photo could not be included. No PDF was saved."],
    ["PDF_TIMEOUT", "PDF export timed out. Please try again."],
    ["UNKNOWN", "The PDF could not be generated. Please try again."]
  ])("shows safe %s failure and allows a retry", async (code, message) => {
    (downloadPersonalGrowTimelinePdf as jest.Mock).mockRejectedValueOnce({
      code,
      message: "secret/path/customer@example.test"
    });
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(/secret\/path/)).toBeNull();
    await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
    expect(downloadPersonalGrowTimelinePdf).toHaveBeenCalledTimes(2);
  });

  it.each([
    "grow",
    "account",
    "session",
    "signed-out",
    "capability",
    "plan",
    "workspace",
    "facility",
    "role"
  ])(
    "aborts in-flight PDF and rejects a captured old action after %s changes",
    async (change) => {
      const pending = deferred<any>();
      (downloadPersonalGrowTimelinePdf as jest.Mock).mockReturnValue(pending.promise);
      const screen = render(<PdfExportScreen />);
      await ready(screen);
      const oldPress = pressHandler(screen, "Export PDF");
      let first!: Promise<void>;
      act(() => {
        first = oldPress();
      });
      const options = (downloadPersonalGrowTimelinePdf as jest.Mock).mock.calls[0][1];
      if (change === "grow") mockParams.mockReturnValue({ growId: "grow-2" });
      if (change === "account")
        mockAuth.mockReturnValue({
          ...mockAuth(),
          user: { id: "owner-2", role: "user" }
        });
      if (change === "session")
        mockAuth.mockReturnValue({ ...mockAuth(), token: "session-2" });
      if (change === "signed-out")
        mockAuth.mockReturnValue({ ...mockAuth(), isAuthed: false });
      if (change === "capability") mockCan.mockReturnValue(false);
      if (change === "plan")
        mockAccess.mockReturnValue({ ...mockAccess(), plan: "commercial" });
      if (change === "workspace")
        mockAccess.mockReturnValue({ ...mockAccess(), mode: "commercial" });
      if (change === "facility")
        mockAccess.mockReturnValue({ ...mockAccess(), facilityId: "facility-2" });
      if (change === "role")
        mockAuth.mockReturnValue({
          ...mockAuth(),
          user: { id: "owner-1", role: "admin" }
        });
      screen.rerender(<PdfExportScreen />);
      await act(async () => {
        await oldPress();
      });
      expect(options.signal.aborted).toBe(true);
      expect(options.isCurrentScope()).toBe(false);
      expect(downloadPersonalGrowTimelinePdf).toHaveBeenCalledTimes(1);
      const stale = result();
      await act(async () => {
        pending.resolve(stale);
        await first;
      });
      expect(stale.dispose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/PDF download requested/)).toBeNull();
    }
  );

  it("does not revive an A-to-B-to-A captured PDF action", async () => {
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    const oldPress = pressHandler(screen, "Export PDF");
    mockParams.mockReturnValue({ growId: "grow-2" });
    screen.rerender(<PdfExportScreen />);
    await ready(screen);
    mockParams.mockReturnValue({ growId: "grow-1" });
    screen.rerender(<PdfExportScreen />);
    await ready(screen);
    await act(async () => {
      await oldPress();
    });
    expect(downloadPersonalGrowTimelinePdf).not.toHaveBeenCalled();
  });

  it("aborts on unmount before delivery and disposes any late result", async () => {
    const pending = deferred<any>();
    (downloadPersonalGrowTimelinePdf as jest.Mock).mockReturnValue(pending.promise);
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    let first!: Promise<void>;
    act(() => {
      first = pressHandler(screen, "Export PDF")();
    });
    const options = (downloadPersonalGrowTimelinePdf as jest.Mock).mock.calls[0][1];
    screen.unmount();
    expect(options.signal.aborted).toBe(true);
    expect(options.isCurrentScope()).toBe(false);
    const stale = result();
    await act(async () => {
      pending.resolve(stale);
      await first;
    });
    expect(stale.dispose).toHaveBeenCalledTimes(1);
  });

  it("cleans retained PDF URLs on the next export and on scope removal", async () => {
    const first = result();
    const second = result();
    (downloadPersonalGrowTimelinePdf as jest.Mock)
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second);
    const screen = render(<PdfExportScreen />);
    await ready(screen);
    await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
    expect(first.dispose).not.toHaveBeenCalled();
    await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.dispose).not.toHaveBeenCalled();
    screen.unmount();
    expect(second.dispose).toHaveBeenCalledTimes(1);
  });

  it.each(["context", "unmount"])(
    "keeps all exports locked across %s replacement until a native sheet actually settles",
    async (replacement) => {
      const pending = deferred<any>();
      (downloadPersonalGrowTimelinePdf as jest.Mock).mockReturnValueOnce(pending.promise);
      let screen = render(<PdfExportScreen />);
      await ready(screen);
      let first!: Promise<void>;
      act(() => {
        first = pressHandler(screen, "Export PDF")();
      });
      const options = (downloadPersonalGrowTimelinePdf as jest.Mock).mock.calls[0][1];
      if (replacement === "context") {
        mockParams.mockReturnValue({ growId: "grow-2" });
        screen.rerender(<PdfExportScreen />);
      } else {
        screen.unmount();
        screen = render(<PdfExportScreen />);
      }
      await ready(screen);
      expect(options.signal.aborted).toBe(true);
      expect(
        screen.getByText(/Another export or share sheet is still open/)
      ).toBeTruthy();
      await act(async () => {
        fireEvent.press(screen.getByLabelText("Export PDF"));
        fireEvent.press(screen.getByLabelText("Export CSV"));
        fireEvent.press(screen.getByLabelText("Export Visual Timeline"));
      });
      expect(downloadPersonalGrowTimelinePdf).toHaveBeenCalledTimes(1);
      expect(exportToCsv).not.toHaveBeenCalled();
      expect(exportVisualTimeline).not.toHaveBeenCalled();
      const stale = result("native-share-file");
      await act(async () => {
        pending.resolve(stale);
        await first;
      });
      expect(stale.dispose).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText(/Another export or share sheet is still open/)
      ).toBeNull();
      expect(screen.queryByText("PDF share sheet opened.")).toBeNull();
      await act(async () => fireEvent.press(screen.getByLabelText("Export PDF")));
      expect(downloadPersonalGrowTimelinePdf).toHaveBeenCalledTimes(2);
    }
  );
});
