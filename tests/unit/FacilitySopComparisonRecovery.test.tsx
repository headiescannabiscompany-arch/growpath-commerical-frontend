import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import Picker from "@/app/home/facility/sop-runs/compare";
import Result from "@/app/home/facility/sop-runs/compare-result";

const mockApi = jest.fn();
const mockPush = jest.fn();
const mockRouter = { push: mockPush };
let mockParams: Record<string, unknown> = {};
let mockFacility = "facility-1";
let mockUser = "qa";
let mockToken = "session";
let mockRole = "OWNER";
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: mockUser }, token: mockToken })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacility })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockRole })
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApi(...args)
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({ toInlineError: (e: Error) => ({ message: e.message }) })
}));

const choices = {
  runs: [
    { id: "run-1", title: "Morning" },
    { id: "run-2", title: "Evening" }
  ]
};
const saved = (id: string, title = id) => ({
  run: { id, title, steps: [{ title: "Inspect", status: "done" }] }
});
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const empty = "Complete at least two SOP runs before comparing recorded outcomes.";
const pickerRefresh = "Refresh SOP comparison choices";
const resultRefresh = "Refresh SOP comparison result";
const compare = "Compare selected SOP runs";
function choose(screen: ReturnType<typeof render>) {
  fireEvent.press(
    screen.getByRole("button", { name: "Select Morning as reference run" })
  );
  fireEvent.press(
    screen.getByRole("button", { name: "Select Evening as comparison run" })
  );
}
beforeEach(() => {
  mockApi.mockReset();
  mockPush.mockReset();
  mockFacility = "facility-1";
  mockUser = "qa";
  mockToken = "session";
  mockRole = "OWNER";
  mockParams = { leftId: "run-1", rightId: "run-2" };
});

describe("SOP comparison chooser truthful read recovery", () => {
  it("withholds empty guidance while pending/failed and retries once", async () => {
    const retry = deferred();
    mockApi
      .mockRejectedValueOnce(new Error("Offline"))
      .mockReturnValueOnce(retry.promise);
    const screen = render(<Picker />);
    expect(screen.queryByText(empty)).toBeNull();
    await screen.findByText("Offline");
    expect(screen.queryByText(empty)).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: pickerRefresh }));
    fireEvent.press(screen.getByRole("button", { name: pickerRefresh }));
    expect(mockApi).toHaveBeenCalledTimes(2);
    await act(async () => retry.resolve({ runs: [] }));
    expect(screen.getByText(empty)).toBeTruthy();
  });
  it.each([
    null,
    {},
    { runs: null },
    { runs: [null] },
    { runs: [{ title: "No id" }] },
    { runs: [{ id: "../bad" }] }
  ])(
    "rejects malformed collection %j instead of inventing empty/identities",
    async (response) => {
      mockApi.mockResolvedValue(response);
      const screen = render(<Picker />);
      await screen.findByText(
        "Saved runs are unavailable. Retry the read before comparing."
      );
      expect(screen.queryByText(empty)).toBeNull();
      expect(screen.getByRole("button", { name: compare })).toBeDisabled();
    }
  );
  it("keeps selections but disables stale comparison through refresh failure and recovers", async () => {
    mockApi
      .mockResolvedValueOnce(choices)
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(choices);
    const screen = render(<Picker />);
    await screen.findByText("Morning");
    choose(screen);
    expect(screen.getByRole("button", { name: compare })).toBeEnabled();
    fireEvent.press(screen.getByRole("button", { name: pickerRefresh }));
    expect(screen.getByRole("button", { name: compare })).toBeDisabled();
    await screen.findByText("Offline");
    expect(screen.getByText(/Previously loaded runs/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: compare }));
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole("button", { name: pickerRefresh }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: compare })).toBeEnabled()
    );
    fireEvent.press(screen.getByRole("button", { name: compare }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/sop-runs/compare-result",
      params: { leftId: "run-1", rightId: "run-2" }
    });
  });
  it("deduplicates saved identities and prevents using a removed selection", async () => {
    mockApi
      .mockResolvedValueOnce({ runs: [...choices.runs, choices.runs[0]] })
      .mockResolvedValueOnce({ runs: [choices.runs[0]] });
    const screen = render(<Picker />);
    await screen.findByText("Morning");
    expect(
      screen.getAllByRole("button", { name: "Select Morning as reference run" })
    ).toHaveLength(1);
    choose(screen);
    fireEvent.press(screen.getByRole("button", { name: pickerRefresh }));
    await waitFor(() => expect(screen.queryByText("Evening")).toBeNull());
    expect(screen.getByRole("button", { name: compare })).toBeDisabled();
  });
  it("does not read or spin without a Facility", () => {
    mockFacility = "";
    const screen = render(<Picker />);
    expect(screen.getByText("Select a facility first.")).toBeTruthy();
    expect(screen.queryByText("Loading saved runs…")).toBeNull();
    expect(mockApi).not.toHaveBeenCalled();
  });
  it.each(["user", "token", "facility", "role"])(
    "discards selections and late reads across %s boundary",
    async (boundary) => {
      const old = deferred();
      const next = deferred();
      mockApi
        .mockResolvedValueOnce(choices)
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(next.promise);
      const screen = render(<Picker />);
      await screen.findByText("Morning");
      choose(screen);
      fireEvent.press(screen.getByRole("button", { name: pickerRefresh }));
      if (boundary === "user") mockUser = "other";
      if (boundary === "token") mockToken = "new-session";
      if (boundary === "facility") mockFacility = "facility-2";
      if (boundary === "role") mockRole = "VIEWER";
      screen.rerender(<Picker />);
      await act(async () => old.resolve(choices));
      expect(screen.queryByText("Morning")).toBeNull();
      await act(async () => next.resolve(choices));
      expect(screen.getByRole("button", { name: compare })).toBeDisabled();
      expect(screen.getAllByText("Choose below")).toHaveLength(2);
    }
  );
});

