import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Start from "@/app/home/facility/sop-runs/start";
import Library from "@/app/home/facility/sop-runs/presets";
import { getSOPTemplates } from "@/api/sop";

const mockApi = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockPicker = jest.fn();
const mockUpload = jest.fn();
let mockFacility = "facility-1",
  mockUser = "qa",
  mockToken = "session",
  mockRole = "OWNER";
let mockCan = true;
let mockParams: Record<string, any> = {};
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  Link: ({ children }: any) => children
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: mockUser }, token: mockToken })
}));
jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: mockFacility })
}));
jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { SOP_RUNS_WRITE: "write" },
  useEntitlements: () => ({ can: () => mockCan, facilityRole: mockRole })
}));
jest.mock("@/api/apiRequest", () => ({
  API_URL: "https://example.invalid",
  apiRequest: (...args: any[]) => mockApi(...args)
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({ toInlineError: (e: Error) => ({ message: e.message }) })
}));
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: any[]) => mockPicker(...args)
}));
jest.mock("@/api/uploads", () => ({
  uploadSopDocument: (...args: any[]) => mockUpload(...args)
}));

const template = {
  id: "template-1",
  title: "Daily check",
  content: "Inspect room",
  isActive: true
};
const list = { templates: [template] };
let client: QueryClient;
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return { resolve, promise };
};
function show(Component: React.ComponentType) {
  const wrapper = ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<Component />, { wrapper });
}
function draft(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByLabelText("SOP title"), "Test procedure");
  fireEvent.changeText(screen.getByLabelText("SOP checklist steps"), "Inspect room");
  fireEvent.press(screen.getByLabelText("Confirm SOP facility review"));
}
const writes = () =>
  mockApi.mock.calls.filter((c) => c[1]?.method && c[1].method !== "GET");
beforeEach(() => {
  mockApi.mockReset();
  mockReplace.mockReset();
  mockPush.mockReset();
  mockPicker.mockReset();
  mockUpload.mockReset();
  mockFacility = "facility-1";
  mockUser = "qa";
  mockToken = "session";
  mockRole = "OWNER";
  mockCan = true;
  mockParams = {};
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } }
  });
  mockApi.mockResolvedValue(list);
});
afterEach(() => client.clear());

describe("SOP template collection contract", () => {
  it.each([
    null,
    {},
    { templates: null },
    { templates: [null] },
    { templates: [{ title: "No id" }] },
    { templates: [{ id: "../bad" }] }
  ])("rejects unavailable or malformed collection %j", async (value) => {
    mockApi.mockResolvedValue(value);
    await expect(getSOPTemplates("facility-1")).rejects.toThrow(
      "Saved SOP templates are unavailable"
    );
  });
  it.each([[], { templates: [] }, { items: [] }, { sops: [] }, { data: [] }])(
    "accepts supported successful empty collection %j",
    async (value) => {
      mockApi.mockResolvedValue(value);
      await expect(getSOPTemplates("facility-1")).resolves.toEqual([]);
    }
  );
});

