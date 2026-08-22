import { apiRequest } from "@/api/apiRequest";
import { prepareBusinessDeskQuoteArtifact } from "@/api/businessDesk";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("reviewed Quote artifact API", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("prepares one exact Facility revision with an idempotency key", async () => {
    const artifact = {
      mode: "csv" as const,
      contentType: "text/csv; charset=utf-8",
      filename: "Q-100.csv",
      content: '"section","field"\r\n',
      preparedFromVersion: 3,
      checksumSha256: "a".repeat(64),
      deliveryStatus: "not_observed" as const
    };
    mockApiRequest.mockResolvedValue({
      data: {
        artifact,
        revision: {
          operation: "quote_export_prepared",
          revisionNumber: 3,
          stateMutation: false
        }
      }
    });

    await expect(
      prepareBusinessDeskQuoteArtifact(
        { workspaceType: "facility", facilityId: "facility/1" },
        "quote/1",
        {
          expectedVersion: 3,
          mode: "csv",
          idempotencyKey: "quote-export-0001"
        }
      )
    ).resolves.toBe(artifact);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/facility/facility%2F1/business-desk/quote%2F1/prepare-artifact",
      {
        method: "POST",
        body: {
          expectedVersion: 3,
          mode: "csv",
          idempotencyKey: "quote-export-0001"
        },
        signal: undefined
      }
    );
  });

  it("rejects an artifact from a different revision", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        artifact: {
          mode: "copy",
          contentType: "text/plain; charset=utf-8",
          filename: "",
          content: "Quote",
          preparedFromVersion: 2,
          checksumSha256: "b".repeat(64),
          deliveryStatus: "not_observed"
        },
        revision: {
          operation: "quote_copy_prepared",
          revisionNumber: 3,
          stateMutation: false
        }
      }
    });

    await expect(
      prepareBusinessDeskQuoteArtifact({ workspaceType: "commercial" }, "quote-1", {
        expectedVersion: 3,
        mode: "copy",
        idempotencyKey: "quote-copy-0001"
      })
    ).rejects.toThrow("invalid");
  });

  it("rejects an artifact without the backend's not-observed delivery truth", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        artifact: {
          mode: "copy",
          contentType: "text/plain; charset=utf-8",
          filename: "",
          content: "Quote",
          preparedFromVersion: 3,
          checksumSha256: "c".repeat(64)
        },
        revision: {
          operation: "quote_copy_prepared",
          revisionNumber: 3,
          stateMutation: false
        }
      }
    });

    await expect(
      prepareBusinessDeskQuoteArtifact({ workspaceType: "commercial" }, "quote-1", {
        expectedVersion: 3,
        mode: "copy",
        idempotencyKey: "quote-copy-0002"
      })
    ).rejects.toThrow("invalid");
  });

  it("rejects a prepared artifact without the matching non-mutating operation", async () => {
    mockApiRequest.mockResolvedValue({
      data: {
        artifact: {
          mode: "copy",
          contentType: "text/plain; charset=utf-8",
          filename: "",
          content: "Quote",
          preparedFromVersion: 3,
          checksumSha256: "d".repeat(64),
          deliveryStatus: "not_observed"
        },
        revision: {
          operation: "quote_export_prepared",
          revisionNumber: 3,
          stateMutation: false
        }
      }
    });

    await expect(
      prepareBusinessDeskQuoteArtifact({ workspaceType: "commercial" }, "quote-1", {
        expectedVersion: 3,
        mode: "copy",
        idempotencyKey: "quote-copy-0003"
      })
    ).rejects.toThrow("invalid");
  });
});
