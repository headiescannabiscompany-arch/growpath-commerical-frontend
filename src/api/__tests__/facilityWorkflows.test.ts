import { createRoom, fetchRooms } from "../rooms";
import { createTask, getFacilityTasks } from "../tasks";
import {
  createFacilityTask,
  getFacilityTasks as getLegacyFacilityTasks,
  updateFacilityTask
} from "../facilityTasks";
import { apiRequest } from "../apiRequest";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("facility workflow API wrappers", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("fetches rooms through the canonical facility rooms endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      rooms: [{ id: "room-1", name: "Flower A", createdAt: "2026-06-22T00:00:00Z" }]
    });

    await expect(fetchRooms("facility-1")).resolves.toEqual([
      { id: "room-1", name: "Flower A", createdAt: "2026-06-22T00:00:00Z" }
    ]);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/facility/facility-1/rooms");
  });

  it("creates rooms with name, room type, and tracking mode", async () => {
    mockApiRequest.mockResolvedValueOnce({
      room: {
        id: "room-1",
        name: "Flower A",
        roomType: "flower",
        trackingMode: "batch"
      }
    });

    await expect(
      createRoom("facility-1", {
        name: "Flower A",
        roomType: "flower",
        trackingMode: "batch"
      })
    ).resolves.toEqual({
      id: "room-1",
      name: "Flower A",
      roomType: "flower",
      trackingMode: "batch"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/facility/facility-1/rooms", {
      method: "POST",
      body: {
        name: "Flower A",
        roomType: "flower",
        trackingMode: "batch"
      }
    });
  });

  it("fetches and creates facility tasks through the canonical task endpoint", async () => {
    mockApiRequest
      .mockResolvedValueOnce({ tasks: [{ id: "task-1", title: "Scout room" }] })
      .mockResolvedValueOnce({
        task: {
          id: "task-2",
          title: "Water plants",
          notes: "Check dryback first",
          scope: "facility"
        }
      });

    await expect(getFacilityTasks("facility-1")).resolves.toEqual([
      { _id: "task-1", id: "task-1", title: "Scout room" }
    ]);

    await expect(
      createTask("facility-1", {
        title: "Water plants",
        notes: "Check dryback first",
        dueDate: "2026-06-23",
        scope: "facility"
      })
    ).resolves.toEqual({
      _id: "task-2",
      id: "task-2",
      title: "Water plants",
      notes: "Check dryback first",
      scope: "facility"
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/facility/facility-1/tasks", {
      method: "GET"
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/facility/facility-1/tasks", {
      method: "POST",
      body: {
        title: "Water plants",
        notes: "Check dryback first",
        dueDate: "2026-06-23",
        scope: "facility"
      }
    });
  });

  it("normalizes legacy facility task envelopes and completes tasks", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        tasks: [{ _id: "task-1", title: "Scout room", status: "OPEN" }]
      })
      .mockResolvedValueOnce({
        created: { _id: "task-2", title: "Clean tray", status: "OPEN" }
      })
      .mockResolvedValueOnce({
        task: { _id: "task-1", title: "Scout room", status: "DONE" }
      });

    await expect(getLegacyFacilityTasks("facility-1")).resolves.toEqual([
      expect.objectContaining({ id: "task-1", status: "open" })
    ]);

    await expect(
      createFacilityTask("facility-1", { title: "Clean tray" })
    ).resolves.toEqual(expect.objectContaining({ id: "task-2", status: "open" }));

    await expect(
      updateFacilityTask("facility-1", "task-1", {
        status: "done",
        completed: true
      } as any)
    ).resolves.toEqual(expect.objectContaining({ id: "task-1", status: "done" }));

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/facilities/facility-1/tasks");
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/facilities/facility-1/tasks",
      {
        method: "POST",
        body: { title: "Clean tray" }
      }
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/api/facilities/facility-1/tasks/task-1",
      {
        method: "PATCH",
        body: { status: "done", completed: true }
      }
    );
  });
});
