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

const liveTestPacks = require("../../../tests/fixtures/growpath-live-test-packs.json");

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

function livePack(accountType: string) {
  const pack = liveTestPacks.packs.find((item: any) => item.accountType === accountType);
  if (!pack) throw new Error(`Missing ${accountType} live test pack`);
  return pack;
}

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

  it("runs MAC1 facility live pack through room and task workflow calls", async () => {
    const pack = livePack("facility");
    const weekZero = pack.weeklyLogs.find((log: any) => log.week === 0);
    const weekTwo = pack.weeklyLogs.find((log: any) => log.week === 2);
    const weekEleven = pack.weeklyLogs.find((log: any) => log.week === 11);
    const weekFifteen = pack.weeklyLogs.find((log: any) => log.week === 15);

    mockApiRequest
      .mockResolvedValueOnce({
        room: {
          id: "room-clone",
          name: "Clone/Veg Room",
          roomType: "clone_veg",
          trackingMode: "batch"
        }
      })
      .mockResolvedValueOnce({
        room: {
          id: "room-flower",
          name: "Flower Room",
          roomType: "flower",
          trackingMode: "batch"
        }
      })
      .mockResolvedValueOnce({
        room: {
          id: "room-dry-cure",
          name: "Dry/Cure Room",
          roomType: "dry_cure",
          trackingMode: "batch"
        }
      })
      .mockResolvedValueOnce({
        task: {
          id: "task-clone",
          title: "Clone intake - MAC1 8 Clone Batch",
          status: "OPEN"
        }
      })
      .mockResolvedValueOnce({
        task: {
          id: "task-reservoir",
          title: "Review MAC1 reservoir slime concern",
          status: "OPEN"
        }
      })
      .mockResolvedValueOnce({
        task: {
          id: "task-runoff",
          title: "Correct MAC1 runoff EC/TDS",
          status: "OPEN"
        }
      })
      .mockResolvedValueOnce({
        task: {
          id: "task-harvest",
          title: "MAC1 harvest crew workflow",
          status: "OPEN"
        }
      })
      .mockResolvedValueOnce({
        task: {
          id: "task-reset",
          title: "MAC1 room reset",
          status: "OPEN"
        }
      });

    await createRoom("facility-1", {
      name: pack.facility.rooms[0],
      roomType: "clone_veg",
      trackingMode: "batch"
    });
    await createRoom("facility-1", {
      name: pack.facility.rooms[1],
      roomType: "flower",
      trackingMode: "batch"
    });
    await createRoom("facility-1", {
      name: pack.facility.rooms[2],
      roomType: "dry_cure",
      trackingMode: "batch"
    });

    await createTask("facility-1", {
      title: "Clone intake - MAC1 8 Clone Batch",
      notes: weekZero.cloneSelectionNotes,
      scope: "facility",
      roomName: "Clone/Veg Room",
      batchName: pack.workflow.batch,
      sourceType: "live_test_pack",
      sourceObjectId: pack.id
    } as any);
    await createTask("facility-1", {
      title: "Review MAC1 reservoir slime concern",
      notes: `${weekTwo.reservoirConcerns[0].notes}; ${weekTwo.productChanges[0].notes}`,
      scope: "facility",
      roomName: "Flower Room",
      batchName: pack.workflow.batch,
      sourceType: "live_test_pack",
      sourceObjectId: pack.id
    } as any);
    await createTask("facility-1", {
      title: "Correct MAC1 runoff EC/TDS",
      notes: weekEleven.runoffCorrection.note,
      scope: "facility",
      roomName: "Flower Room",
      batchName: pack.workflow.batch,
      sourceType: "live_test_pack",
      sourceObjectId: pack.id
    } as any);
    await createTask("facility-1", {
      title: "MAC1 harvest crew workflow",
      notes: `${weekFifteen.harvestWindow.note}; dry ${weekFifteen.dryRoom.note}; cure ${weekFifteen.cureContainer}`,
      scope: "facility",
      roomName: "Dry/Cure Room",
      batchName: pack.workflow.batch,
      sourceType: "live_test_pack",
      sourceObjectId: pack.id
    } as any);
    await createTask("facility-1", {
      title: "MAC1 room reset",
      notes:
        "Reset room after harvest/dry/cure workflow and document harvest quality notes privately.",
      scope: "facility",
      roomName: "Room Reset",
      batchName: pack.workflow.batch,
      sourceType: "live_test_pack",
      sourceObjectId: pack.id
    } as any);

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, "/api/facility/facility-1/rooms", {
      method: "POST",
      body: {
        name: "Clone/Veg Room",
        roomType: "clone_veg",
        trackingMode: "batch"
      }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, "/api/facility/facility-1/rooms", {
      method: "POST",
      body: {
        name: "Flower Room",
        roomType: "flower",
        trackingMode: "batch"
      }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, "/api/facility/facility-1/rooms", {
      method: "POST",
      body: {
        name: "Dry/Cure Room",
        roomType: "dry_cure",
        trackingMode: "batch"
      }
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "/api/facility/facility-1/tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          title: "Clone intake - MAC1 8 Clone Batch",
          roomName: "Clone/Veg Room",
          batchName: "MAC1 8 Clone Batch",
          sourceObjectId: pack.id
        })
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      5,
      "/api/facility/facility-1/tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          title: "Review MAC1 reservoir slime concern",
          notes: expect.stringContaining("Reservoir slime concern")
        })
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      6,
      "/api/facility/facility-1/tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          title: "Correct MAC1 runoff EC/TDS",
          notes: "Runoff flushed from over 2000 ppm toward 1500 ppm."
        })
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      7,
      "/api/facility/facility-1/tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          title: "MAC1 harvest crew workflow",
          notes: expect.stringContaining("Harvest from 4 a.m. to 9:45 a.m.")
        })
      })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      8,
      "/api/facility/facility-1/tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({
          title: "MAC1 room reset",
          roomName: "Room Reset"
        })
      })
    );
  });
});
