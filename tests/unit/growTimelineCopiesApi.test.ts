import { apiRequest } from "@/api/apiRequest";
import {
  getCurrentGrowTimelineCopy,
  getPublicGrowTimelineCopy,
  previewGrowTimelineCopy,
  publishGrowTimelineCopy,
  withdrawGrowTimelineCopy
} from "@/api/growTimelineCopies";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));

const mockedRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

beforeEach(() => {
  mockedRequest.mockReset();
  mockedRequest.mockResolvedValue({ copy: { id: "copy-1" } } as any);
});

test("uses the correct Personal and Commercial owner routes", async () => {
  await getCurrentGrowTimelineCopy("personal", "grow 1");
  expect(mockedRequest).toHaveBeenLastCalledWith(
    "/api/personal/grows/grow%201/timeline/public-copy",
    expect.objectContaining({ method: "GET" })
  );

  await publishGrowTimelineCopy("commercial", "grow 1", {
    title: "Title",
    eventIds: ["event-1"],
    photoUrls: []
  });
  expect(mockedRequest).toHaveBeenLastCalledWith(
    "/api/commercial/grows/grow%201/timeline/public-copy",
    expect.objectContaining({ method: "POST" })
  );

  await previewGrowTimelineCopy("commercial", "grow 1", {
    title: "Title",
    eventIds: ["event-1"],
    photoUrls: []
  });
  expect(mockedRequest).toHaveBeenLastCalledWith(
    "/api/commercial/grows/grow%201/timeline/public-copy/preview",
    expect.objectContaining({ method: "POST" })
  );

  await withdrawGrowTimelineCopy("personal", "grow 1");
  expect(mockedRequest).toHaveBeenLastCalledWith(
    "/api/personal/grows/grow%201/timeline/public-copy",
    expect.objectContaining({ method: "DELETE" })
  );
});

test("loads the unguessable public viewer token through the optional-auth route", async () => {
  await getPublicGrowTimelineCopy("A".repeat(43));
  expect(mockedRequest).toHaveBeenCalledWith(
    `/api/public/grow-timelines/${"A".repeat(43)}`,
    { method: "GET", cache: "no-store" }
  );
});
