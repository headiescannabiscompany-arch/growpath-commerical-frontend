import { apiRequest } from "@/api/apiRequest";
import { getPersonalGrowTimeline, listPersonalGrows } from "@/api/grows";
import { listPersonalLogs } from "@/api/logs";
import { listPersonalPlants } from "@/api/plants";
import { listPersonalTasks } from "@/api/tasks";
import { listToolRuns } from "@/api/toolRuns";
import {
  getWorkspaceGrowTimeline,
  listWorkspaceGrows,
  listWorkspaceLogs,
  listWorkspacePlants,
  listWorkspaceTasks
} from "@/features/grows/workspaceData";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
const request = apiRequest as jest.MockedFunction<typeof apiRequest>;
const timestamp = "2026-10-09T14:00:00.000Z";

type Reader = {
  name: string;
  read: (strict?: boolean) => Promise<unknown>;
  wrap: (rows: unknown) => unknown;
  row: Record<string, unknown>;
};

const personalReaders: Reader[] = [
  {
    name: "grows",
    read: (strict) => listPersonalGrows({ throwOnError: strict, verifyRecords: strict }),
    wrap: (rows) => ({ grows: rows }),
    row: { id: "grow-1", name: "Saved grow" }
  },
  {
    name: "logs",
    read: (strict) =>
      listPersonalLogs({ growId: "grow-1", throwOnError: strict, verifyRecords: strict }),
    wrap: (rows) => ({ logs: rows }),
    row: {
      id: "log-1",
      growId: "grow-1",
      title: "Saved note",
      notes: "Watered",
      date: "2026-10-09"
    }
  },
  {
    name: "plants",
    read: (strict) =>
      listPersonalPlants({
        growId: "grow-1",
        throwOnError: strict,
        verifyRecords: strict
      }),
    wrap: (rows) => ({ plants: rows }),
    row: { id: "plant-1", growId: "grow-1", name: "Basil" }
  },
  {
    name: "tasks",
    read: (strict) =>
      listPersonalTasks({
        growId: "grow-1",
        throwOnError: strict,
        verifyRecords: strict
      }),
    wrap: (rows) => ({ tasks: rows }),
    row: { id: "task-1", growId: "grow-1", title: "Check leaves", completed: false }
  },
  {
    name: "timeline",
    read: (strict) =>
      getPersonalGrowTimeline("grow-1", { throwOnError: strict, verifyRecords: strict }),
    wrap: (rows) => ({ timeline: rows }),
    row: {
      id: "event-1",
      growId: "grow-1",
      type: "grow_log",
      sourceModel: "GrowLog",
      sourceId: "log-1",
      title: "Saved note",
      timestamp
    }
  }
];

const commercialReaders: Reader[] = [
  {
    name: "grows",
    read: (strict) =>
      listWorkspaceGrows("commercial", { throwOnError: strict, verifyRecords: strict }),
    wrap: (rows) => ({ grows: rows }),
    row: { _id: "grow-1", name: "Saved grow" }
  },
  {
    name: "logs",
    read: (strict) =>
      listWorkspaceLogs("commercial", "grow-1", {
        throwOnError: strict,
        verifyRecords: strict
      }),
    wrap: (rows) => ({ logs: rows }),
    row: { id: "log-1", growId: "grow-1", title: "Saved note" }
  },
  {
    name: "plants",
    read: (strict) =>
      listWorkspacePlants("commercial", "grow-1", {
        throwOnError: strict,
        verifyRecords: strict
      }),
    wrap: (rows) => ({ plants: rows }),
    row: { id: "plant-1", growId: "grow-1", name: "Basil" }
  },
  {
    name: "tasks",
    read: (strict) =>
      listWorkspaceTasks("commercial", "grow-1", {
        throwOnError: strict,
        verifyRecords: strict
      }),
    wrap: (rows) => ({ tasks: rows }),
    row: { id: "task-1", growId: "grow-1", title: "Check leaves", status: "OPEN" }
  }
];

