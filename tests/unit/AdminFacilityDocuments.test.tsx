import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import AdminFacilityDocuments from "@/features/admin/AdminFacilityDocuments";
import * as api from "@/api/adminFacilityDocuments";
let mockExpiry: string | null;
let mockEpoch = 0;
let mockIdentityEpoch = 0;
jest.mock("@/api/adminPasskeys", () => ({
  getAdminStepUpExpiry: () => mockExpiry,
  getAdminSecurityIdentityEpoch: () => mockIdentityEpoch
}));
jest.mock("@/features/admin/useAdminSecurity", () => ({
  useAdminSecurityEpoch: () => mockEpoch
}));
jest.mock("@/api/adminFacilityDocuments", () => ({
  readDocumentRecovery: jest.fn(),
  inspectDocumentReview: jest.fn(),
  recordDocumentReview: jest.fn(),
  cleanupReviewedDocument: jest.fn(),
  reassignDocumentCleanup: jest.fn(),
  newDocumentControlId: jest.fn()
}));
const ID = "111111111111111111111111",
  REVIEW = "222222222222222222222222",
  EXEC = "333333333333333333333333";
const initial = {
  reviewId: null,
  current: false,
  disposition: "retain",
  code: "RETENTION_REVIEW_REQUIRED",
  cleanupAuthorized: false
};
const reviewed = {
  ...initial,
  reviewId: REVIEW,
  current: true,
  disposition: "request_cleanup"
};
const mock = (fn: any) => fn as jest.Mock;
beforeEach(() => {
  mockExpiry = new Date(Date.now() + 60000).toISOString();
  mockEpoch = 0;
  mockIdentityEpoch = 0;
  mock(api.readDocumentRecovery).mockResolvedValue({
    rows: [{ assetId: ID, code: initial.code, instruction: "Review required" }],
    nextAfterId: null
  });
  mock(api.inspectDocumentReview).mockResolvedValue(initial);
  mock(api.recordDocumentReview).mockResolvedValue(reviewed);
  mock(api.cleanupReviewedDocument).mockResolvedValue(true);
  mock(api.newDocumentControlId).mockReturnValueOnce(REVIEW).mockReturnValue(EXEC);
});
async function open() {
  const s = render(<AdminFacilityDocuments />);
  expect(api.readDocumentRecovery).not.toHaveBeenCalled();
  fireEvent.press(s.getByText("Open / refresh document review"));
  fireEvent.press(await s.findByText("Review this document"));
  await s.findByLabelText("Document review confirmation");
  return s;
}
test("no automatic access and no controls without a fresh passkey", () => {
  mockExpiry = null;
  const s = render(<AdminFacilityDocuments />);
  fireEvent.press(s.getByText("Open / refresh document review"));
  expect(api.readDocumentRecovery).not.toHaveBeenCalled();
});
test("pending scans and unproved writers show instructions without a retention mutation button", async () => {
  mock(api.readDocumentRecovery).mockResolvedValue({
    rows: [
      {
        assetId: ID,
        code: "WRITER_COMPLETION_UNPROVED",
        instruction: "Preserve pending writer"
      }
    ],
    nextAfterId: null
  });
  const s = render(<AdminFacilityDocuments />);
  fireEvent.press(s.getByText("Open / refresh document review"));
  await s.findByText("Preserve pending writer");
  expect(s.queryByText("Review this document")).toBeNull();
  expect(api.inspectDocumentReview).not.toHaveBeenCalled();
});
test("review requires exact confirmation and does not execute deletion", async () => {
  const s = await open();
  fireEvent.press(s.getByText("Request a separate cleanup review"));
  fireEvent.changeText(s.getByLabelText("Document review confirmation"), "yes");
  fireEvent.press(s.getByText("Record document review"));
  expect(api.recordDocumentReview).not.toHaveBeenCalled();
  fireEvent.changeText(
    s.getByLabelText("Document review confirmation"),
    `REVIEW ${ID} request_cleanup`
  );
  fireEvent.press(s.getByText("Record document review"));
  await s.findByText(/Review recorded/);
  expect(api.recordDocumentReview).toHaveBeenCalledWith(
    ID,
    REVIEW,
    "request_cleanup",
    `REVIEW ${ID} request_cleanup`
  );
  expect(api.cleanupReviewedDocument).not.toHaveBeenCalled();
});
test("server retention hold never exposes cleanup action", async () => {
  mock(api.inspectDocumentReview).mockResolvedValue({
    ...initial,
    current: true,
    reviewId: REVIEW,
    code: "RETAINED_EVIDENCE_HOLD"
  });
  const s = await open();
  expect(s.queryByText("Permanently remove reviewed revoked copy")).toBeNull();
});
test("ambiguous deletion preserves exact execution across refresh and explicit retry", async () => {
  mock(api.inspectDocumentReview).mockResolvedValue(reviewed);
  mock(api.newDocumentControlId).mockReset().mockReturnValue(EXEC);
  mock(api.cleanupReviewedDocument)
    .mockRejectedValueOnce(new Error("lost response"))
    .mockResolvedValue(true);
  const s = await open();
  const phrase = `DELETE REVOKED ${ID} ${REVIEW}`;
  fireEvent.changeText(s.getByLabelText("Document review confirmation"), phrase);
  fireEvent.press(s.getByText("Permanently remove reviewed revoked copy"));
  await s.findByText(/Not confirmed/);
  fireEvent.press(s.getByText("Open / refresh document review"));
  await waitFor(() => expect(api.readDocumentRecovery).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(s.queryByText("Checking…")).toBeNull());
  fireEvent.changeText(s.getByLabelText("Document review confirmation"), phrase);
  fireEvent.press(s.getByText("Permanently remove reviewed revoked copy"));
  await s.findByText(/Server confirmed removal/);
  expect(api.cleanupReviewedDocument).toHaveBeenCalledTimes(2);
  for (const call of mock(api.cleanupReviewedDocument).mock.calls)
    expect(call).toEqual([ID, REVIEW, EXEC, phrase]);
  expect(api.newDocumentControlId).toHaveBeenCalledTimes(1);
});
test("duplicate clicks do not duplicate review; security changes discard late response", async () => {
  let finish: (value: any) => void = () => {};
  mock(api.recordDocumentReview).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const s = await open();
  fireEvent.changeText(
    s.getByLabelText("Document review confirmation"),
    `REVIEW ${ID} retain`
  );
  const button = s.getByText("Record document review");
  fireEvent.press(button);
  fireEvent.press(button);
  expect(api.recordDocumentReview).toHaveBeenCalledTimes(1);
  mockEpoch += 1;
  mockExpiry = null;
  s.rerender(<AdminFacilityDocuments />);
  await act(async () => finish(reviewed));
  expect(s.queryByText(/Review recorded/)).toBeNull();
  expect(s.queryByLabelText("Document review confirmation")).toBeNull();
});

