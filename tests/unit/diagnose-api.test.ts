const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();
const mockAttachPhotos = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args)
}));

jest.mock("@/utils/growPhotoAttachment", () => ({
  maybePromptAttachPhotosToGrow: (...args: any[]) => mockAttachPhotos(...args)
}));

const { diagnoseImage, diagnosePhoto } = require("@/api/diagnose");

function formValue(form: any, key: string) {
  if (typeof form?.get === "function") return form.get(key);
  const pair = form?._parts?.find?.((part: any[]) => part[0] === key);
  return pair?.[1];
}

describe("diagnosis photo uploads", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApiRequest.mockResolvedValue({ success: true, diagnosis: { photos: [] } });
    mockPersistImageUri.mockResolvedValue("/uploads/diagnosis.jpg");
    mockAttachPhotos.mockResolvedValue({ prompted: true, attached: false });
  });

  it("pre-uploads image diagnosis photos and sends the durable URL", async () => {
    await diagnoseImage("file:///tmp/leaf.jpg", {
      context: { stage: "flower" }
    });

    expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/leaf.jpg");
    const [, request] = mockApiRequest.mock.calls[0];
    expect(mockApiRequest.mock.calls[0][0]).toBe("/api/diagnose");
    expect(request.method).toBe("POST");
    expect(formValue(request.body, "photoUrl")).toBe("/uploads/diagnosis.jpg");
    expect(JSON.parse(formValue(request.body, "context")).photoUrl).toBe(
      "/uploads/diagnosis.jpg"
    );
    expect(mockAttachPhotos).toHaveBeenCalledWith(["/uploads/diagnosis.jpg"], {
      skip: false
    });
  });

  it("skips outside-grow attachment prompt when diagnosis has grow context", async () => {
    await diagnoseImage("file:///tmp/leaf.jpg", {
      growId: "grow-1",
      context: { stage: "veg" }
    });

    expect(mockAttachPhotos).toHaveBeenCalledWith(["/uploads/diagnosis.jpg"], {
      skip: true
    });
  });

  it("still returns the diagnosis result if optional attachment fails", async () => {
    mockAttachPhotos.mockRejectedValueOnce(new Error("attach failed"));
    mockApiRequest.mockResolvedValueOnce({ success: true, id: "diagnosis-1" });

    await expect(diagnosePhoto("file:///tmp/leaf.jpg")).resolves.toEqual({
      success: true,
      id: "diagnosis-1"
    });
  });
});