describe("SOP start verified choices", () => {
  it("does not claim empty on failed read, preserves draft through single-flight Retry", async () => {
    const retry = deferred();
    mockApi
      .mockRejectedValueOnce(new Error("Offline"))
      .mockReturnValueOnce(retry.promise);
    const screen = show(Start);
    await screen.findByText("Offline");
    expect(screen.queryByText(/No SOP templates yet/)).toBeNull();
    fireEvent.changeText(screen.getByLabelText("SOP run title"), "Draft run");
    fireEvent.changeText(screen.getByLabelText("One-off SOP checklist steps"), "Inspect");
    expect(screen.getByLabelText("Start SOP run")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Refresh SOP start templates"));
    fireEvent.press(screen.getByLabelText("Refresh SOP start templates"));
    expect(mockApi).toHaveBeenCalledTimes(2);
    await act(async () => retry.resolve(list));
    await waitFor(() => expect(screen.getByLabelText("Start SOP run")).toBeEnabled());
    expect(screen.getByLabelText("SOP run title").props.value).toBe("Draft run");
    expect(writes()).toHaveLength(0);
  });
  it("requires a current saved template instead of trusting route identity", async () => {
    mockParams = { templateId: "absent", templateTitle: "Unknown" };
    const screen = show(Start);
    await screen.findByLabelText("Select SOP template Daily check");
    expect(screen.getByLabelText("Start SOP run")).toBeDisabled();
    expect(screen.queryByText(/Selected ID/)).toBeNull();
    fireEvent.press(screen.getByLabelText("Select SOP template Daily check"));
    await waitFor(() => expect(screen.getByLabelText("Start SOP run")).toBeEnabled());
  });
  it("locks template changes/refresh during one create and ignores late navigation after account change", async () => {
    const save = deferred();
    mockApi.mockImplementation((_p: string, opts: any) =>
      opts?.method === "POST" ? save.promise : Promise.resolve(list)
    );
    const screen = show(Start);
    await screen.findByLabelText("Select SOP template Daily check");
    fireEvent.press(screen.getByLabelText("Select SOP template Daily check"));
    fireEvent.press(screen.getByLabelText("Start SOP run"));
    fireEvent.press(screen.getByLabelText("Start SOP run"));
    expect(writes()).toHaveLength(1);
    expect(screen.getByLabelText("Select SOP template Daily check")).toBeDisabled();
    expect(screen.getByLabelText("Clear SOP template selection")).toBeDisabled();
    expect(screen.getByLabelText("Refresh SOP start templates")).toBeDisabled();
    mockUser = "other";
    screen.rerender(<Start />);
    await act(async () => save.resolve({ run: { id: "new-run" } }));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("SOP run title").props.value).toBe("");
  });
  it("retains failed one-off run draft and retries its existing payload", async () => {
    mockApi.mockImplementation((_p: string, opts: any) =>
      opts?.method === "POST"
        ? Promise.reject(new Error("Save failed"))
        : Promise.resolve(list)
    );
    const screen = show(Start);
    await screen.findByLabelText("Select SOP template Daily check");
    fireEvent.changeText(screen.getByLabelText("SOP run title"), "One-off");
    fireEvent.changeText(
      screen.getByLabelText("One-off SOP checklist steps"),
      "Inspect\nRecord"
    );
    fireEvent.press(screen.getByLabelText("Start SOP run"));
    await screen.findByText("Save failed");
    expect(screen.getByLabelText("One-off SOP checklist steps").props.value).toBe(
      "Inspect\nRecord"
    );
    expect(writes()[0][1].body.steps).toEqual([
      { title: "Inspect" },
      { title: "Record" }
    ]);
  });
  it.each(["facility", "session", "role"])(
    "isolates templates and draft after %s change",
    async (boundary) => {
      const delayed = deferred();
      mockApi.mockResolvedValueOnce(list).mockReturnValueOnce(delayed.promise);
      const screen = show(Start);
      await screen.findByLabelText("Select SOP template Daily check");
      fireEvent.press(screen.getByLabelText("Select SOP template Daily check"));
      if (boundary === "facility") mockFacility = "facility-2";
      if (boundary === "session") mockToken = "new-session";
      if (boundary === "role") mockRole = "MANAGER";
      screen.rerender(<Start />);
      expect(screen.queryByLabelText("Select SOP template Daily check")).toBeNull();
      expect(screen.getByLabelText("SOP run title").props.value).toBe("");
      await act(async () => delayed.resolve({ templates: [] }));
      expect(screen.getByLabelText("Start SOP run")).toBeDisabled();
    }
  );
});