const PREVIOUS = "444444444444444444444444";
const interrupted = {
  assetId: ID,
  code: "REVOKED_CLEANUP_RECHECK_REQUIRED",
  instruction: "Interrupted cleanup",
  cleanupClaim: { reviewId: "555555555555555555555555", executionId: PREVIOUS }
};
const handoffPhrase = `REASSIGN REVOKED ${ID} ${PREVIOUS}`;
async function openHandoff() {
  mock(api.readDocumentRecovery).mockResolvedValue({
    rows: [interrupted],
    nextAfterId: null
  });
  mock(api.reassignDocumentCleanup).mockResolvedValue({
    reviewId: REVIEW,
    executionId: EXEC,
    released: false
  });
  const s = render(<AdminFacilityDocuments />);
  fireEvent.press(s.getByText("Open / refresh document review"));
  fireEvent.press(await s.findByText("Review cleanup reassignment"));
  return s;
}
test("opening and canceling handoff never mutates or asks for manually entered IDs", async () => {
  const s = await openHandoff();
  expect(s.getByText(/To reassign only, type:/)).toHaveTextContent(
    `To reassign only, type: ${handoffPhrase}`
  );
  fireEvent.press(s.getByText("Cancel reassignment"));
  expect(s.queryByLabelText("Cleanup reassignment confirmation")).toBeNull();
  expect(api.reassignDocumentCleanup).not.toHaveBeenCalled();
  expect(api.newDocumentControlId).not.toHaveBeenCalled();
  expect(api.cleanupReviewedDocument).not.toHaveBeenCalled();
});
test("handoff and removal require two different deliberate confirmations and reuse successor IDs", async () => {
  const s = await openHandoff();
  fireEvent.changeText(s.getByLabelText("Cleanup reassignment confirmation"), "yes");
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  expect(api.reassignDocumentCleanup).not.toHaveBeenCalled();
  fireEvent.changeText(
    s.getByLabelText("Cleanup reassignment confirmation"),
    handoffPhrase
  );
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  await s.findByText(/Cleanup reassigned\./);
  expect(api.reassignDocumentCleanup).toHaveBeenCalledWith(
    ID,
    PREVIOUS,
    REVIEW,
    EXEC,
    handoffPhrase
  );
  expect(api.cleanupReviewedDocument).not.toHaveBeenCalled();
  expect(s.getByLabelText("Document review confirmation")).toHaveProp("value", "");
  fireEvent.press(s.getByText("Permanently remove reviewed revoked copy"));
  expect(api.cleanupReviewedDocument).not.toHaveBeenCalled();
  const phrase = `DELETE REVOKED ${ID} ${REVIEW}`;
  fireEvent.changeText(s.getByLabelText("Document review confirmation"), phrase);
  fireEvent.press(s.getByText("Permanently remove reviewed revoked copy"));
  await s.findByText(/Server confirmed removal/);
  expect(api.cleanupReviewedDocument).toHaveBeenCalledWith(ID, REVIEW, EXEC, phrase);
  expect(api.newDocumentControlId).toHaveBeenCalledTimes(2);
  expect(s.queryByText("Review cleanup reassignment")).toBeNull();
});
test("lost handoff response retains payload through refresh, blocks switching and permits exact retry", async () => {
  const s = await openHandoff();
  mock(api.reassignDocumentCleanup).mockRejectedValueOnce(new Error("lost"));
  fireEvent.changeText(
    s.getByLabelText("Cleanup reassignment confirmation"),
    handoffPhrase
  );
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  await s.findByText(/Not confirmed/);
  fireEvent.press(s.getByText("Cancel reassignment"));
  expect(s.getByLabelText("Cleanup reassignment confirmation")).toBeTruthy();
  mock(api.readDocumentRecovery).mockResolvedValue({
    rows: [{ ...interrupted, assetId: "666666666666666666666666" }],
    nextAfterId: null
  });
  fireEvent.press(s.getByText("Open / refresh document review"));
  await waitFor(() => expect(s.queryByText("Checking…")).toBeNull());
  fireEvent.press(s.getByText("Review cleanup reassignment"));
  expect(s.getByText(/To reassign only, type:/)).toHaveTextContent(
    `To reassign only, type: ${handoffPhrase}`
  );
  fireEvent.changeText(
    s.getByLabelText("Cleanup reassignment confirmation"),
    handoffPhrase
  );
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  await s.findByText(/Cleanup reassigned\./);
  expect(api.reassignDocumentCleanup).toHaveBeenCalledTimes(2);
  for (const call of mock(api.reassignDocumentCleanup).mock.calls)
    expect(call).toEqual([ID, PREVIOUS, REVIEW, EXEC, handoffPhrase]);
  expect(api.newDocumentControlId).toHaveBeenCalledTimes(2);
});
test.each(["resolve", "reject"])(
  "in-flight handoff is single flight; account change discards late %s",
  async (outcome) => {
    const s = await openHandoff();
    let resolve!: (value: any) => void, reject!: (reason: Error) => void;
    mock(api.reassignDocumentCleanup).mockImplementation(
      () =>
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        })
    );
    fireEvent.changeText(
      s.getByLabelText("Cleanup reassignment confirmation"),
      handoffPhrase
    );
    fireEvent.press(s.getByText("Confirm cleanup reassignment"));
    fireEvent.press(s.getByText("Confirm cleanup reassignment"));
    expect(api.reassignDocumentCleanup).toHaveBeenCalledTimes(1);
    expect(s.getByLabelText("Cleanup reassignment confirmation")).toHaveProp(
      "editable",
      false
    );
    mockEpoch++;
    mockIdentityEpoch++;
    s.rerender(<AdminFacilityDocuments />);
    await act(async () =>
      outcome === "resolve"
        ? resolve({ reviewId: REVIEW, executionId: EXEC, released: false })
        : reject(new Error("denied"))
    );
    expect(s.queryByText(/Cleanup reassigned\./)).toBeNull();
    expect(s.queryByText(/Not confirmed/)).toBeNull();
    expect(s.queryByLabelText("Cleanup reassignment confirmation")).toBeNull();
    expect(api.cleanupReviewedDocument).not.toHaveBeenCalled();
  }
);
test("passkey expiry hides metadata; same-account reverification retains uncertain request references", async () => {
  const s = await openHandoff();
  let resolve!: (value: any) => void;
  mock(api.reassignDocumentCleanup).mockImplementationOnce(
    () =>
      new Promise((yes) => {
        resolve = yes;
      })
  );
  fireEvent.changeText(
    s.getByLabelText("Cleanup reassignment confirmation"),
    handoffPhrase
  );
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  mockEpoch++;
  mockExpiry = null;
  s.rerender(<AdminFacilityDocuments />);
  expect(s.queryByText("Interrupted cleanup")).toBeNull();
  await act(async () =>
    resolve({ reviewId: REVIEW, executionId: EXEC, released: false })
  );
  mockEpoch++;
  mockExpiry = new Date(Date.now() + 60000).toISOString();
  s.rerender(<AdminFacilityDocuments />);
  expect(s.queryByText(/Cleanup reassigned\./)).toBeNull();
  fireEvent.changeText(
    s.getByLabelText("Cleanup reassignment confirmation"),
    handoffPhrase
  );
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  await s.findByText(/Cleanup reassigned\./);
  expect(mock(api.reassignDocumentCleanup).mock.calls[1]).toEqual(
    mock(api.reassignDocumentCleanup).mock.calls[0]
  );
  expect(api.newDocumentControlId).toHaveBeenCalledTimes(2);
});
test("server-reported completed retry offers no further removal", async () => {
  const s = await openHandoff();
  mock(api.reassignDocumentCleanup).mockResolvedValue({
    reviewId: REVIEW,
    executionId: EXEC,
    released: true
  });
  fireEvent.changeText(
    s.getByLabelText("Cleanup reassignment confirmation"),
    handoffPhrase
  );
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  await s.findByText(/already complete/);
  expect(s.queryByText("Permanently remove reviewed revoked copy")).toBeNull();
  expect(api.cleanupReviewedDocument).not.toHaveBeenCalled();
});
test("an expired proof at click time cannot submit even before another render", async () => {
  const s = await openHandoff();
  fireEvent.changeText(
    s.getByLabelText("Cleanup reassignment confirmation"),
    handoffPhrase
  );
  mockExpiry = new Date(Date.now() - 1000).toISOString();
  fireEvent.press(s.getByText("Confirm cleanup reassignment"));
  expect(api.reassignDocumentCleanup).not.toHaveBeenCalled();
});
