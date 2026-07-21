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
  });

  test("bypasses browser caches when Journal reloads logs, ToolRuns, and tasks", async () => {
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
      params: { growId: "grow-1" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/tools", {
      method: "GET",
      cache: "no-store",
      params: { growId: "grow-1" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/personal/tasks", {
      method: "GET",
      cache: "no-store",
      params: { growId: "grow-1" }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/personal/grows/grow-1/timeline",
      { cache: "no-store" }
    );
  });
});
