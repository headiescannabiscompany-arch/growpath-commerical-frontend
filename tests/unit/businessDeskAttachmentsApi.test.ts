import { apiRequest, uploadBinaryToSignedUrl } from "@/api/apiRequest";
import {
  cancelBusinessDeskAttachment,
  completeBusinessDeskAttachment,
  getBusinessDeskAttachment,
  prepareBusinessDeskAttachmentDownload,
  reserveBusinessDeskAttachment,
  uploadBusinessDeskAttachmentBytes
} from "@/api/businessDeskAttachments";
import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";

jest.mock("@/api/apiRequest", () => ({
  apiRequest: jest.fn(),
  uploadBinaryToSignedUrl: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockUpload = uploadBinaryToSignedUrl as jest.MockedFunction<
  typeof uploadBinaryToSignedUrl
>;

const attachment = {
  id: "507f191e810c19729de86008",
  purpose: "expense_receipt" as const,
  lifecycle: "uploading" as const,
  version: 1,
  originalFilename: "receipt.jpg",
  mimeType: "image/jpeg",
  expectedBytes: 1200,
  verifiedBytes: null,
  expiresAt: "2026-08-23T12:00:00.000Z",
  confirmedAt: null
};

const quota = {
  limitBytes: 250 * 1024 * 1024,
  reservedBytes: 1200,
  completedBytes: 0,
  remainingBytes: 250 * 1024 * 1024 - 1200,
  version: 1
};

describe("Business Desk protected attachment API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockUpload.mockReset();
  });

  it("reserves workspace-scoped protected storage and validates the signed PUT", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      data: {
        attachment,
        quota,
        upload: { url: "https://uploads.example.test/signed", expiresInSeconds: 900 },
        idempotentReplay: false
      }
    });
    const input = {
      purpose: "expense_receipt" as const,
      filename: "receipt.jpg",
      declaredMimeType: "image/jpeg",
      expectedBytes: 1200,
      idempotencyKey: "expense-receipt-reserve-1"
    };

    await expect(
      reserveBusinessDeskAttachment(COMMERCIAL_BUSINESS_DESK_WORKSPACE, input)
    ).resolves.toMatchObject({ attachment, quota, upload: { expiresInSeconds: 900 } });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/business-desk/attachments/reserve",
      { method: "POST", body: input }
    );
  });

  it("fails closed when an uploading reservation omits or corrupts its signed PUT", async () => {
    mockApiRequest.mockResolvedValue({ data: { attachment, quota, upload: null } });
    await expect(
      reserveBusinessDeskAttachment(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        purpose: "expense_receipt",
        filename: "receipt.jpg",
        declaredMimeType: "image/jpeg",
        expectedBytes: 1200,
        idempotencyKey: "expense-receipt-reserve-2"
      })
    ).rejects.toThrow("upload response was invalid");
  });

  it("uses exact Facility attachment routes for complete, status, and cancel", async () => {
    const ready = { ...attachment, lifecycle: "ready", version: 3, verifiedBytes: 1200 };
    mockApiRequest.mockResolvedValue({ data: { attachment: ready, quota } });
    const workspace = { workspaceType: "facility" as const, facilityId: "north / east" };

    await completeBusinessDeskAttachment(workspace, attachment.id, {
      expectedVersion: 2,
      idempotencyKey: "receipt-complete-1"
    });
    await getBusinessDeskAttachment(workspace, attachment.id);
    await cancelBusinessDeskAttachment(workspace, attachment.id, {
      expectedVersion: 3,
      idempotencyKey: "receipt-cancel-1"
    });

    const base = "/api/facility/north%20%2F%20east/business-desk/attachments";
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      `${base}/${attachment.id}/complete`,
      expect.objectContaining({ method: "POST" })
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, `${base}/${attachment.id}`);
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      `${base}/${attachment.id}/cancel`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("accepts only an exact five-minute forced protected download", async () => {
    const ready = { ...attachment, lifecycle: "ready", version: 3, verifiedBytes: 1200 };
    mockApiRequest.mockResolvedValue({
      data: {
        attachment: ready,
        download: {
          url: "https://downloads.example.test/signed",
          expiresInSeconds: 300,
          contentDisposition: 'attachment; filename="receipt.jpg"',
          mimeType: "image/jpeg",
          deliveryStatus: "not_observed"
        }
      }
    });
    await expect(
      prepareBusinessDeskAttachmentDownload(
        COMMERCIAL_BUSINESS_DESK_WORKSPACE,
        attachment.id
      )
    ).resolves.toMatchObject({ download: { expiresInSeconds: 300 } });

    mockApiRequest.mockResolvedValueOnce({
      data: {
        attachment: ready,
        download: {
          url: "https://downloads.example.test/too-long",
          expiresInSeconds: 301,
          contentDisposition: 'attachment; filename="receipt.jpg"',
          mimeType: "image/jpeg",
          deliveryStatus: "not_observed"
        }
      }
    });
    await expect(
      prepareBusinessDeskAttachmentDownload(
        COMMERCIAL_BUSINESS_DESK_WORKSPACE,
        attachment.id
      )
    ).rejects.toThrow("download response was invalid");
  });

  it("uploads bytes only to the validated signed URL with progress and cancellation", async () => {
    const reservation = {
      attachment,
      quota,
      upload: { url: "https://uploads.example.test/signed", expiresInSeconds: 900 }
    };
    const signal = new AbortController().signal;
    const onProgress = jest.fn();
    mockUpload.mockResolvedValue({ status: 200, etag: '"etag"' });

    await uploadBusinessDeskAttachmentBytes(
      reservation,
      { uri: "file:///receipt.jpg", mimeType: "image/jpeg" },
      { signal, onProgress }
    );
    expect(mockUpload).toHaveBeenCalledWith({
      url: reservation.upload.url,
      uri: "file:///receipt.jpg",
      body: undefined,
      mimeType: "image/jpeg",
      signal,
      onProgress
    });
  });

  it("rejects inconsistent quota counters before UI state can trust them", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        attachment,
        upload: { url: "https://uploads.example.test/signed", expiresInSeconds: 900 },
        quota: { ...quota, completedBytes: quota.reservedBytes + 1 }
      }
    });
    await expect(
      reserveBusinessDeskAttachment(COMMERCIAL_BUSINESS_DESK_WORKSPACE, {
        purpose: "expense_receipt",
        filename: "receipt.jpg",
        declaredMimeType: "image/jpeg",
        expectedBytes: 1200,
        idempotencyKey: "expense-receipt-reserve-3"
      })
    ).rejects.toThrow("quota response was invalid");
  });
});
