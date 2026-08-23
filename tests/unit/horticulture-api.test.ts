import { apiRequest } from "@/api/apiRequest";
import {
  addHorticultureCareEvent,
  archiveHorticultureRecord,
  createHorticultureRecord,
  evaluateHorticultureFulfillment,
  horticultureBase,
  listHorticultureRecords
} from "@/api/horticulture";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));

const request = apiRequest as jest.Mock;
const record: any = { _id: "record-1", __v: 4 };

beforeEach(() => request.mockReset());

test("builds only canonical Commercial and selected Facility horticulture roots", () => {
  expect(horticultureBase({ workspaceType: "commercial" })).toBe("/api/horticulture");
  expect(horticultureBase({ workspaceType: "facility", facilityId: "facility a" })).toBe(
    "/api/facility/facility%20a/horticulture"
  );
});

test("lists, creates, appends care, evaluates, and archives through version-fenced routes", async () => {
  request
    .mockResolvedValueOnce({ records: [record] })
    .mockResolvedValueOnce({ record })
    .mockResolvedValueOnce({ record })
    .mockResolvedValueOnce({ record })
    .mockResolvedValueOnce({ record });
  const workspace = { workspaceType: "commercial" } as const;
  expect(await listHorticultureRecords(workspace)).toEqual([record]);
  await createHorticultureRecord(workspace, { title: "Tomatoes" } as any);
  await addHorticultureCareEvent(workspace, record, {
    eventType: "inspection",
    occurredAt: "2026-08-22T12:00:00.000Z",
    notes: "Reviewed"
  });
  await evaluateHorticultureFulfillment(workspace, record);
  await archiveHorticultureRecord(workspace, record);
  expect(request).toHaveBeenNthCalledWith(2, "/api/horticulture", {
    method: "POST",
    body: { title: "Tomatoes" }
  });
  expect(request).toHaveBeenNthCalledWith(
    3,
    "/api/horticulture/record-1/care-events",
    expect.objectContaining({ body: expect.objectContaining({ version: 4 }) })
  );
  expect(request).toHaveBeenNthCalledWith(
    4,
    "/api/horticulture/record-1/evaluate-fulfillment",
    { method: "POST", body: { version: 4 } }
  );
  expect(request).toHaveBeenNthCalledWith(5, "/api/horticulture/record-1/archive", {
    method: "POST",
    body: { version: 4 }
  });
});
