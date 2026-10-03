import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import Detail from "@/app/home/facility/sop-runs/[id]";

const mockApi = jest.fn();
let mockId = "run-1";
let mockFacility = "facility-1";
let mockUser = "owner";
let mockToken = "session";
let mockRole = "OWNER";
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApi(...args)
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: mockId }),
  useRouter: () => ({ push: jest.fn() })
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: mockUser }, token: mockToken })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacility })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { SOP_RUNS_WRITE: "write" },
  useEntitlements: () => ({ facilityRole: mockRole, can: () => mockRole !== "VIEWER" })
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));

const saved = {
  run: {
    id: "run-1",
    title: "Saved checklist",
    status: "active",
    steps: [
      { stepId: "first", title: "First check", status: "done" },
      { stepId: "second", title: "Second check", status: "skipped" }
    ]
  }
};
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const refresh = "Refresh SOP run detail";
const complete = "Mark SOP run complete";
const done = "Mark SOP step First check done";
const add = "Add SOP evidence step";
beforeEach(() => {
  mockApi.mockReset().mockResolvedValue(saved);
  mockId = "run-1";
  mockFacility = "facility-1";
  mockUser = "owner";
  mockToken = "session";
  mockRole = "OWNER";
});

it.each([null, {}, { run: null }, { data: null }, { run: [] }])(
  "rejects unavailable envelopes without an invented active record: %j",
  async (response) => {
    mockApi.mockResolvedValueOnce(response);
    const ui = render(<Detail />);
    await ui.findByText("SOP run unavailable");
    expect(ui.queryByText("Active")).toBeNull();
    expect(ui.queryByText("0/0")).toBeNull();
    expect(ui.queryByLabelText(add)).toBeNull();
    expect(ui.queryByLabelText(complete)).toBeNull();
    fireEvent.press(ui.getByLabelText(refresh));
    await ui.findByText("Saved checklist");
  }
);

it("recovers an initial error through a visible retry", async () => {
  mockApi.mockRejectedValueOnce(new Error("SOP run not found"));
  const ui = render(<Detail />);
  await ui.findByText("SOP run unavailable");
  expect(ui.queryByLabelText("SOP step title")).toBeNull();
  fireEvent.press(ui.getByLabelText(refresh));
  await ui.findByText("Saved checklist");
  expect(ui.getByLabelText(complete)).toBeEnabled();
});

it("retains a draft and labels the snapshot after refresh failure; retry restores writes", async () => {
  const ui = render(<Detail />);
  await ui.findByText("Saved checklist");
  fireEvent.changeText(ui.getByLabelText("SOP step title"), "New observation");
  fireEvent.changeText(ui.getByLabelText("SOP step note"), "Keep this draft");
  const pending = deferred();
  mockApi.mockReturnValueOnce(pending.promise);
  fireEvent.press(ui.getByLabelText(refresh));
  fireEvent.press(ui.getByLabelText(refresh));
  fireEvent.press(ui.getByLabelText(done));
  fireEvent.press(ui.getByLabelText(complete));
  fireEvent.press(ui.getByLabelText(add));
  expect(mockApi).toHaveBeenCalledTimes(2);
  expect(ui.getByLabelText(done)).toBeDisabled();
  await act(async () => pending.reject(new Error("Unavailable")));
  await ui.findByText(/Previously loaded SOP run/);
  expect(ui.getByLabelText(complete)).toBeDisabled();
  expect(ui.getByLabelText(add)).toBeDisabled();
  expect(ui.getByDisplayValue("Keep this draft")).toBeTruthy();
  fireEvent.press(ui.getByLabelText(refresh));
  await ui.findByText("Refresh");
  expect(ui.queryByText(/Previously loaded SOP run/)).toBeNull();
  expect(ui.getByLabelText(add)).toBeEnabled();
  expect(ui.getByDisplayValue("New observation")).toBeTruthy();
});

it("serializes mutations across every step, completion, and refresh", async () => {
  const ui = render(<Detail />);
  await ui.findByText("Saved checklist");
  const pending = deferred();
  mockApi.mockReturnValueOnce(pending.promise);
  fireEvent.press(ui.getByLabelText(done));
  fireEvent.press(ui.getByLabelText(done));
  fireEvent.press(ui.getByLabelText("Skip SOP step Second check"));
  fireEvent.press(ui.getByLabelText(complete));
  fireEvent.press(ui.getByLabelText(refresh));
  expect(mockApi).toHaveBeenCalledTimes(2);
  expect(ui.getByLabelText(refresh)).toBeDisabled();
  expect(ui.getByLabelText("Skip SOP step Second check")).toBeDisabled();
  await act(async () => pending.resolve(saved));
  await ui.findByText("Step evidence updated.");
  expect(ui.getByLabelText(refresh)).toBeEnabled();
});

