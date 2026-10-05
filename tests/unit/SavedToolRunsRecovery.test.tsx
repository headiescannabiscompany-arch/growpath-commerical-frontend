import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SavedToolRunsScreen from "@/app/home/personal/(tabs)/tools/saved-runs";

const mockList = jest.fn();
const mockGet = jest.fn();
const mockWrite = jest.fn();
const mockAsk = jest.fn();
let mockParams: Record<string, string> = {};
let mockAuth: any;
let mockEntitlements: any;

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useLocalSearchParams: () => mockParams
}));
jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return { useFocusEffect: (callback: any) => React.useEffect(callback, [callback]) };
});
jest.mock("@/auth/AuthContext", () => ({ useOptionalAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({ useEntitlements: () => mockEntitlements }));
jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockList(...args),
  getToolRun: (...args: any[]) => mockGet(...args),
  archiveToolRun: (...args: any[]) => mockWrite("archive", ...args),
  createTaskFromToolRun: (...args: any[]) => mockWrite("task", ...args),
  permanentlyDeleteToolRun: (...args: any[]) => mockWrite("delete", ...args),
  saveToolRunToLog: (...args: any[]) => mockWrite("log", ...args),
  updateToolRun: (...args: any[]) => mockWrite("update", ...args),
  updatePlantIdCorrection: (...args: any[]) => mockWrite("correction", ...args)
}));
jest.mock("@/api/fieldStudies", () => ({
  listFieldStudies: jest.fn().mockResolvedValue([]),
  getFieldStudy: jest.fn(),
  createFieldStudy: (...args: any[]) => mockWrite("create study", ...args),
  updateFieldStudy: (...args: any[]) => mockWrite("update study", ...args),
  createFieldObservation: (...args: any[]) => mockWrite("create observation", ...args),
  updateFieldObservation: (...args: any[]) => mockWrite("update observation", ...args)
}));
jest.mock("@/api/personalAssistant", () => ({
  askPersonalAssistant: (...args: any[]) => mockAsk(...args)
}));
jest.mock("@/features/personal/tools/harvestResultDeletionPersistence", () => ({
  loadPendingHarvestResultDeletion: () => Promise.resolve(null),
  rememberPendingHarvestResultDeletion: (...args: any[]) =>
    mockWrite("remember", ...args),
  forgetPendingHarvestResultDeletion: (...args: any[]) => mockWrite("forget", ...args)
}));
jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, backFallbackHref, preferBackFallback }: any) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, `Back ${backFallbackHref} ${preferBackFallback}`),
        children
      )
  };
});
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/features/personal/tools/ToolResultSurface", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ summary }: any) => React.createElement(Text, null, `Selected ${summary}`);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function run(id = "run-1", summary = "Saved environmental review") {
  return {
    id,
    _id: id,
    toolType: "vpd",
    summary,
    outputs: { vpd: 1.2 },
    createdAt: "2026-10-04T12:00:00.000Z"
  };
}

function pressHandler(node: any): () => unknown {
  let current = node;
  while (current && typeof current.props.onPress !== "function") current = current.parent;
  if (!current) throw new Error("Expected a press handler");
  return current.props.onPress;
}

function refreshHandler() {
  return pressHandler(screen.getByLabelText("Refresh saved runs"));
}

async function settle<T>(request: ReturnType<typeof deferred<T>>, value: T) {
  await act(async () => {
    request.resolve(value);
  });
}

