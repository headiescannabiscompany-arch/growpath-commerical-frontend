import { adminVaultRequest } from "@/api/adminPasskeys";
import {
  archiveAccessConfirmation,
  openArchiveAccess,
  reviewArchiveAccess,
  type ArchiveAccessProposal
} from "@/api/adminArchiveAccess";
jest.mock("@/api/adminPasskeys", () => ({ adminVaultRequest: jest.fn() }));
const request = adminVaultRequest as jest.Mock;
const archiveId = "64b000000000000000000006";
const evidenceRequestId = "64b000000000000000000007";
const input: ArchiveAccessProposal = {
  archiveId,
  evidenceRequestId,
  purpose: "Synthetic approved review",
  scopes: ["account.profile", "account.identity"],
  minimumNecessaryAcknowledged: true,
  confirmation: archiveAccessConfirmation(archiveId, evidenceRequestId)
};
const review = () => ({
  reviewToken: "A".repeat(43),
  reviewExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  nextConfirmation: input.confirmation
});
const receipt = () => ({
  ok: true,
  archiveId,
  evidenceRequestId,
  externalTransmissionPerformed: false,
  dateWindow: { from: null, to: null },
  itemCounts: { "account.identity": 1, "account.profile": 0 },
  data: { "account.identity": { name: "Synthetic" }, "account.profile": {} }
});
beforeEach(() => jest.clearAllMocks());

it("sorts scopes, binds the review, disables caching/retries and strips unexpected fields", async () => {
  const valid = review();
  request.mockResolvedValue({
    ok: true,
    ...valid,
    scopes: ["account.identity", "account.profile"],
    privateExtra: "hidden"
  });
  await expect(reviewArchiveAccess(input)).resolves.toEqual(valid);
  expect(request).toHaveBeenCalledWith(
    `/api/admin/evidence-vault/removed-accounts/${archiveId}/case-access-review`,
    {
      method: "POST",
      body: {
        ...input,
        archiveId: undefined,
        scopes: ["account.identity", "account.profile"]
      },
      cache: "no-store",
      retries: 0
    }
  );
  request.mockResolvedValue({ ...receipt(), secretExtra: "not displayed" });
  const result = await openArchiveAccess(input, valid);
  expect(result).not.toHaveProperty("secretExtra");
  expect(request.mock.calls[1][1]).toMatchObject({
    method: "POST",
    cache: "no-store",
    retries: 0,
    body: { reviewToken: valid.reviewToken }
  });
});

it.each([
  { archiveId: "bad" },
  { evidenceRequestId: "bad" },
  { purpose: "short" },
  { confirmation: "wrong" },
  { minimumNecessaryAcknowledged: false },
  { scopes: [] },
  { scopes: ["account.identity", "account.identity"] },
  { scopes: ["everything"] }
])("rejects invalid input before I/O: %j", async (change) => {
  await expect(
    reviewArchiveAccess({ ...input, ...change } as ArchiveAccessProposal)
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});

it.each([
  { ok: false },
  { reviewToken: "bad" },
  { scopes: ["account.security", "account.profile"] },
  { scopes: ["account.identity"] },
  { nextConfirmation: "wrong" },
  { reviewExpiresAt: "bad" },
  { reviewExpiresAt: "2000-01-01T00:00:00.000Z" }
])("rejects unsafe review receipt: %j", async (change) => {
  request.mockResolvedValue({
    ok: true,
    ...review(),
    scopes: ["account.identity", "account.profile"],
    ...change
  });
  await expect(reviewArchiveAccess(input)).rejects.toThrow(
    "Invalid archive-access review receipt"
  );
});

it("does not send expired or mismatched one-use tokens", async () => {
  await expect(
    openArchiveAccess(input, { ...review(), reviewExpiresAt: "invalid" })
  ).rejects.toThrow();
  await expect(
    openArchiveAccess(input, { ...review(), nextConfirmation: "wrong" })
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});

it.each([
  { archiveId: evidenceRequestId },
  { evidenceRequestId: archiveId },
  { externalTransmissionPerformed: true },
  { data: { "account.security": {} } },
  { data: { "account.identity": {}, "account.profile": {}, unexpected: {} } },
  { itemCounts: { "account.security": 1 } },
  { itemCounts: { "account.identity": -1 } },
  { dateWindow: { from: "not-a-date", to: null } },
  { dateWindow: { from: "2026-09-21", to: "2026-09-20" } }
])("rejects a mismatched or widened data receipt: %j", async (change) => {
  request.mockResolvedValue({ ...receipt(), ...change });
  await expect(openArchiveAccess(input, review())).rejects.toThrow(
    "Invalid scoped archive-access receipt"
  );
});