beforeEach(() => {
  request.mockReset();
  jest.spyOn(Date, "now").mockReturnValue(1791554400000);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe.each(personalReaders)("strict Personal $name reader", ({ read, wrap, row }) => {
  it("propagates transport failures only when opted in", async () => {
    const failure = new Error("temporarily unavailable");
    request.mockRejectedValue(failure);
    await expect(read(true)).rejects.toBe(failure);
    await expect(read()).resolves.toEqual([]);
  });

  it("distinguishes confirmed empty and populated collections from unavailable data", async () => {
    request.mockResolvedValueOnce(wrap([])).mockResolvedValueOnce(wrap([row]));
    await expect(read(true)).resolves.toEqual([]);
    await expect(read(true)).resolves.toEqual([row]);
    expect(
      request.mock.calls.every(
        ([, options]) => !options?.method || options.method === "GET"
      )
    ).toBe(true);
  });

  it.each([null, undefined, {}, "unavailable"])(
    "rejects malformed envelope %p in strict mode and preserves legacy empty fallback",
    async (envelope) => {
      request.mockResolvedValue(envelope);
      await expect(read(true)).rejects.toThrow(/could not be verified/);
      await expect(read()).resolves.toEqual([]);
    }
  );

  it("rejects explicit top-level or nested failure envelopes even with an empty collection", async () => {
    for (const response of [
      { ...(wrap([]) as object), success: false },
      { ...(wrap([]) as object), ok: false },
      { ...(wrap([]) as object), error: "private provider detail" },
      { ...(wrap([]) as object), data: { ok: false } }
    ]) {
      request.mockResolvedValueOnce(response);
      await expect(read(true)).rejects.toThrow(/could not be verified/);
    }
  });

  it.each([null, {}, "unavailable", 3])(
    "rejects a non-array required collection %p",
    async (rows) => {
      request.mockResolvedValueOnce(wrap(rows));
      await expect(read(true)).rejects.toThrow(/could not be verified/);
    }
  );

  it("rejects malformed entries and duplicate or conflicting identities without silently dropping records", async () => {
    for (const rows of [
      [null],
      [5],
      [[]],
      [{}],
      [{ ...row, id: "" }],
      [{ ...row, id: {} }],
      [{ ...row, _id: "different-record" }],
      [row, row]
    ]) {
      request.mockResolvedValueOnce(wrap(rows));
      await expect(read(true)).rejects.toThrow(/could not be verified/);
    }
  });
});

describe("Personal supported envelopes and legacy behavior", () => {
  it("keeps the preexisting grow-management throwOnError request and payload contract", async () => {
    const legacyGrow = { _id: "grow-archived", name: "Saved archived grow" };
    request
      .mockResolvedValueOnce({ grows: [legacyGrow] })
      .mockResolvedValueOnce({ unexpected: true });
    await expect(
      listPersonalGrows({ archived: true, throwOnError: true })
    ).resolves.toEqual([legacyGrow]);
    expect(request).toHaveBeenNthCalledWith(1, "/api/personal/grows", {
      params: { archived: "true" }
    });
    await expect(listPersonalGrows({ throwOnError: true })).rejects.toThrow(
      "Could not read your grow list. Try again."
    );
  });

  it("keeps task throwOnError transport-only and reserves malformed-record rejection for export verification", async () => {
    request.mockResolvedValue({ data: { tasks: { unavailable: true } } });
    await expect(
      listPersonalTasks({ growId: "grow-1", throwOnError: true })
    ).resolves.toEqual({ unavailable: true });
    expect(request).toHaveBeenLastCalledWith("/api/personal/tasks", {
      method: "GET",
      cache: "no-store",
      params: { growId: "grow-1", _fresh: "1791554400000" }
    });
    await expect(
      listPersonalTasks({ growId: "grow-1", throwOnError: true, verifyRecords: true })
    ).rejects.toThrow(/could not be verified/);
    request.mockResolvedValue({});
    await expect(listPersonalTasks({ throwOnError: true })).resolves.toEqual([]);
  });

  it("makes verifyRecords fail closed even when throwOnError is not separately supplied", async () => {
    request.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    await expect(listPersonalLogs({ verifyRecords: true })).rejects.toThrow(
      /could not be verified/
    );
    await expect(listPersonalTasks({ verifyRecords: true })).rejects.toThrow(
      /could not be verified/
    );
    const failure = new Error("unavailable");
    request.mockRejectedValueOnce(failure);
    await expect(listPersonalPlants({ verifyRecords: true })).rejects.toBe(failure);
  });

  it("retains supported nested and alias collections", async () => {
    request
      .mockResolvedValueOnce({ data: { grows: [{ _id: "grow-1" }] } })
      .mockResolvedValueOnce({ data: { logs: [{ _id: "log-1" }] } })
      .mockResolvedValueOnce({ items: [{ _id: "log-2" }] })
      .mockResolvedValueOnce({ data: { plants: [{ _id: "plant-1" }] } })
      .mockResolvedValueOnce({ data: { items: [{ _id: "plant-2" }] } })
      .mockResolvedValueOnce({ data: { tasks: [{ _id: "task-1" }] } })
      .mockResolvedValueOnce({ items: [{ _id: "task-2" }] })
      .mockResolvedValueOnce({ events: [{ _id: "event-1", timestamp }] })
      .mockResolvedValueOnce({ items: [{ _id: "event-2", timestamp }] })
      .mockResolvedValueOnce({ data: { timeline: [{ _id: "event-3", timestamp }] } });
    await expect(
      listPersonalGrows({ throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "grow-1", id: "grow-1" }]);
    await expect(
      listPersonalLogs({ throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "log-1" }]);
    await expect(
      listPersonalLogs({ throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "log-2" }]);
    await expect(
      listPersonalPlants({ throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "plant-1" }]);
    await expect(
      listPersonalPlants({ throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "plant-2" }]);
    await expect(
      listPersonalTasks({ throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "task-1" }]);
    await expect(
      listPersonalTasks({ throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "task-2" }]);
    await expect(
      getPersonalGrowTimeline("grow-1", { throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "event-1", timestamp }]);
    await expect(
      getPersonalGrowTimeline("grow-1", { throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "event-2", timestamp }]);
    await expect(
      getPersonalGrowTimeline("grow-1", { throwOnError: true, verifyRecords: true })
    ).resolves.toEqual([{ _id: "event-3", timestamp }]);
  });

  it("does not mistake the legacy nested task cast for a verified collection", async () => {
    request.mockResolvedValue({ data: { tasks: { unavailable: true } } });
    await expect(listPersonalTasks()).resolves.toEqual({ unavailable: true });
    await expect(
      listPersonalTasks({ throwOnError: true, verifyRecords: true })
    ).rejects.toThrow(/could not be verified/);
  });

  it("does not skip a malformed preferred collection for a lower-priority empty alias", async () => {
    request.mockResolvedValue({ data: { logs: null }, logs: [] });
    await expect(listPersonalLogs()).resolves.toEqual([]);
    await expect(
      listPersonalLogs({ throwOnError: true, verifyRecords: true })
    ).rejects.toThrow(/could not be verified/);
    request.mockResolvedValue({ grows: "invalid", data: { grows: [] } });
    await expect(listPersonalGrows()).resolves.toEqual([]);
    await expect(
      listPersonalGrows({ throwOnError: true, verifyRecords: true })
    ).rejects.toThrow(/could not be verified/);
  });

  it("does not fabricate dates or stringify malformed readable fields in strict data", async () => {
    request.mockResolvedValueOnce({
      timeline: [{ id: "event-1", timestamp: "not-a-date" }]
    });
    await expect(
      getPersonalGrowTimeline("grow-1", { throwOnError: true, verifyRecords: true })
    ).rejects.toThrow(/could not be verified/);
    request.mockResolvedValueOnce({ logs: [{ id: "log-1", notes: { raw: "payload" } }] });
    await expect(
      listPersonalLogs({ throwOnError: true, verifyRecords: true })
    ).rejects.toThrow(/could not be verified/);
    await expect(
      getPersonalGrowTimeline("", { throwOnError: true, verifyRecords: true })
    ).rejects.toThrow(/Choose a grow/);
    await expect(getPersonalGrowTimeline("")).resolves.toEqual([]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("bypasses caches only for opt-in grow/plant reads and never sends the strict flag to the server", async () => {
    request.mockResolvedValue({ grows: [], plants: [] });
    await listPersonalGrows({ archived: true, throwOnError: true, verifyRecords: true });
    await listPersonalGrows({ archived: true });
    await listPersonalPlants({
      growId: "grow-1",
      throwOnError: true,
      verifyRecords: true
    });
    await listPersonalPlants({ growId: "grow-1" });
    expect(request).toHaveBeenNthCalledWith(1, "/api/personal/grows", {
      cache: "no-store",
      params: { archived: "true", _fresh: "1791554400000" }
    });
    expect(request).toHaveBeenNthCalledWith(2, "/api/personal/grows", {
      params: { archived: "true" }
    });
    expect(request).toHaveBeenNthCalledWith(3, "/api/personal/plants", {
      method: "GET",
      cache: "no-store",
      params: { growId: "grow-1", _fresh: "1791554400000" }
    });
    expect(request).toHaveBeenNthCalledWith(4, "/api/personal/plants", {
      method: "GET",
      params: { growId: "grow-1" }
    });
    expect(
      request.mock.calls.some(([, options]) => "throwOnError" in (options?.params || {}))
    ).toBe(false);
  });
});

describe.each(commercialReaders)(
  "strict Commercial $name reader",
  ({ read, wrap, row }) => {
    it("preserves successful normalization and real empty lists", async () => {
      request.mockResolvedValueOnce(wrap([row])).mockResolvedValueOnce(wrap([]));
      await expect(read(true)).resolves.toEqual([expect.objectContaining(row)]);
      await expect(read(true)).resolves.toEqual([]);
    });

    it("rejects malformed envelopes only when opted in", async () => {
      request.mockResolvedValue({});
      await expect(read(true)).rejects.toThrow(/could not be verified/);
      await expect(read()).resolves.toEqual([]);
    });

    it("rejects failed envelopes and malformed or duplicate rows without manufacturing IDs", async () => {
      for (const response of [
        { ...(wrap([]) as object), success: false },
        { ...(wrap([]) as object), data: { error: "failed" } },
        wrap([null]),
        wrap([{}]),
        wrap([[row]]),
        wrap([row, row]),
        wrap([{ ...row, id: 1 }]),
        wrap([{ ...row, title: {} }])
      ]) {
        request.mockResolvedValueOnce(response);
        await expect(read(true)).rejects.toThrow(/could not be verified/);
      }
    });

    it("continues propagating Commercial transport failures in both modes", async () => {
      const failure = new Error("unavailable");
      request.mockRejectedValue(failure);
      await expect(read(true)).rejects.toBe(failure);
      await expect(read()).rejects.toBe(failure);
    });
  }
);

describe("strict workspace forwarding and aggregate readiness", () => {
  it("forwards explicit Personal archived recovery with export verification and normalized identity", async () => {
    request.mockResolvedValueOnce({
      grows: [{ _id: "archived-grow", status: "archived" }]
    });
    await expect(
      listWorkspaceGrows("personal", {
        archived: true,
        throwOnError: true,
        verifyRecords: true
      })
    ).resolves.toEqual([
      { _id: "archived-grow", id: "archived-grow", status: "archived" }
    ]);
    expect(request).toHaveBeenCalledWith("/api/personal/grows", {
      cache: "no-store",
      params: { archived: "true", _fresh: "1791554400000" }
    });
    expect(request.mock.calls.some(([path]) => path.includes("commercial"))).toBe(false);
  });

  it("preserves existing Commercial throwOnError-only normalization", async () => {
    request.mockResolvedValue({});
    await expect(
      listWorkspaceGrows("commercial", { throwOnError: true })
    ).resolves.toEqual([]);
    await expect(
      listWorkspaceTasks("commercial", "grow-1", { throwOnError: true })
    ).resolves.toEqual([]);
  });

  const personalWorkspaceReaders = [
    () => listWorkspaceGrows("personal", { throwOnError: true, verifyRecords: true }),
    () =>
      listWorkspaceLogs("personal", "grow-1", {
        throwOnError: true,
        verifyRecords: true
      }),
    () =>
      listWorkspacePlants("personal", "grow-1", {
        throwOnError: true,
        verifyRecords: true
      }),
    () =>
      listWorkspaceTasks("personal", "grow-1", {
        throwOnError: true,
        verifyRecords: true
      }),
    () =>
      getWorkspaceGrowTimeline("personal", "grow-1", {
        throwOnError: true,
        verifyRecords: true
      })
  ];

  it.each(personalWorkspaceReaders)(
    "forwards strict failure through Personal wrapper %#",
    async (read) => {
      request.mockResolvedValue({});
      await expect(read()).rejects.toThrow(/could not be verified/);
      expect(request.mock.calls[0][0]).toMatch(/^\/api\/personal\//);
    }
  );

  it("retains accepted Commercial envelope aliases", async () => {
    for (const envelope of [
      { data: { commercialGrows: [{ id: "grow-1" }] } },
      { items: [{ id: "grow-1" }] },
      { data: { items: [{ id: "grow-1" }] } },
      { data: [{ id: "grow-1" }] },
      [{ id: "grow-1" }]
    ]) {
      request.mockResolvedValueOnce(envelope);
      await expect(
        listWorkspaceGrows("commercial", { throwOnError: true, verifyRecords: true })
      ).resolves.toEqual([expect.objectContaining({ id: "grow-1" })]);
    }
  });

  it.each(["logs", "plants", "tasks", "tools"])(
    "rejects the whole Commercial timeline when required %s cannot be verified",
    async (family) => {
      request.mockImplementation(async (path) => {
        if (path === "/api/tools") return family === "tools" ? {} : { items: [] };
        const key = path.split("/").pop()!;
        return key === family ? {} : { [key]: [] };
      });
      await expect(
        getWorkspaceGrowTimeline("commercial", "grow-1", {
          throwOnError: true,
          verifyRecords: true
        })
      ).rejects.toThrow(/could not be verified/);
      expect(request).toHaveBeenCalledTimes(4);
      expect(request.mock.calls.every(([, options]) => options?.method === "GET")).toBe(
        true
      );
    }
  );

  it("accepts a genuinely empty Commercial aggregate without other-scope fallback", async () => {
    request.mockImplementation(async (path) =>
      path === "/api/tools" ? { items: [] } : { [path.split("/").pop()!]: [] }
    );
    await expect(
      getWorkspaceGrowTimeline("commercial", "grow-1", {
        throwOnError: true,
        verifyRecords: true
      })
    ).resolves.toEqual([]);
    expect(request).toHaveBeenCalledWith(
      "/api/tools",
      expect.objectContaining({
        params: expect.objectContaining({ growId: "grow-1", workspaceType: "commercial" })
      })
    );
    expect(request.mock.calls.some(([path]) => path.startsWith("/api/personal/"))).toBe(
      false
    );
  });

  it("reuses the already-strict ToolRun reader without a relaxed export-only fallback", async () => {
    request.mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: null });
    await expect(listToolRuns({ workspaceType: "personal" })).resolves.toEqual([]);
    await expect(listToolRuns({ workspaceType: "personal" })).rejects.toThrow(
      /could not be verified/
    );
    const failure = new Error("offline");
    request.mockRejectedValueOnce(failure);
    await expect(
      listToolRuns({ growId: "grow-1", workspaceType: "commercial" })
    ).rejects.toBe(failure);
  });
});
