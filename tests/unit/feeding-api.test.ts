const mockApiRequest = jest.fn();
const mockPersistImageUri = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: (...args: any[]) => mockPersistImageUri(...args)
}));

function formValue(form: any, key: string) {
  if (typeof form?.get === "function") return form.get(key);
  const pair = form?._parts?.find?.((part: any[]) => part[0] === key);
  return pair?.[1];
}

describe("feeding API label uploads", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPersistImageUri.mockResolvedValue("/uploads/label.jpg");
    mockApiRequest.mockResolvedValue({ success: true, nutrientData: { n: 3 } });
  });

  it("persists label photos while still sending image bytes for extraction", async () => {
    const { uploadLabel } = require("@/api/feeding");

    const result = await uploadLabel("file:///tmp/label.jpg");

    expect(mockPersistImageUri).toHaveBeenCalledWith("file:///tmp/label.jpg");
    const [, request] = mockApiRequest.mock.calls[0];
    expect(mockApiRequest.mock.calls[0][0]).toBe("/api/feeding/label");
    expect(request.method).toBe("POST");
    expect(formValue(request.body, "photoUrl")).toBe("/uploads/label.jpg");
    expect(formValue(request.body, "photo")).toBeTruthy();
    expect(result.photoUrl).toBe("/uploads/label.jpg");
  });
});
