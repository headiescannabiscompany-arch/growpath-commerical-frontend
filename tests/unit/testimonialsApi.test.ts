import {
  getTestimonialPolicy,
  getMyTestimonials,
  getAdminTestimonials,
  getPublicTestimonials,
  previewTestimonial,
  submitTestimonial,
  withdrawTestimonial,
  reviewTestimonial,
  testimonialPhotoUrl,
  uploadTestimonialPhoto,
  removeTestimonialPhoto,
  newTestimonialRequestId
} from "@/api/testimonials";

const mockRequest = jest.fn();
const mockUpload = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/api/apiRequest", () => ({
  API_URL: "https://api.example.test",
  apiRequest: (...args: any[]) => mockRequest(...args)
}));
jest.mock("@/api/uploads", () => ({
  uploadEvidenceMedia: (...args: any[]) => mockUpload(...args)
}));
jest.mock("@/api/evidence", () => ({
  createEvidenceAsset: (...args: any[]) => mockCreate(...args),
  deleteEvidenceAsset: (...args: any[]) => mockDelete(...args)
}));
const policy = {
  version: "feedback-v1",
  statement: "Optional exact publication permission.",
  minFeedbackLength: 10,
  maxFeedbackLength: 1500,
  minPublicNameLength: 2,
  maxPublicNameLength: 80,
  maxPhotos: 1
};
const row = (extra: any = {}) => ({
  id: "submission-1",
  clientSubmissionId: "stable-id",
  status: "pending_review",
  isCurrent: true,
  publicName: "A grower",
  feedbackText: "My own honest feedback.",
  photoEvidenceAssetId: null,
  photoSourceVersion: null,
  contentDigest: "digest-1",
  revision: 1,
  synthetic: false,
  consent: { granted: true, version: "feedback-v1" },
  createdAt: "2026-10-04T12:00:00Z",
  updatedAt: "2026-10-04T12:00:00Z",
  publishedAt: null,
  withdrawnAt: null,
  ...extra
});

