import { apiRequest } from "../apiRequest";
import { appendGrowPhotos } from "../grows";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("grow photo API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  test("appends persisted photo URLs to a grow", async () => {
    mockApiRequest.mockResolvedValueOnce({
      grow: {
        id: "grow-1",
        photos: ["/uploads/photo-1.jpg"]
      }
    });

    const grow = await appendGrowPhotos("grow-1", ["/uploads/photo-1.jpg"]);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/grows/grow-1/photos", {
      method: "PATCH",
      body: { photos: ["/uploads/photo-1.jpg"] }
    });
    expect(grow?.photos).toEqual(["/uploads/photo-1.jpg"]);
  });

  test("skips empty grow id or photo lists", async () => {
    await expect(appendGrowPhotos("", ["/uploads/photo-1.jpg"])).resolves.toBeNull();
    await expect(appendGrowPhotos("grow-1", [])).resolves.toBeNull();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
