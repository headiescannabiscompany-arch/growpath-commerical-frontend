import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { RefreshControl } from "react-native";
import Grows from "@/app/home/facility/(tabs)/grows";
import Tasks from "@/app/home/facility/(tabs)/tasks";
import Grow from "@/app/home/facility/grows/[id]";
import Task from "@/app/home/facility/tasks/[id]";

const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockTeam = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockMap = Object.assign((e: any) => ({ message: e.message }), {
  toInlineError: (e: any) => ({ message: e.message })
});
let mockFacility = "facility-1";
let mockRole = "OWNER";
let mockUser = "owner-1";
let mockParams: Record<string, string> = { id: "record-1" };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  Link: ({ children }: any) => children
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: mockUser }, token: mockUser })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacility })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { TASKS_WRITE: "tasks_write", GROWS_WRITE: "grows_write" },
  useEntitlements: () => ({ facilityRole: mockRole, can: () => mockRole !== "VIEWER" })
}));
jest.mock("@/hooks/useApiErrorHandler", () => ({ useApiErrorHandler: () => mockMap }));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockRead(...args)
}));
jest.mock("@/api/tasks", () => ({
  getFacilityTasks: (...args: any[]) => mockRead(...args),
  getTask: (...args: any[]) => mockRead(...args),
  createTask: (...args: any[]) => mockWrite(...args),
  updateTask: (...args: any[]) => mockWrite(...args),
  completeFacilityTask: (...args: any[]) => mockWrite(...args),
  deleteTask: (...args: any[]) => mockWrite(...args)
}));
jest.mock("@/api/team", () => ({
  listTeamMembers: (...args: any[]) => mockTeam(...args)
}));
jest.mock("@/api/rooms", () => ({ fetchRooms: async () => [] }));
jest.mock("@/features/facility/useFacilityRooms", () => ({
  useFacilityRooms: () => ({ rooms: [], loading: false, error: null })
}));
jest.mock("@/features/facility/useFacilityGrows", () => ({
  useFacilityGrows: () => ({ grows: [], loading: false, error: null })
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/components/facility/FacilityContextualTools", () => () => null);
jest.mock("@/components/integrations/GrowIntegrationBuildPanel", () => () => null);

const record = {
  id: "record-1",
  name: "Saved QA grow",
  title: "Saved QA task",
  cropTypes: ["Tomato"]
};

describe("Facility retained forms and write/read boundaries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFacility = "facility-1";
    mockRole = "OWNER";
    mockUser = "owner-1";
    mockParams = { id: "record-1" };
    mockRead.mockReset();
    mockWrite.mockReset();
    mockTeam.mockReset().mockResolvedValue([]);
  });

  it("requires a saved-title confirmation and cancel never deletes or saves a draft", async () => {
    mockRead.mockResolvedValue(record);
    const screen = render(<Task />);
    await waitFor(() => expect(screen.getByLabelText("Delete task")).not.toBeDisabled());
    fireEvent.changeText(screen.getByLabelText("Task detail title"), "Unsubmitted name");
    fireEvent.press(screen.getByLabelText("Delete task"));
    expect(mockWrite).not.toHaveBeenCalled();
    expect(
      screen.getByText("Remove “Saved QA task” from the active task queue?")
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Cancel task removal"));
    expect(screen.queryByLabelText("Confirm task removal")).toBeNull();
    expect(screen.getByLabelText("Task detail title").props.value).toBe(
      "Unsubmitted name"
    );
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("serializes confirmed removal and returns only after success", async () => {
    mockRead.mockResolvedValue(record);
    let finish: (value: unknown) => void = () => {};
    mockWrite.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<Task />);
    await waitFor(() => expect(screen.getByLabelText("Delete task")).not.toBeDisabled());
    fireEvent.press(screen.getByLabelText("Delete task"));
    const confirm = screen.getByLabelText("Confirm task removal");
    act(() => {
      fireEvent.press(confirm);
      fireEvent.press(confirm);
    });
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledWith("facility-1", "record-1");
    expect(mockRouter.replace).not.toHaveBeenCalled();
    for (const label of [
      "Refresh facility task",
      "Save task details",
      "Complete task",
      "Cancel task removal"
    ])
      expect(screen.getByLabelText(label)).toBeDisabled();
    await act(async () => finish({ ok: true }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/home/facility/tasks");
  });

  it("retains a failed removal and requires another deliberate confirmation", async () => {
    mockRead.mockResolvedValue(record);
    mockWrite.mockRejectedValueOnce(new Error("Removal unavailable"));
    const screen = render(<Task />);
    await waitFor(() => expect(screen.getByLabelText("Delete task")).not.toBeDisabled());
    fireEvent.press(screen.getByLabelText("Delete task"));
    fireEvent.press(screen.getByLabelText("Confirm task removal"));
    await waitFor(() => expect(screen.getByText("Removal unavailable")).toBeTruthy());
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Confirm task removal")).not.toBeDisabled();
    fireEvent.press(screen.getByLabelText("Cancel task removal"));
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });

  it("invalidates a removal prompt when refreshing the record", async () => {
    mockRead.mockResolvedValue(record);
    const screen = render(<Task />);
    await waitFor(() => expect(screen.getByLabelText("Delete task")).not.toBeDisabled());
    fireEvent.press(screen.getByLabelText("Delete task"));
    fireEvent.press(screen.getByLabelText("Refresh facility task"));
    await waitFor(() =>
      expect(screen.getByLabelText("Refresh facility task")).not.toBeDisabled()
    );
    expect(screen.queryByLabelText("Confirm task removal")).toBeNull();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it.each(["facility", "user", "role", "route"])(
    "drops removal confirmation after a %s switch",
    async (scope) => {
      mockRead.mockResolvedValue(record);
      const screen = render(<Task />);
      await waitFor(() =>
        expect(screen.getByLabelText("Delete task")).not.toBeDisabled()
      );
      fireEvent.press(screen.getByLabelText("Delete task"));
      if (scope === "facility") mockFacility = "facility-2";
      if (scope === "user") mockUser = "owner-2";
      if (scope === "role") mockRole = "STAFF";
      if (scope === "route") mockParams = { id: "record-2" };
      screen.rerender(<Task />);
      await waitFor(() =>
        expect(screen.getByLabelText("Refresh facility task")).not.toBeDisabled()
      );
      expect(screen.queryByLabelText("Confirm task removal")).toBeNull();
      expect(mockWrite).not.toHaveBeenCalled();
    }
  );

  it.each(["Save task details", "Complete task"])(
    "invalidates removal when %s changes the record",
    async (action) => {
      mockRead.mockResolvedValue(record);
      mockWrite.mockResolvedValue(record);
      const screen = render(<Task />);
      await waitFor(() =>
        expect(screen.getByLabelText("Delete task")).not.toBeDisabled()
      );
      fireEvent.press(screen.getByLabelText("Delete task"));
      fireEvent.press(screen.getByLabelText(action));
      await waitFor(() =>
        expect(screen.queryByLabelText("Confirm task removal")).toBeNull()
      );
      expect(mockWrite).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).not.toHaveBeenCalled();
    }
  );

  it("ignores a confirmed removal response after switching Facility", async () => {
    mockRead.mockResolvedValue(record);
    let finish: (value: unknown) => void = () => {};
    mockWrite.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<Task />);
    await waitFor(() => expect(screen.getByLabelText("Delete task")).not.toBeDisabled());
    fireEvent.press(screen.getByLabelText("Delete task"));
    fireEvent.press(screen.getByLabelText("Confirm task removal"));
    mockFacility = "facility-2";
    screen.rerender(<Task />);
    await act(async () => finish({ ok: true }));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("allows a capable Manager to review removal without performing it", async () => {
    mockRole = "MANAGER";
    mockRead.mockResolvedValue(record);
    const screen = render(<Task />);
    await waitFor(() => expect(screen.getByLabelText("Delete task")).not.toBeDisabled());
    fireEvent.press(screen.getByLabelText("Delete task"));
    expect(screen.getByLabelText("Confirm task removal")).not.toBeDisabled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it.each(["STAFF", "VIEWER"])("does not offer removal to %s", async (role) => {
    mockRole = role;
    mockRead.mockResolvedValue(record);
    const screen = render(<Task />);
    await waitFor(() => expect(screen.getByText("Saved QA task")).toBeTruthy());
    expect(screen.queryByLabelText("Delete task")).toBeNull();
    expect(screen.queryByLabelText("Confirm task removal")).toBeNull();
  });

  it("keeps the readable queue when team lookup fails and retries without losing a draft", async () => {
    mockRead.mockResolvedValue([record]);
    mockTeam.mockRejectedValueOnce(new Error("Team unavailable"));
    const screen = render(<Tasks />);
    await waitFor(() =>
      expect(
        screen.getByText(
          "Team choices unavailable. Retry before creating or assigning a task."
        )
      ).toBeTruthy()
    );
    expect(screen.getByText("Saved QA task")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Toggle facility task creator"));
    fireEvent.changeText(
      screen.getByLabelText("Facility task title"),
      "Unsubmitted draft"
    );
    expect(screen.getByLabelText("Create facility task")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Retry facility tasks"));
    await waitFor(() =>
      expect(screen.getByLabelText("Create facility task")).not.toBeDisabled()
    );
    expect(screen.getByLabelText("Facility task title").props.value).toBe(
      "Unsubmitted draft"
    );
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("retains the task and blocks assignment when optional team choices fail", async () => {
    mockRead.mockResolvedValue(record);
    mockTeam.mockRejectedValueOnce(new Error("Team unavailable"));
    const screen = render(<Task />);
    await waitFor(() =>
      expect(
        screen.getByText("Team choices unavailable. Retry before changing assignment.")
      ).toBeTruthy()
    );
    expect(screen.getByText("Saved QA task")).toBeTruthy();
    expect(screen.getByLabelText("Save task assignment")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Retry facility task"));
    await waitFor(() =>
      expect(screen.getByLabelText("Save task assignment")).not.toBeDisabled()
    );
  });

  it("preserves edited task fields across failed refresh and successful retry", async () => {
    mockRead.mockResolvedValue(record);
    const screen = render(<Task />);
    await waitFor(() =>
      expect(screen.getByLabelText("Refresh facility task")).not.toBeDisabled()
    );
    fireEvent.changeText(screen.getByLabelText("Task detail title"), "Unsubmitted title");
    mockRead.mockRejectedValueOnce(new Error("Read unavailable"));
    fireEvent.press(screen.getByLabelText("Refresh facility task"));
    await waitFor(() => expect(screen.getByText("Read unavailable")).toBeTruthy());
    for (const label of [
      "Save task details",
      "Save task assignment",
      "Save task workflow context",
      "Complete task",
      "Delete task"
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    fireEvent.press(screen.getByLabelText("Retry facility task"));
    await waitFor(() =>
      expect(screen.getByLabelText("Save task details")).not.toBeDisabled()
    );
    expect(screen.getByLabelText("Task detail title").props.value).toBe(
      "Unsubmitted title"
    );
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("preserves unsaved crop choices across failed refresh and retry", async () => {
    mockRead.mockResolvedValue({ grow: record });
    const screen = render(<Grow />);
    await waitFor(() =>
      expect(screen.getByLabelText("Refresh facility grow")).not.toBeDisabled()
    );
    fireEvent.press(screen.getByLabelText("Select crop Cannabis"));
    mockRead.mockRejectedValueOnce(new Error("Read unavailable"));
    fireEvent.press(screen.getByLabelText("Refresh facility grow"));
    await waitFor(() => expect(screen.getByText("Read unavailable")).toBeTruthy());
    expect(screen.getByLabelText("Save crop context")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Retry facility grow"));
    await waitFor(() =>
      expect(screen.getByLabelText("Save crop context")).not.toBeDisabled()
    );
    expect(screen.getByLabelText("Remove crop Cannabis")).toBeTruthy();
  });

  it("serializes creation and prevents manual reads while creating", async () => {
    mockRead.mockResolvedValue([record]);
    let finish: (v: unknown) => void = () => {};
    mockWrite.mockImplementation(
      () =>
        new Promise((r) => {
          finish = r;
        })
    );
    const screen = render(<Tasks />);
    await waitFor(() =>
      expect(screen.getByLabelText("Refresh facility tasks")).not.toBeDisabled()
    );
    fireEvent.press(screen.getByLabelText("Toggle facility task creator"));
    fireEvent.changeText(screen.getByLabelText("Facility task title"), "QA draft");
    act(() => {
      fireEvent.press(screen.getByLabelText("Create facility task"));
      fireEvent.press(screen.getByLabelText("Create facility task"));
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockRead).toHaveBeenCalledTimes(1);
    await act(async () => finish({ id: "created-task", title: "QA draft" }));
    expect(mockRead).toHaveBeenCalledTimes(2);
    expect(screen.getByText("QA draft")).toBeTruthy();
  });

  it("prevents refresh and conflicting task writes while saving", async () => {
    mockRead.mockResolvedValue(record);
    let finish: (v: unknown) => void = () => {};
    mockWrite.mockImplementation(
      () =>
        new Promise((r) => {
          finish = r;
        })
    );
    const screen = render(<Task />);
    await waitFor(() =>
      expect(screen.getByLabelText("Save task details")).not.toBeDisabled()
    );
    act(() => {
      fireEvent.press(screen.getByLabelText("Save task details"));
      fireEvent.press(screen.getByLabelText("Complete task"));
      fireEvent.press(screen.getByLabelText("Delete task"));
      screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(mockRead).toHaveBeenCalledTimes(1);
    await act(async () => finish(record));
  });
});
const cases = [
  {
    title: "grow list",
    Component: Grows,
    value: { grows: [record] },
    label: "facility grows",
    empty: "No facility grows yet"
  },
  {
    title: "task queue",
    Component: Tasks,
    value: [record],
    label: "facility tasks",
    empty: "No tasks yet"
  },
  {
    title: "grow detail",
    Component: Grow,
    value: { grow: record },
    label: "facility grow",
    empty: "Grow not found"
  },
  {
    title: "task detail",
    Component: Task,
    value: record,
    label: "facility task",
    empty: "Task not found"
  }
];

describe.each(cases)(
  "Facility $title read recovery",
  ({ Component, value, label, empty }) => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockFacility = "facility-1";
      mockRole = "OWNER";
      mockUser = "owner-1";
      mockParams = { id: "record-1" };
      mockRead.mockReset().mockResolvedValue(value);
      mockTeam.mockReset().mockResolvedValue([]);
    });

    it("does not label a failed first read as empty or missing and can retry", async () => {
      mockRead.mockRejectedValueOnce(new Error("Read unavailable"));
      const screen = render(<Component />);
      await waitFor(() => expect(screen.getByText("Read unavailable")).toBeTruthy());
      expect(screen.queryByText(empty)).toBeNull();
      expect(screen.queryByText(/^(0 grows|0 tasks)$/)).toBeNull();
      fireEvent.press(screen.getByLabelText(`Retry ${label}`));
      await waitFor(() => expect(screen.queryByText("Read unavailable")).toBeNull());
      expect(mockRead).toHaveBeenCalledTimes(2);
    });

    it("labels retained records after a failed refresh and serializes retry", async () => {
      const screen = render(<Component />);
      await waitFor(() =>
        expect(screen.getByLabelText(`Refresh ${label}`)).not.toBeDisabled()
      );
      mockRead.mockRejectedValueOnce(new Error("Refresh unavailable"));
      fireEvent.press(screen.getByLabelText(`Refresh ${label}`));
      await waitFor(() =>
        expect(screen.getByText(/Showing previously loaded/)).toBeTruthy()
      );
      expect(screen.queryByText(empty)).toBeNull();
      let resolve: (v: unknown) => void = () => {};
      mockRead.mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolve = r;
          })
      );
      act(() => {
        screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
        screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
      });
      expect(mockRead).toHaveBeenCalledTimes(3);
      await act(async () => resolve(value));
      expect(screen.queryByText("Refresh unavailable")).toBeNull();
    });

    it.each(["account", "facility", "role", "route"])(
      "drops the previous %s context and ignores its late response",
      async (scope) => {
        let resolveOld: (v: unknown) => void = () => {};
        mockRead.mockImplementationOnce(
          () =>
            new Promise((r) => {
              resolveOld = r;
            })
        );
        const screen = render(<Component />);
        if (scope === "account") mockUser = "owner-2";
        if (scope === "facility") mockFacility = "facility-2";
        if (scope === "role") mockRole = "VIEWER";
        if (scope === "route") mockParams = { id: "record-2", roomId: "room-2" };
        mockRead.mockRejectedValueOnce(new Error("New context unavailable"));
        screen.rerender(<Component />);
        await waitFor(() =>
          expect(screen.getByText("New context unavailable")).toBeTruthy()
        );
        await act(async () => resolveOld(value));
        expect(screen.queryByText(/Saved QA/)).toBeNull();
        expect(mockRead).toHaveBeenCalledTimes(2);
      }
    );
  }
);