it("keeps an unsaved draft after a rejected write", async () => {
  const ui = render(<Detail />);
  await ui.findByText("Saved checklist");
  fireEvent.changeText(ui.getByLabelText("SOP step title"), "New observation");
  mockApi.mockRejectedValueOnce(new Error("Write rejected"));
  fireEvent.press(ui.getByLabelText(add));
  await ui.findByText("Write rejected");
  expect(ui.getByDisplayValue("New observation")).toBeTruthy();
  expect(ui.getByLabelText(add)).toBeEnabled();
});

it("distinguishes confirmed completion from an unsuccessful follow-up read", async () => {
  const ui = render(<Detail />);
  await ui.findByText("Saved checklist");
  mockApi
    .mockResolvedValueOnce({ ok: true })
    .mockRejectedValueOnce(new Error("Read failed"));
  fireEvent.press(ui.getByLabelText(complete));
  await ui.findByText(/Run marked complete, but the saved record could not be refreshed/);
  expect(ui.getByLabelText(complete)).toBeDisabled();
  fireEvent.press(ui.getByLabelText(complete));
  expect(mockApi).toHaveBeenCalledTimes(3);
});

it("locks a confirmed step write with an invalid response until the record is re-read", async () => {
  const ui = render(<Detail />);
  await ui.findByText("Saved checklist");
  mockApi.mockResolvedValueOnce({ run: null });
  fireEvent.press(ui.getByLabelText(done));
  await ui.findByText(/Step evidence saved, but the returned record is unavailable/);
  expect(ui.getByLabelText(done)).toBeDisabled();
  fireEvent.press(ui.getByLabelText(refresh));
  await ui.findByText("Refresh");
  expect(ui.getByLabelText(done)).toBeEnabled();
});

const changeScope = {
  account: () => {
    mockUser = "other";
  },
  session: () => {
    mockToken = "new-session";
  },
  facility: () => {
    mockFacility = "facility-2";
  },
  role: () => {
    mockRole = "VIEWER";
  },
  route: () => {
    mockId = "run-2";
  }
};
it.each(Object.keys(changeScope) as (keyof typeof changeScope)[])(
  "discards late reads and drafts across a %s change",
  async (scope) => {
    const ui = render(<Detail />);
    await ui.findByText("Saved checklist");
    fireEvent.changeText(ui.getByLabelText("SOP step title"), "Private draft");
    const pending = deferred();
    mockApi.mockReturnValueOnce(pending.promise);
    fireEvent.press(ui.getByLabelText(refresh));
    mockApi.mockResolvedValueOnce({
      run: { id: "new", title: "New context", steps: [] }
    });
    changeScope[scope]();
    ui.rerender(<Detail />);
    await ui.findByText("New context");
    await act(async () =>
      pending.resolve({ run: { title: "Late old context", steps: [] } })
    );
    expect(ui.queryByText("Late old context")).toBeNull();
    expect(ui.queryByDisplayValue("Private draft")).toBeNull();
    expect(ui.getByText("New context")).toBeTruthy();
  }
);

it.each(["step", "complete"])(
  "discards a late %s response without a follow-up read in the new context",
  async (action) => {
    const ui = render(<Detail />);
    await ui.findByText("Saved checklist");
    const pending = deferred();
    mockApi.mockReturnValueOnce(pending.promise);
    fireEvent.press(ui.getByLabelText(action === "step" ? done : complete));
    mockRole = "VIEWER";
    mockApi.mockResolvedValueOnce({ run: { title: "Viewer record", steps: [] } });
    ui.rerender(<Detail />);
    await ui.findByText("Viewer record");
    await act(async () => pending.resolve(saved));
    expect(mockApi).toHaveBeenCalledTimes(3);
    expect(ui.queryByText("Saved checklist")).toBeNull();
    expect(ui.queryByLabelText(complete)).toBeNull();
    expect(ui.queryByLabelText(add)).toBeNull();
  }
);