describe("Saved AI Runs collection recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockAuth = {
      user: { id: "account-1" },
      token: "session-1",
      isAuthed: true,
      isHydrating: false
    };
    mockEntitlements = {
      mode: "facility",
      facilityId: "facility-1",
      facilityRole: "OWNER"
    };
    mockList.mockResolvedValue([run()]);
    mockGet.mockImplementation(async (id: string) => run(id));
  });

  afterEach(() => {
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it("keeps pending records unknown, scoped, and refresh single-flight", async () => {
    const pending = deferred<any[]>();
    mockList.mockReturnValue(pending.promise);
    render(<SavedToolRunsScreen />);
    expect(screen.getByText("Loading saved runs...")).toBeTruthy();
    expect(screen.queryByText("No saved runs")).toBeNull();
    expect(screen.getByLabelText("Refresh saved runs")).toBeDisabled();
    await act(async () => {
      refreshHandler()();
      refreshHandler()();
    });
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith({
      growId: undefined,
      toolType: undefined,
      workspaceType: "facility",
      facilityId: "facility-1"
    });
    expect(screen.getByText("Back /home/facility/ai-tools true")).toBeTruthy();
    await settle(pending, []);
    expect(await screen.findByText("No saved runs")).toBeTruthy();
  });

  it("offers read-only Retry after failure without claiming no saved runs", async () => {
    mockList.mockRejectedValueOnce(new Error("Read temporarily unavailable"));
    render(<SavedToolRunsScreen />);
    expect(await screen.findByText("Saved runs unavailable")).toBeTruthy();
    expect(screen.queryByText("No saved runs")).toBeNull();
    expect(screen.getByText("Retry")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Refresh saved runs"));
    expect(await screen.findByText("Saved environmental review")).toBeTruthy();
    expect(screen.queryByText("Saved runs unavailable")).toBeNull();
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("shows confirmed empty guidance only after a valid empty read", async () => {
    mockList.mockResolvedValue([]);
    render(<SavedToolRunsScreen />);
    expect(await screen.findByText("No saved runs")).toBeTruthy();
    expect(screen.queryByText("Saved runs unavailable")).toBeNull();
    expect(screen.getByLabelText("Refresh saved runs")).not.toBeDisabled();
  });

  it("retains and labels same-query data on failed refresh and gates record opening", async () => {
    const pending = deferred<any[]>();
    render(<SavedToolRunsScreen />);
    await screen.findByText("Saved environmental review");
    const oldSelect = pressHandler(screen.getByLabelText("Saved tool run run-1"));
    const oldRefresh = refreshHandler();
    mockList.mockReturnValueOnce(pending.promise);
    await act(async () => {
      oldRefresh();
      oldRefresh();
      oldSelect();
    });
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(mockGet).not.toHaveBeenCalled();
    expect(screen.getByText("Saved environmental review")).toBeTruthy();
    expect(screen.getByText(/Showing previously loaded saved runs/)).toBeTruthy();
    expect(screen.getByLabelText("Saved tool run run-1")).toBeDisabled();
    await act(async () => {
      pending.reject(new Error("Refresh unavailable"));
    });
    expect(await screen.findByText("Saved runs unavailable")).toBeTruthy();
    expect(screen.getByText("Saved environmental review")).toBeTruthy();
    expect(screen.queryByText("No saved runs")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh saved runs"));
    await waitFor(() =>
      expect(screen.getByLabelText("Saved tool run run-1")).not.toBeDisabled()
    );
    expect(screen.queryByText(/Showing previously loaded saved runs/)).toBeNull();
  });

  it("preserves same-query unfinished notes through refresh failure and Retry", async () => {
    render(<SavedToolRunsScreen />);
    fireEvent.press(await screen.findByLabelText("Saved tool run run-1"));
    const note = await screen.findByPlaceholderText(
      "Add a short note for this saved run"
    );
    fireEvent.changeText(note, "Unfinished private note");
    mockList.mockRejectedValueOnce(new Error("Refresh unavailable"));
    fireEvent.press(screen.getByLabelText("Refresh saved runs"));
    await screen.findByText("Saved runs unavailable");
    fireEvent.press(screen.getByLabelText("Refresh saved runs"));
    await waitFor(() => expect(screen.queryByText("Saved runs unavailable")).toBeNull());
    expect(
      screen.getByPlaceholderText("Add a short note for this saved run").props.value
    ).toBe("Unfinished private note");
  });

  it("serializes detail selection against repeated selection and Refresh", async () => {
    const pending = deferred<any>();
    mockGet.mockReturnValueOnce(pending.promise);
    render(<SavedToolRunsScreen />);
    const row = await screen.findByLabelText("Saved tool run run-1");
    const select = pressHandler(row);
    const refresh = refreshHandler();
    await act(async () => {
      select();
      select();
      refresh();
    });
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Refresh saved runs")).toBeDisabled();
    await settle(pending, run());
    expect(await screen.findByText("Selected Saved environmental review")).toBeTruthy();
    expect(screen.getByLabelText("Refresh saved runs")).not.toBeDisabled();
  });

  it("ignores captured old-filter Refresh and selection handlers", async () => {
    render(<SavedToolRunsScreen />);
    const row = await screen.findByLabelText("Saved tool run run-1");
    const select = pressHandler(row);
    const refresh = refreshHandler();
    mockList.mockResolvedValue([run("plant", "Plant-filter result")]);
    fireEvent.press(screen.getByText("Plant ID"));
    await screen.findByText("Plant-filter result");
    await act(async () => {
      select();
      refresh();
    });
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("rejects a captured row handler after a successful same-query refresh removes that row", async () => {
    render(<SavedToolRunsScreen />);
    const select = pressHandler(await screen.findByLabelText("Saved tool run run-1"));
    mockList.mockResolvedValue([]);
    fireEvent.press(screen.getByLabelText("Refresh saved runs"));
    await screen.findByText("No saved runs");
    await act(async () => {
      select();
    });
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Selected Saved environmental review")).toBeNull();
  });

  it("does not let a superseded read failure replace a current successful filter", async () => {
    const old = deferred<any[]>();
    mockList
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue([run("plant", "Plant-filter result")]);
    render(<SavedToolRunsScreen />);
    fireEvent.press(screen.getByText("Plant ID"));
    await screen.findByText("Plant-filter result");
    await act(async () => {
      old.reject(new Error("Late old failure"));
    });
    expect(screen.getByText("Plant-filter result")).toBeTruthy();
    expect(screen.queryByText("Saved runs unavailable")).toBeNull();
  });

  it("discards out-of-order filter results without carrying the prior list into a new filter", async () => {
    const all = deferred<any[]>();
    const plant = deferred<any[]>();
    mockList.mockImplementation(({ toolType }) =>
      toolType === "species_crop_id" ? plant.promise : all.promise
    );
    render(<SavedToolRunsScreen />);
    fireEvent.press(screen.getByText("Plant ID"));
    await settle(all, [run("old", "Old all result")]);
    expect(screen.queryByText("Old all result")).toBeNull();
    expect(screen.queryByText("No saved runs")).toBeNull();
    await settle(plant, [run("plant", "Current Plant ID result")]);
    expect(await screen.findByText("Current Plant ID result")).toBeTruthy();
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(mockList.mock.calls[1][0]).toMatchObject({ toolType: "species_crop_id" });
  });

  it("does not revive an earlier request after switching a filter away and back", async () => {
    const oldAll = deferred<any[]>();
    const plant = deferred<any[]>();
    const newAll = deferred<any[]>();
    mockList
      .mockReturnValueOnce(oldAll.promise)
      .mockReturnValueOnce(plant.promise)
      .mockReturnValueOnce(newAll.promise);
    render(<SavedToolRunsScreen />);
    fireEvent.press(screen.getByText("Plant ID"));
    fireEvent.press(screen.getByText("All"));
    await settle(oldAll, [run("old", "Old all result")]);
    await settle(plant, [run("plant", "Old Plant ID result")]);
    expect(screen.queryByText("Old all result")).toBeNull();
    expect(screen.queryByText("Old Plant ID result")).toBeNull();
    await settle(newAll, [run("new", "New all result")]);
    expect(await screen.findByText("New all result")).toBeTruthy();
    expect(mockList).toHaveBeenCalledTimes(3);
  });

  it("does not display the previous loaded filter as a failed new-filter snapshot", async () => {
    render(<SavedToolRunsScreen />);
    await screen.findByText("Saved environmental review");
    mockList.mockRejectedValueOnce(new Error("Filter unavailable"));
    fireEvent.press(screen.getByText("Plant ID"));
    await screen.findByText("Saved runs unavailable");
    expect(screen.queryByText("Saved environmental review")).toBeNull();
    expect(screen.queryByText(/Showing previously loaded saved runs/)).toBeNull();
    expect(screen.queryByText("No saved runs")).toBeNull();
  });

  const changes: Array<[string, () => void]> = [
    [
      "account",
      () => {
        mockAuth = { ...mockAuth, user: { id: "account-2" } };
      }
    ],
    [
      "session",
      () => {
        mockAuth = { ...mockAuth, token: "session-2" };
      }
    ],
    [
      "workspace",
      () => {
        mockEntitlements = { ...mockEntitlements, mode: "commercial" };
      }
    ],
    [
      "Facility",
      () => {
        mockEntitlements = { ...mockEntitlements, facilityId: "facility-2" };
      }
    ],
    [
      "role",
      () => {
        mockEntitlements = { ...mockEntitlements, facilityRole: "VIEWER" };
      }
    ]
  ];

  it.each(changes)(
    "isolates pending collection reads after a %s change",
    async (_name, change) => {
      const oldRead = deferred<any[]>();
      mockList
        .mockReturnValueOnce(oldRead.promise)
        .mockResolvedValue([run("new", "New context result")]);
      const view = render(<SavedToolRunsScreen />);
      const staleRefresh = refreshHandler();
      change();
      view.rerender(<SavedToolRunsScreen />);
      expect(await screen.findByText("New context result")).toBeTruthy();
      await act(async () => {
        staleRefresh();
      });
      expect(mockList).toHaveBeenCalledTimes(2);
      await settle(oldRead, [run("old", "Previous context result")]);
      expect(screen.queryByText("Previous context result")).toBeNull();
      expect(screen.getByText("New context result")).toBeTruthy();
    }
  );

  it.each(changes)(
    "discards a late selected detail after a %s change",
    async (_name, change) => {
      const oldDetail = deferred<any>();
      mockGet.mockReturnValueOnce(oldDetail.promise);
      const view = render(<SavedToolRunsScreen />);
      fireEvent.press(await screen.findByLabelText("Saved tool run run-1"));
      expect(mockGet).toHaveBeenCalledTimes(1);
      mockList.mockResolvedValue([run("new", "New context result")]);
      change();
      view.rerender(<SavedToolRunsScreen />);
      await screen.findByText("New context result");
      await settle(oldDetail, run("run-1", "Private old detail"));
      expect(screen.queryByText("Selected Private old detail")).toBeNull();
      expect(
        screen.queryByPlaceholderText("Add a short note for this saved run")
      ).toBeNull();
    }
  );

  it("clears old selected data and drafts on an account change", async () => {
    const view = render(<SavedToolRunsScreen />);
    fireEvent.press(await screen.findByLabelText("Saved tool run run-1"));
    const note = await screen.findByPlaceholderText(
      "Add a short note for this saved run"
    );
    fireEvent.changeText(note, "Previous account draft");
    mockAuth = { ...mockAuth, user: { id: "account-2" } };
    mockList.mockResolvedValue([]);
    view.rerender(<SavedToolRunsScreen />);
    await screen.findByText("No saved runs");
    expect(screen.queryByText("Selected Saved environmental review")).toBeNull();
    expect(screen.queryByDisplayValue("Previous account draft")).toBeNull();
  });

  it("does not revive a prior Facility read after switching away and back", async () => {
    const old = deferred<any[]>();
    const other = deferred<any[]>();
    const latest = deferred<any[]>();
    mockList
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(other.promise)
      .mockReturnValueOnce(latest.promise);
    const view = render(<SavedToolRunsScreen />);
    mockEntitlements = { ...mockEntitlements, facilityId: "facility-2" };
    view.rerender(<SavedToolRunsScreen />);
    mockEntitlements = { ...mockEntitlements, facilityId: "facility-1" };
    view.rerender(<SavedToolRunsScreen />);
    await settle(old, [run("old", "Old Facility result")]);
    await settle(other, [run("other", "Other Facility result")]);
    expect(screen.queryByText("Old Facility result")).toBeNull();
    expect(screen.queryByText("Other Facility result")).toBeNull();
    await settle(latest, [run("new", "Current Facility result")]);
    expect(await screen.findByText("Current Facility result")).toBeTruthy();
  });

  it("invalidates the old grow query in Personal without changing the Back contract", async () => {
    mockEntitlements = { ...mockEntitlements, mode: "personal" };
    mockParams = { growId: "grow-1", sourceContext: "journal" };
    const old = deferred<any[]>();
    mockList
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue([run("new", "New grow result")]);
    const view = render(<SavedToolRunsScreen />);
    expect(
      screen.getByText("Back /home/personal/grows/grow-1/journal true")
    ).toBeTruthy();
    mockParams = { growId: "grow-2", sourceContext: "journal" };
    view.rerender(<SavedToolRunsScreen />);
    await screen.findByText("New grow result");
    await settle(old, [run("old", "Old grow result")]);
    expect(screen.queryByText("Old grow result")).toBeNull();
    expect(
      screen.getByText("Back /home/personal/grows/grow-2/journal true")
    ).toBeTruthy();
    expect(mockList.mock.calls[1][0]).toEqual({
      growId: "grow-2",
      toolType: undefined,
      workspaceType: "personal"
    });
  });

  it.each([
    [
      "signed out",
      () => {
        mockAuth = { ...mockAuth, isAuthed: false, token: null, user: null };
      }
    ],
    [
      "auth hydrating",
      () => {
        mockAuth = { ...mockAuth, isHydrating: true };
      }
    ],
    [
      "Facility missing",
      () => {
        mockEntitlements = { ...mockEntitlements, facilityId: "" };
      }
    ]
  ] as Array<[string, () => void]>)(
    "withholds scoped reads when %s",
    async (_name, change) => {
      change();
      render(<SavedToolRunsScreen />);
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockList).not.toHaveBeenCalled();
      expect(mockGet).not.toHaveBeenCalled();
      expect(screen.queryByText("No saved runs")).toBeNull();
    }
  );

  it("ignores pending collection settlement and captured refresh after unmount", async () => {
    const pending = deferred<any[]>();
    mockList.mockReturnValueOnce(pending.promise);
    const view = render(<SavedToolRunsScreen />);
    const staleRefresh = refreshHandler();
    view.unmount();
    await settle(pending, [run()]);
    await act(async () => {
      staleRefresh();
    });
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("ignores a pending selected detail after unmount", async () => {
    const pending = deferred<any>();
    mockGet.mockReturnValueOnce(pending.promise);
    const view = render(<SavedToolRunsScreen />);
    fireEvent.press(await screen.findByLabelText("Saved tool run run-1"));
    view.unmount();
    await settle(pending, run("run-1", "Late selected result"));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});
