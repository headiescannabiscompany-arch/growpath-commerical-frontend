const mockPersistImageUri = jest.fn();

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args)
}));

describe("plants API photo uploads", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPersistImageUri.mockResolvedValue("/uploads/plant.jpg");
  });

  it("persists plant photo files through the durable image upload helper", async () => {
    const { uploadPlantPhoto } = require("@/api/plants");

    const result = await uploadPlantPhoto({
      uri: "file:///tmp/plant.jpg",
      type: "image/jpeg",
      name: "plant.jpg"
    });

    expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/plant.jpg");
    expect(result).toEqual({ url: "/uploads/plant.jpg" });
  });

  it("accepts direct uri input for legacy callers", async () => {
    const { uploadPlantPhoto } = require("@/api/plants");

    await uploadPlantPhoto("file:///tmp/direct.jpg");

    expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/direct.jpg");
  });
});