describe("SOP Library read and action recovery", () => {
  it("fails without false empty guidance or writes; Retry preserves reviewed draft", async () => {
    mockApi.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(list);
    const screen = show(Library);
    await screen.findByText("Offline");
    draft(screen);
    expect(screen.queryByText(/No active facility SOPs yet/)).toBeNull();
    expect(screen.getByLabelText("Save facility SOP")).toBeDisabled();
    expect(screen.getByLabelText("Choose SOP document")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Refresh SOP library"));
    await waitFor(() => expect(screen.getByLabelText("Save facility SOP")).toBeEnabled());
    expect(screen.getByLabelText("SOP title").props.value).toBe("Test procedure");
    expect(writes()).toHaveLength(0);
  });
  it("failed refresh labels retained templates and blocks saved actions without clearing revision", async () => {
    mockApi.mockResolvedValueOnce(list).mockRejectedValueOnce(new Error("Offline"));
    const screen = show(Library);
    await screen.findByLabelText("Revise SOP Daily check");
    fireEvent.press(screen.getByLabelText("Revise SOP Daily check"));
    fireEvent.changeText(screen.getByLabelText("SOP title"), "Revised draft");
    fireEvent.press(screen.getByLabelText("Refresh SOP library"));
    await screen.findByText("Offline");
    expect(screen.getByText(/Previously loaded templates/)).toBeTruthy();
    expect(screen.getByLabelText("SOP title").props.value).toBe("Revised draft");
    expect(screen.getByLabelText("Revise SOP Daily check")).toBeDisabled();
    expect(screen.getByLabelText("Retire SOP Daily check")).toBeDisabled();
    expect(screen.getByLabelText("Save SOP revision")).toBeDisabled();
  });
  it("single-flights save, locks competing controls, and reports confirmed save with failed refresh", async () => {
    const save = deferred();
    let written = false;
    mockApi.mockImplementation((_p: string, opts: any) => {
      if (opts?.method === "POST") {
        written = true;
        return save.promise;
      }
      return written
        ? Promise.reject(new Error("Refresh failed"))
        : Promise.resolve(list);
    });
    const screen = show(Library);
    await screen.findByLabelText("Revise SOP Daily check");
    draft(screen);
    fireEvent.press(screen.getByLabelText("Save facility SOP"));
    fireEvent.press(screen.getByLabelText("Save facility SOP"));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(screen.getByLabelText("Refresh SOP library")).toBeDisabled();
    expect(screen.getByLabelText("Retire SOP Daily check")).toBeDisabled();
    expect(screen.getByLabelText("Choose SOP document")).toBeDisabled();
    await act(async () => save.resolve({ created: { id: "saved" } }));
    await screen.findByText(
      "SOP saved, but the library could not refresh. Retry the read before another change."
    );
    expect(screen.getByLabelText("SOP title").props.value).toBe("");
  });
  it("refresh clears retirement confirmation and Cancel never writes", async () => {
    const screen = show(Library);
    await screen.findByLabelText("Retire SOP Daily check");
    fireEvent.press(screen.getByLabelText("Retire SOP Daily check"));
    fireEvent.press(screen.getByLabelText("Cancel retirement Daily check"));
    expect(writes()).toHaveLength(0);
    fireEvent.press(screen.getByLabelText("Retire SOP Daily check"));
    fireEvent.press(screen.getByLabelText("Refresh SOP library"));
    expect(screen.queryByLabelText("Confirm retire SOP Daily check")).toBeNull();
  });
  it("ignores delayed document picker after context switch", async () => {
    const picked = deferred();
    mockPicker.mockReturnValue(picked.promise);
    const screen = show(Library);
    await screen.findByLabelText("Revise SOP Daily check");
    fireEvent.press(screen.getByLabelText("Choose SOP document"));
    mockFacility = "facility-2";
    screen.rerender(<Library />);
    await act(async () =>
      picked.resolve({
        canceled: false,
        assets: [{ uri: "file:///qa.txt", name: "qa.txt" }]
      })
    );
    expect(screen.queryByText(/qa.txt/)).toBeNull();
    expect(mockUpload).not.toHaveBeenCalled();
  });
  it("does not save a template after an upload completes in an old session", async () => {
    const upload = deferred();
    mockUpload.mockReturnValue(upload.promise);
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///qa.txt", name: "qa.txt" }]
    });
    const screen = show(Library);
    await screen.findByLabelText("Revise SOP Daily check");
    fireEvent.press(screen.getByLabelText("Choose SOP document"));
    await screen.findByText("qa.txt · ready to upload");
    draft(screen);
    fireEvent.press(screen.getByLabelText("Save facility SOP"));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
    mockToken = "next-session";
    screen.rerender(<Library />);
    await act(async () =>
      upload.resolve({ assetId: "asset", url: "/qa.txt", filename: "qa.txt" })
    );
    expect(writes()).toHaveLength(0);
  });
  it("keeps viewer read-only", async () => {
    mockCan = false;
    mockRole = "VIEWER";
    const screen = show(Library);
    await screen.findByText("Daily check");
    expect(screen.queryByLabelText("Save facility SOP")).toBeNull();
    expect(screen.queryByLabelText("Retire SOP Daily check")).toBeNull();
    expect(screen.getByLabelText("Refresh SOP library")).toBeEnabled();
  });
  it("retirement is single-flight, blocks other operations and retains truthful success after refresh failure", async () => {
    const retire = deferred();
    let written = false;
    mockApi.mockImplementation((_path: string, opts: any) => {
      if (opts?.method === "DELETE") {
        written = true;
        return retire.promise;
      }
      return written ? Promise.reject(new Error("Offline")) : Promise.resolve(list);
    });
    const screen = show(Library);
    await screen.findByLabelText("Retire SOP Daily check");
    fireEvent.press(screen.getByLabelText("Retire SOP Daily check"));
    fireEvent.press(screen.getByLabelText("Confirm retire SOP Daily check"));
    fireEvent.press(screen.getByLabelText("Confirm retire SOP Daily check"));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(screen.getByLabelText("Refresh SOP library")).toBeDisabled();
    expect(screen.getByLabelText("Revise SOP Daily check")).toBeDisabled();
    await act(async () => retire.resolve({ retired: { isActive: false } }));
    await screen.findByText(
      "SOP retired, but the library could not refresh. Retry the read before another change."
    );
    expect(screen.queryByLabelText("Confirm retire SOP Daily check")).toBeNull();
  });
  it("preserves reviewed fields after a failed save", async () => {
    mockApi.mockImplementation((_path: string, opts: any) =>
      opts?.method === "POST"
        ? Promise.reject(new Error("Save failed"))
        : Promise.resolve(list)
    );
    const screen = show(Library);
    await screen.findByLabelText("Revise SOP Daily check");
    draft(screen);
    fireEvent.press(screen.getByLabelText("Save facility SOP"));
    await screen.findByText("Save failed");
    expect(screen.getByLabelText("SOP title").props.value).toBe("Test procedure");
    expect(
      screen.getByLabelText("Confirm SOP facility review").props.accessibilityState
        .checked
    ).toBe(true);
    expect(screen.getByLabelText("Save facility SOP")).toBeEnabled();
  });
  it("keeps an old late template response out of a new Facility", async () => {
    const old = deferred();
    const current = deferred();
    mockApi.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const screen = show(Library);
    fireEvent.changeText(screen.getByLabelText("SOP title"), "Old draft");
    mockFacility = "facility-2";
    screen.rerender(<Library />);
    await act(async () => old.resolve(list));
    expect(screen.queryByText("Daily check")).toBeNull();
    expect(screen.getByLabelText("SOP title").props.value).toBe("");
    await act(async () => current.resolve({ templates: [] }));
    await screen.findByText(/No active facility SOPs yet/);
  });
});