describe("SOP comparison result atomic verified reads", () => {
  it.each([
    {},
    { leftId: "run-1", rightId: "run-1" },
    { leftId: ["run-1"], rightId: "run-2" },
    { leftId: "../bad", rightId: "run-2" }
  ])("rejects invalid pair %j without requests", async (params) => {
    mockParams = params;
    const screen = render(<Result />);
    await screen.findByText("Select two saved runs before comparing them.");
    expect(mockApi).not.toHaveBeenCalled();
    expect(screen.queryByText("Outcome summary")).toBeNull();
  });
  it.each([
    null,
    { run: null },
    { run: { id: "other", steps: [] } },
    { run: { id: "run-1" } },
    { run: { id: "run-1", steps: [null] } }
  ])("rejects unreadable/mismatched evidence %j", async (response) => {
    mockApi.mockResolvedValueOnce(response).mockResolvedValueOnce(saved("run-2"));
    const screen = render(<Result />);
    await screen.findByText(
      "Saved run evidence is unavailable. Retry both runs before comparing."
    );
    expect(screen.queryByText("Outcome summary")).toBeNull();
    expect(screen.getByRole("button", { name: resultRefresh })).toBeEnabled();
  });
  it("withholds half reads and single-flights the two-read Retry", async () => {
    const left = deferred();
    const right = deferred();
    mockApi
      .mockResolvedValueOnce(saved("run-1"))
      .mockRejectedValueOnce(new Error("Offline"))
      .mockReturnValueOnce(left.promise)
      .mockReturnValueOnce(right.promise);
    const screen = render(<Result />);
    await screen.findByText("Offline");
    expect(screen.queryByText("Outcome summary")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: resultRefresh }));
    fireEvent.press(screen.getByRole("button", { name: resultRefresh }));
    expect(mockApi).toHaveBeenCalledTimes(4);
    await act(async () => left.resolve(saved("run-1")));
    expect(screen.queryByText("Outcome summary")).toBeNull();
    await act(async () => right.resolve(saved("run-2")));
    expect(screen.getByText("Outcome summary")).toBeTruthy();
    expect(mockApi.mock.calls.every((call) => call.length === 1)).toBe(true);
  });
  it("withholds a previous pair while refreshing and after failure, then recovers both", async () => {
    mockApi
      .mockResolvedValueOnce(saved("run-1"))
      .mockResolvedValueOnce(saved("run-2"))
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce(saved("run-2"))
      .mockResolvedValueOnce(saved("run-1"))
      .mockResolvedValueOnce(saved("run-2"));
    const screen = render(<Result />);
    await screen.findByText("Outcome summary");
    fireEvent.press(screen.getByRole("button", { name: resultRefresh }));
    expect(screen.queryByText("Outcome summary")).toBeNull();
    await screen.findByText("Offline");
    expect(screen.getByText(/Previously loaded comparison is withheld/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: resultRefresh }));
    await screen.findByText("Outcome summary");
  });
  it.each(["user", "token", "facility", "role", "route"])(
    "ignores late pair after %s change",
    async (boundary) => {
      const old = deferred();
      const next = deferred();
      mockApi
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(next.promise)
        .mockResolvedValueOnce(saved("run-2"));
      const screen = render(<Result />);
      if (boundary === "user") mockUser = "other";
      if (boundary === "token") mockToken = "new-session";
      if (boundary === "facility") mockFacility = "facility-2";
      if (boundary === "role") mockRole = "VIEWER";
      if (boundary === "route") mockParams.leftId = "run-3";
      screen.rerender(<Result />);
      await act(async () => old.resolve(saved("run-1", "Old pair")));
      expect(screen.queryByText("Old pair")).toBeNull();
      await act(async () =>
        next.resolve(saved(String(mockParams.leftId), "Current pair"))
      );
      expect(screen.getByText("Current pair")).toBeTruthy();
      expect(screen.getByText("Outcome summary")).toBeTruthy();
    }
  );
});
