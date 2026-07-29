import { apiRequest } from "../apiRequest";
import { getPersonalGrowTimeline } from "../grows";
import { listPersonalLogs } from "../logs";
import { listPersonalTasks } from "../tasks";
import { listToolRuns } from "../toolRuns";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("personal persisted-record freshness", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    jest.spyOn(Date, "now").mockReturnValue(1721433600123);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("bypasses browser and intermediary caches when persisted records reload", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ logs: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ tasks: [] })
      .mockResolvedValueOnce({ timeline: [] });

    await listPersonalLogs({ growId: "grow-1" });
    await listToolRuns({ growId: "grow-1" });
    await listPersonalTasks({ growId: "grow-1" });
    await getPersonalGrowTimeline("grow-1");

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/personal/logs", {
      cache: "no-store",
      params: { growId: "grow-1", _fresh: "1721433600123" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/tools", {
      method: "GET",
      cache: "no-store",
      params: { growId: "grow-1", _fresh: "1721433600123" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/personal/tasks", {
      method: "GET",
      cache: "no-store",
      params: { growId: "grow-1", _fresh: "1721433600123" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/personal/grows/grow-1/timeline",
      { cache: "no-store", params: { _fresh: "1721433600123" } }
    );
  });

  test("changes the request URL key for a later reload", async () => {
    mockApiRequest.mockResolvedValue({ logs: [] });

    await listPersonalLogs({ growId: "grow-1" });
    (Date.now as jest.Mock).mockReturnValue(1721433601123);
    await listPersonalLogs({ growId: "grow-1" });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/personal/logs", {
      cache: "no-store",
      params: { growId: "grow-1", _fresh: "1721433600123" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/personal/logs", {
      cache: "no-store",
      params: { growId: "grow-1", _fresh: "1721433601123" }
    });
  });
});