describe("testimonial API boundaries", () => {
  beforeEach(() => jest.resetAllMocks());
  it("validates the current policy and exact server preview", async () => {
    mockRequest.mockResolvedValueOnce({ policy }).mockResolvedValueOnce({
      preview: {
        publicName: "A grower",
        feedbackText: "My own honest feedback.",
        photoEvidenceAssetId: null,
        photoSourceVersion: null,
        contentDigest: "exact",
        consentVersion: policy.version
      }
    });
    expect(await getTestimonialPolicy()).toEqual(policy);
    expect(mockRequest.mock.calls[0][1].auth).not.toBe(false);
    expect(
      (
        await previewTestimonial({
          publicName: "A grower",
          feedbackText: "My own honest feedback."
        })
      ).contentDigest
    ).toBe("exact");
  });
  it.each([
    {},
    { policy: {} },
    { policy: { ...policy, maxPhotos: 2 } },
    { policy: { ...policy, maxFeedbackLength: 5000 } }
  ])("rejects malformed policy %j", async (response) => {
    mockRequest.mockResolvedValue(response);
    await expect(getTestimonialPolicy()).rejects.toThrow();
  });
  it("keeps confirmed owner empty distinct from a failed read", async () => {
    mockRequest
      .mockResolvedValueOnce({ current: null, history: [], nextCursor: null })
      .mockRejectedValueOnce(new Error("offline"));
    expect(await getMyTestimonials()).toEqual({
      current: null,
      history: [],
      nextCursor: null
    });
    await expect(getMyTestimonials()).rejects.toThrow("offline");
  });
  it("rejects a preview that substitutes a different protected photo", async () => {
    mockRequest.mockResolvedValue({
      preview: {
        publicName: "A grower",
        feedbackText: "My own honest feedback.",
        photoEvidenceAssetId: "other-photo",
        photoSourceVersion: "bound-version",
        contentDigest: "digest",
        consentVersion: "feedback-v1"
      }
    });
    await expect(
      previewTestimonial({
        publicName: "A grower",
        feedbackText: "My own honest feedback.",
        photoEvidenceAssetId: "chosen-photo"
      })
    ).rejects.toThrow();
  });
  it.each([
    {},
    { current: null, history: {}, nextCursor: null },
    { current: row({ status: "withdrawn" }), history: [], nextCursor: null },
    { current: null, history: [row()], nextCursor: null },
    { current: row({ revision: -1 }), history: [], nextCursor: null },
    {
      current: row({ photoEvidenceAssetId: "photo", photoSourceVersion: null }),
      history: [],
      nextCursor: null
    },
    {
      current: null,
      history: [
        row({ isCurrent: false, status: "withdrawn" }),
        row({ isCurrent: false, status: "withdrawn" })
      ],
      nextCursor: null
    }
  ])("rejects malformed owner collection %j", async (response) => {
    mockRequest.mockResolvedValue(response);
    await expect(getMyTestimonials()).rejects.toThrow();
  });
  it("sends bounded cursor reads and cancellation", async () => {
    const controller = new AbortController();
    mockRequest.mockResolvedValue({ submissions: [row()], nextCursor: "next" });
    await getAdminTestimonials("pending_review", "cursor", controller.signal);
    expect(mockRequest).toHaveBeenCalledWith(
      "/api/admin/testimonials",
      expect.objectContaining({
        params: { status: "pending_review", cursor: "cursor", limit: 10 },
        signal: controller.signal,
        cache: "no-store"
      })
    );
  });
  it("sends the same idempotency key and exact private consent on retry", async () => {
    const input = {
      clientSubmissionId: "stable-id",
      publicName: "A grower",
      feedbackText: "My own honest feedback.",
      photoEvidenceAssetId: null,
      previewDigest: "digest-1",
      consent: { granted: false, version: "feedback-v1" }
    };
    mockRequest
      .mockRejectedValueOnce(new Error("unknown outcome"))
      .mockResolvedValueOnce({
        submission: row({ status: "private", consent: input.consent }),
        replayed: true
      });
    await expect(submitTestimonial(input)).rejects.toThrow();
    expect((await submitTestimonial(input)).replayed).toBe(true);
    expect(mockRequest.mock.calls[0][1].body).toEqual(mockRequest.mock.calls[1][1].body);
    expect(mockRequest.mock.calls[1][1].retries).toBe(0);
  });
  it("requires action receipts to match the immutable record and expected state", async () => {
    mockRequest.mockResolvedValueOnce({
      submission: row({ status: "published", contentDigest: "different" })
    });
    await expect(reviewTestimonial(row() as any, "publish", "", true)).rejects.toThrow();
    expect(mockRequest.mock.calls[0][1].body).toEqual({
      expectedRevision: 1,
      contentDigest: "digest-1",
      audienceApproved: true
    });
  });
  it("accepts an exact withdrawn retry receipt without calling it current", async () => {
    const input = {
      clientSubmissionId: "stable-id",
      publicName: "A grower",
      feedbackText: "My own honest feedback.",
      photoEvidenceAssetId: null,
      previewDigest: "digest-1",
      consent: { granted: true, version: "feedback-v1" }
    };
    mockRequest.mockResolvedValue({
      submission: row({ status: "withdrawn", isCurrent: false }),
      replayed: true
    });
    const receipt = await submitTestimonial(input);
    expect(receipt.submission.status).toBe("withdrawn");
    expect(receipt.submission.isCurrent).toBe(false);
  });
  it("rejects a saved receipt for another request or altered words", async () => {
    const input = {
      clientSubmissionId: "stable-id",
      publicName: "A grower",
      feedbackText: "My own honest feedback.",
      photoEvidenceAssetId: null,
      previewDigest: "digest-1",
      consent: { granted: true, version: "feedback-v1" }
    };
    mockRequest
      .mockResolvedValueOnce({
        submission: row({ clientSubmissionId: "other-request" }),
        replayed: true
      })
      .mockResolvedValueOnce({
        submission: row({ feedbackText: "Words the owner never previewed." }),
        replayed: false
      });
    await expect(submitTestimonial(input)).rejects.toThrow();
    await expect(submitTestimonial(input)).rejects.toThrow();
  });
  it("sends versioned hide/reject reasons without a quote-editing payload", async () => {
    mockRequest.mockResolvedValue({ submission: row({ status: "hidden" }) });
    await reviewTestimonial(row() as any, "hide", "  Private detail  ");
    expect(mockRequest.mock.calls[0][1].body).toEqual({
      expectedRevision: 1,
      contentDigest: "digest-1",
      reason: "Private detail"
    });
  });
  it("validates withdrawal receipt and preserves the expected revision", async () => {
    mockRequest.mockResolvedValue({
      submission: row({ status: "withdrawn", isCurrent: false })
    });
    await withdrawTestimonial("submission-1", 1);
    expect(mockRequest.mock.calls[0][1].body).toEqual({ expectedRevision: 1 });
  });
  it.each([
    "https://other.test/api/public/testimonials/x/photo",
    "https://secret@api.example.test/api/public/testimonials/x/photo",
    "/api/uploads/original.jpg",
    "/api/public/testimonials/x/photo#token"
  ])("rejects a non-controlled photo URL %s", (url) => {
    expect(() => testimonialPhotoUrl(url, true)).toThrow();
  });
  it("projects public records without owner, consent or moderation fields", async () => {
    mockRequest.mockResolvedValue({
      testimonials: [
        {
          publicId: "public-1",
          publicName: "Chosen name",
          quote: "Actual approved words",
          photo: { url: "/api/public/testimonials/public-1/photo", alt: "Chosen photo" },
          publishedAt: "2026-10-04T12:00:00Z",
          email: "private@example.test",
          ownerId: "owner-1",
          consent: { secret: true }
        }
      ]
    });
    const result = await getPublicTestimonials();
    expect(Object.keys(result[0]).sort()).toEqual(
      ["photo", "publicId", "publicName", "publishedAt", "quote"].sort()
    );
    expect(JSON.stringify(result)).not.toMatch(/private@example|owner-1|secret/);
    expect(mockRequest).toHaveBeenCalledWith(
      "/api/public/testimonials",
      expect.objectContaining({ auth: false, cache: "no-store" })
    );
  });
  it("rejects a public photo bound to another testimonial", async () => {
    mockRequest.mockResolvedValue({
      testimonials: [
        {
          publicId: "one",
          publicName: "Chosen name",
          quote: "Actual words",
          photo: { url: "/api/public/testimonials/two/photo", alt: "Photo" },
          publishedAt: "2026-10-04T12:00:00Z"
        }
      ]
    });
    await expect(getPublicTestimonials()).rejects.toThrow();
  });
  it("accepts a genuine empty public list but not an invalid envelope", async () => {
    mockRequest.mockResolvedValueOnce({ testimonials: [] }).mockResolvedValueOnce({});
    expect(await getPublicTestimonials()).toEqual([]);
    await expect(getPublicTestimonials()).rejects.toThrow();
  });
  it("uses protected personal evidence without location, public upload, or AI permission", async () => {
    mockUpload.mockResolvedValue({
      url: "https://protected.example.test/file",
      mimeType: "image/jpeg",
      bytes: 100
    });
    mockCreate.mockResolvedValue({ id: "evidence-1" });
    const draft = { uri: "file:///photo.jpg", clientUploadKey: "photo-request" };
    expect(await uploadTestimonialPhoto(draft)).toBe("evidence-1");
    expect(mockUpload.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        assetType: "photo",
        workspaceType: "personal",
        forceStripMetadata: true,
        clientUploadKey: "photo-request"
      })
    );
    expect(mockCreate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        aiUsable: false,
        workspaceType: "personal",
        purpose: "other",
        qualityWarnings: []
      })
    );
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty("sourceCaptureMetadata");
    expect(await uploadTestimonialPhoto(draft)).toBe("evidence-1");
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
  it("reuses protected uploaded bytes after an uncertain evidence-registration outcome", async () => {
    mockUpload.mockResolvedValue({ url: "https://protected.example.test/file" });
    mockCreate
      .mockRejectedValueOnce(new Error("lost receipt"))
      .mockResolvedValueOnce({ id: "evidence-1" });
    const draft = { uri: "file:///photo.jpg", clientUploadKey: "same-photo-request" };
    await expect(uploadTestimonialPhoto(draft)).rejects.toThrow();
    await uploadTestimonialPhoto(draft);
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockCreate.mock.calls[0][0].clientUploadKey).toBe(
      mockCreate.mock.calls[1][0].clientUploadKey
    );
  });
  it("does not chain registration after cancellation", async () => {
    const controller = new AbortController();
    mockUpload.mockImplementation(async () => {
      controller.abort();
      return { url: "https://protected.example.test/file" };
    });
    await expect(
      uploadTestimonialPhoto(
        { uri: "file:///photo.jpg", clientUploadKey: "photo-request" },
        controller.signal
      )
    ).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it("only removes the owned selected personal evidence record", async () => {
    const controller = new AbortController();
    await removeTestimonialPhoto("evidence-1", controller.signal);
    expect(mockDelete).toHaveBeenCalledWith(
      "evidence-1",
      { workspaceType: "personal" },
      { signal: controller.signal }
    );
  });
  it("creates unique well-formed idempotency UUIDs", () => {
    const ids = Array.from({ length: 20 }, () => newTestimonialRequestId());
    expect(new Set(ids).size).toBe(20);
    for (const id of ids)
      expect(id).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/
      );
  });
});
