import * as api from "../adminFacilityDocuments";
import { adminVaultRequest } from "../adminPasskeys";
jest.mock("../adminPasskeys", () => ({ adminVaultRequest: jest.fn() }));
const request = adminVaultRequest as jest.Mock;
const ID = "111111111111111111111111",
  REVIEW = "222222222222222222222222",
  EXEC = "333333333333333333333333";
const review = {
  ok: true,
  reviewId: REVIEW,
  current: true,
  disposition: "request_cleanup",
  code: "RETENTION_REVIEW_REQUIRED",
  cleanupAuthorized: false
};
test("recovery is bounded, uses security wrapper and drops unknown private metadata", async () => {
  request.mockResolvedValue({
    ok: true,
    rows: [
      { assetId: ID, code: "HELD", instruction: "Review", privatePath: "never render" }
    ],
    nextAfterId: null
  });
  expect(await api.readDocumentRecovery(ID)).toEqual({
    rows: [{ assetId: ID, code: "HELD", instruction: "Review" }],
    nextAfterId: null
  });
  expect(request).toHaveBeenCalledWith(
    `/api/admin/facility-documents/recovery?limit=20&afterId=${ID}`
  );
});
test.each([
  null,
  {
    ok: true,
    rows: Array(21).fill({ assetId: ID, code: "HELD", instruction: "Review" })
  },
  { ok: true, rows: [], nextAfterId: "invalid" }
])("rejects invalid recovery %p", async (value) => {
  request.mockResolvedValue(value);
  await expect(api.readDocumentRecovery()).rejects.toThrow();
});
test.each([
  { cleanupAuthorized: true },
  { disposition: "delete" },
  { current: "yes" },
  { reviewId: "invalid" }
])("review response cannot authorize cleanup %p", async (patch) => {
  request.mockResolvedValue({ ...review, ...patch });
  await expect(api.inspectDocumentReview(ID)).rejects.toThrow();
});
test("review and cleanup remain separate exact-confirmation operations", async () => {
  await expect(api.recordDocumentReview(ID, REVIEW, "retain", "yes")).rejects.toThrow();
  await expect(api.cleanupReviewedDocument(ID, REVIEW, EXEC, "yes")).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
  request.mockResolvedValue(review);
  await api.recordDocumentReview(ID, REVIEW, "retain", `REVIEW ${ID} retain`);
  expect(request).toHaveBeenCalledWith(`/api/admin/facility-documents/${ID}/review`, {
    method: "POST",
    body: { reviewId: REVIEW, disposition: "retain", confirmation: `REVIEW ${ID} retain` }
  });
});
test.each([
  { ok: true, released: false, activationAllowed: false },
  { ok: true, released: true, activationAllowed: true }
])("unconfirmed cleanup is not success %p", async (value) => {
  request.mockResolvedValue(value);
  await expect(
    api.cleanupReviewedDocument(ID, REVIEW, EXEC, `DELETE REVOKED ${ID} ${REVIEW}`)
  ).rejects.toThrow();
});
test("cleanup returns success only after explicit server confirmation", async () => {
  request.mockResolvedValue({ ok: true, released: true, activationAllowed: false });
  expect(
    await api.cleanupReviewedDocument(ID, REVIEW, EXEC, `DELETE REVOKED ${ID} ${REVIEW}`)
  ).toBe(true);
});

const PREVIOUS = "444444444444444444444444";
const reassigned = {
  ok: true,
  reassigned: true,
  alreadyReassigned: false,
  released: false,
  reviewId: REVIEW,
  executionId: EXEC,
  activationAllowed: false,
  cleanupAuthorized: false
};
test("recovery exposes only valid claim references on the exact interrupted cleanup row", async () => {
  request.mockResolvedValue({
    ok: true,
    rows: [
      {
        assetId: ID,
        code: "REVOKED_CLEANUP_RECHECK_REQUIRED",
        instruction: "Recheck",
        cleanupClaim: { reviewId: REVIEW, executionId: PREVIOUS, actorId: "private" }
      }
    ]
  });
  expect((await api.readDocumentRecovery()).rows[0]).toEqual({
    assetId: ID,
    code: "REVOKED_CLEANUP_RECHECK_REQUIRED",
    instruction: "Recheck",
    cleanupClaim: { reviewId: REVIEW, executionId: PREVIOUS }
  });
});
test.each([
  ["WRITER_COMPLETION_UNPROVED", { reviewId: REVIEW, executionId: PREVIOUS }],
  ["REVOKED_CLEANUP_RECHECK_REQUIRED", null],
  ["REVOKED_CLEANUP_RECHECK_REQUIRED", { reviewId: REVIEW, executionId: "bad" }],
  ["REVOKED_CLEANUP_RECHECK_REQUIRED", { reviewId: [REVIEW], executionId: PREVIOUS }],
  ["REVOKED_CLEANUP_RECHECK_REQUIRED", { reviewId: REVIEW, executionId: REVIEW }],
  ["REVOKED_CLEANUP_RECHECK_REQUIRED", { reviewId: ID, executionId: PREVIOUS }]
])(
  "invalid or unrelated claim does not enable handoff: %s %p",
  async (code, cleanupClaim) => {
    request.mockResolvedValue({
      ok: true,
      rows: [{ assetId: ID, code, instruction: "Keep held", cleanupClaim }]
    });
    expect((await api.readDocumentRecovery()).rows[0].cleanupClaim).toBeUndefined();
  }
);
test.each([false, true])(
  "handoff uses exact endpoint, payload and security wrapper (released %s)",
  async (released) => {
    request.mockResolvedValue({ ...reassigned, released, alreadyReassigned: released });
    expect(
      await api.reassignDocumentCleanup(
        ID,
        PREVIOUS,
        REVIEW,
        EXEC,
        `REASSIGN REVOKED ${ID} ${PREVIOUS}`
      )
    ).toEqual({ reviewId: REVIEW, executionId: EXEC, released });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      `/api/admin/facility-documents/${ID}/cleanup-handoff`,
      {
        method: "POST",
        body: {
          previousExecutionId: PREVIOUS,
          reviewId: REVIEW,
          executionId: EXEC,
          confirmation: `REASSIGN REVOKED ${ID} ${PREVIOUS}`
        }
      }
    );
  }
);
test.each([
  { ok: false },
  { reassigned: false },
  { alreadyReassigned: "yes" },
  { released: null },
  { reviewId: PREVIOUS },
  { executionId: PREVIOUS },
  { activationAllowed: true },
  { cleanupAuthorized: true }
])("handoff rejects unconfirmed or mismatched response %p", async (patch) => {
  request.mockResolvedValue({ ...reassigned, ...patch });
  await expect(
    api.reassignDocumentCleanup(
      ID,
      PREVIOUS,
      REVIEW,
      EXEC,
      `REASSIGN REVOKED ${ID} ${PREVIOUS}`
    )
  ).rejects.toThrow();
});
test("invalid references and removal confirmation cannot trigger reassignment", async () => {
  await expect(
    api.reassignDocumentCleanup(
      ID,
      PREVIOUS,
      REVIEW,
      EXEC,
      `DELETE REVOKED ${ID} ${REVIEW}`
    )
  ).rejects.toThrow();
  await expect(
    api.reassignDocumentCleanup(
      ID,
      PREVIOUS,
      REVIEW,
      REVIEW,
      `REASSIGN REVOKED ${ID} ${PREVIOUS}`
    )
  ).rejects.toThrow();
  await expect(
    api.reassignDocumentCleanup(ID, "bad", REVIEW, EXEC, "yes")
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
});
