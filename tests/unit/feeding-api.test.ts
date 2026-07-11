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

  it("generates feeding schedules through the ToolRun-backed review route", async () => {
    mockApiRequest.mockResolvedValueOnce({
      outputs: {
        riskLevel: "low",
        logSummary: "Base nutrient feeding schedule reviewed: low risk, 0 warnings."
      },
      toolRun: { id: "toolrun-1" }
    });

    const { generateSchedule } = require("@/api/feeding");
    const result = await generateSchedule({
      growId: "grow-1",
      nutrientData: { productName: "Base nutrient" },
      growMedium: "Soil",
      stage: "veg",
      weeks: 2
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/tools/feeding-schedule-review", {
      method: "POST",
      headers: undefined,
      body: expect.objectContaining({
        growId: "grow-1",
        productName: "Base nutrient",
        medium: "Soil",
        schedule: [
          expect.objectContaining({ week: 1, stage: "veg" }),
          expect.objectContaining({ week: 2, stage: "veg" })
        ]
      })
    });
    expect(result.data.schedule.schedule).toHaveLength(2);
    expect(result.data.schedule.review).toMatchObject({ riskLevel: "low" });
    expect(result.data.toolRun).toEqual({ id: "toolrun-1" });
  });
});
