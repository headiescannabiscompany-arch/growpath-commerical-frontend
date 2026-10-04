import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import { ApiError } from "@/api/apiRequest";
import FeedbackScreen from "@/app/feedback";
import TestimonialReviewPanel from "@/components/admin/TestimonialReviewPanel";
import PublicTestimonials from "@/components/marketing/PublicTestimonials";

const mockPolicy = jest.fn();
const mockMine = jest.fn();
const mockPreview = jest.fn();
const mockSubmit = jest.fn();
const mockWithdraw = jest.fn();
const mockAdmin = jest.fn();
const mockReview = jest.fn();
const mockPublic = jest.fn();
const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockPermission = jest.fn();
const mockPicker = jest.fn();
let mockAuth: any;
let mockCounter = 0;
jest.mock("@/auth/AuthContext", () => ({ useOptionalAuth: () => mockAuth }));
jest.mock("expo-router", () => ({ Link: ({ children }: any) => children }));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "images" },
  requestMediaLibraryPermissionsAsync: (...args: any[]) => mockPermission(...args),
  launchImageLibraryAsync: (...args: any[]) => mockPicker(...args)
}));
jest.mock("@/components/testimonials/PrivateTestimonialPhoto", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onReady }: any) =>
    React.createElement(
      Pressable,
      { accessibilityRole: "button", onPress: () => onReady?.(true) },
      React.createElement(Text, null, "Confirm exact photo loaded")
    );
});
jest.mock("@/api/testimonials", () => ({
  TESTIMONIAL_STATUSES: [
    "private",
    "pending_review",
    "published",
    "rejected",
    "hidden",
    "withdrawn"
  ],
  getTestimonialPolicy: (...args: any[]) => mockPolicy(...args),
  getMyTestimonials: (...args: any[]) => mockMine(...args),
  previewTestimonial: (...args: any[]) => mockPreview(...args),
  submitTestimonial: (...args: any[]) => mockSubmit(...args),
  withdrawTestimonial: (...args: any[]) => mockWithdraw(...args),
  getAdminTestimonials: (...args: any[]) => mockAdmin(...args),
  reviewTestimonial: (...args: any[]) => mockReview(...args),
  getPublicTestimonials: (...args: any[]) => mockPublic(...args),
  uploadTestimonialPhoto: (...args: any[]) => mockUpload(...args),
  removeTestimonialPhoto: (...args: any[]) => mockRemove(...args),
  newTestimonialRequestId: () => `request-${++mockCounter}`
}));
const policy = {
  version: "v1",
  statement: "I allow exact publication, separately from AI or advertising.",
  minFeedbackLength: 10,
  maxFeedbackLength: 1500,
  minPublicNameLength: 2,
  maxPublicNameLength: 80,
  maxPhotos: 1
};
const row = (extra: any = {}) => ({
  id: "one",
  clientSubmissionId: "request-1",
  publicName: "Chosen name",
  feedbackText: "My genuine words about my journal.",
  photoEvidenceAssetId: null,
  photoSourceVersion: null,
  contentDigest: "digest-1",
  consentVersion: "v1",
  consent: { granted: true, version: "v1" },
  status: "pending_review",
  isCurrent: true,
  synthetic: false,
  revision: 1,
  ...extra
});
const preview = (extra: any = {}) => ({
  publicName: "Canonical name",
  feedbackText: "Canonical exact words from preview.",
  photoEvidenceAssetId: null,
  photoSourceVersion: null,
  contentDigest: "preview-1",
  consentVersion: "v1",
  ...extra
});
function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function handler(node: any) {
  let current = node;
  while (current && typeof current.props.onPress !== "function") current = current.parent;
  if (!current) throw new Error("No handler");
  return current.props.onPress;
}
async function settle(request: ReturnType<typeof deferred>, value: any) {
  await act(async () => {
    request.resolve(value);
  });
}
async function ownerForm() {
  render(<FeedbackScreen />);
  await screen.findByLabelText("Chosen public name");
  fireEvent.changeText(screen.getByLabelText("Chosen public name"), "Typed name");
  fireEvent.changeText(
    screen.getByLabelText("Your feedback"),
    "My actual words about using the app."
  );
}
async function ownerPreview() {
  await ownerForm();
  fireEvent.press(screen.getByText("Preview exact submission"));
  await screen.findByText("Canonical exact words from preview.");
}
async function adminSelected(extra: any = {}) {
  mockAdmin.mockResolvedValue({ submissions: [row(extra)], nextCursor: null });
  render(<TestimonialReviewPanel authorized />);
  fireEvent.press(await screen.findByLabelText("Review feedback from Chosen name"));
}

describe("genuine feedback owner and Admin workflows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCounter = 0;
    mockAuth = {
      user: { id: "owner-1", email: "private@example.test", role: "admin" },
      token: "session-1",
      isAuthed: true,
      isHydrating: false,
      meStatus: "ready"
    };
    mockPolicy.mockResolvedValue(policy);
    mockMine.mockResolvedValue({ current: null, history: [], nextCursor: null });
    mockPreview.mockResolvedValue(preview());
    mockSubmit.mockImplementation(async (input: any) => ({
      submission: row({
        publicName: input.publicName,
        feedbackText: input.feedbackText,
        consent: input.consent,
        status: input.consent.granted ? "pending_review" : "private"
      }),
      replayed: false
    }));
    mockWithdraw.mockResolvedValue(row({ status: "withdrawn", isCurrent: false }));
    mockAdmin.mockResolvedValue({ submissions: [row()], nextCursor: null });
    mockReview.mockImplementation(async (record: any, action: string) =>
      row({
        ...record,
        status: { publish: "published", reject: "rejected", hide: "hidden" }[action]
      })
    );
    mockPublic.mockResolvedValue([]);
    mockPermission.mockResolvedValue({ granted: true });
    mockPicker.mockResolvedValue({ canceled: true });
    mockUpload.mockImplementation(async (draft: any) => {
      draft.evidenceId = "photo-1";
      return "photo-1";
    });
    mockRemove.mockResolvedValue({});
    jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove: jest.fn() });
  });
  afterEach(() => jest.restoreAllMocks());

  it("keeps owner reads pending and single-flight without fabricating an empty form", async () => {
    const request = deferred();
    mockMine.mockReturnValue(request.promise);
    render(<FeedbackScreen />);
    expect(screen.queryByLabelText("Chosen public name")).toBeNull();
    expect(screen.getByLabelText("Refresh my feedback")).toBeDisabled();
    await act(async () => {
      handler(screen.getByLabelText("Refresh my feedback"))();
      handler(screen.getByLabelText("Refresh my feedback"))();
    });
    expect(mockMine).toHaveBeenCalledTimes(1);
    await settle(request, { current: null, history: [], nextCursor: null });
    expect(screen.getByLabelText("Chosen public name")).toBeTruthy();
  });
  it.each([
    "signed-out",
    "hydrating",
    "missing-account",
    "me-loading",
    "me-error",
    "me-idle",
    "missing-token"
  ])("does not load or mutate for %s", (state) => {
    if (state === "signed-out") mockAuth.isAuthed = false;
    if (state === "hydrating") mockAuth.isHydrating = true;
    if (state === "missing-account") mockAuth.user = null;
    if (state === "missing-token") mockAuth.token = null;
    if (state.startsWith("me-")) mockAuth.meStatus = state.slice(3);
    render(<FeedbackScreen />);
    expect(mockMine).not.toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
  it("shows read failure with Retry, not an empty/new submission form", async () => {
    mockMine.mockRejectedValueOnce(new Error("offline"));
    render(<FeedbackScreen />);
    await screen.findByText(/records could not be loaded/);
    expect(screen.queryByLabelText("Chosen public name")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh my feedback"));
    await screen.findByLabelText("Chosen public name");
  });
  it("retries identity verification without reading feedback while /me is unready", async () => {
    const request = deferred();
    mockAuth.meStatus = "error";
    mockAuth.retryMe = jest.fn().mockReturnValue(request.promise);
    render(<FeedbackScreen />);
    const retry = handler(screen.getByText("Retry account"));
    await act(async () => {
      retry();
      retry();
    });
    expect(mockAuth.retryMe).toHaveBeenCalledTimes(1);
    expect(mockMine).not.toHaveBeenCalled();
    await settle(request, undefined);
  });
  it("does not transfer ownership or clear drafts when only the selected workspace changes", async () => {
    await ownerForm();
    mockAuth = { ...mockAuth, ctx: { mode: "facility", facilityId: "facility-2" } };
    screen.rerender(<FeedbackScreen />);
    expect(screen.getByDisplayValue("My actual words about using the app.")).toBeTruthy();
    expect(mockMine).toHaveBeenCalledTimes(1);
  });
  it("defaults consent unchecked and submits exactly the server preview privately", async () => {
    await ownerPreview();
    expect(
      screen.getByLabelText("Allow publication of this exact preview")
    ).not.toBeChecked();
    fireEvent.press(screen.getByText("Submit private feedback"));
    await screen.findByText(
      "Private feedback saved. You did not give publication permission."
    );
    expect(mockSubmit.mock.calls[0][0]).toEqual({
      clientSubmissionId: "request-1",
      publicName: "Canonical name",
      feedbackText: "Canonical exact words from preview.",
      photoEvidenceAssetId: null,
      previewDigest: "preview-1",
      consent: { granted: false, version: "v1" }
    });
    expect(screen.queryByLabelText("Chosen public name")).toBeNull();
  });
  it("lets the individual choose optional publication, without automatic publication", async () => {
    await ownerPreview();
    fireEvent.press(screen.getByLabelText("Allow publication of this exact preview"));
    fireEvent.press(screen.getByText("Submit for Admin review"));
    await screen.findByText(
      "Feedback submitted for Admin review. Nothing is published automatically."
    );
    expect(mockSubmit.mock.calls[0][0].consent.granted).toBe(true);
  });
  it("editing invalidates consent/preview and a captured old submit handler", async () => {
    await ownerPreview();
    fireEvent.press(screen.getByLabelText("Allow publication of this exact preview"));
    const oldSubmit = handler(screen.getByText("Submit for Admin review"));
    fireEvent.changeText(
      screen.getByLabelText("Your feedback"),
      "I changed my exact words."
    );
    await act(async () => oldSubmit());
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Allow publication of this exact preview")).toBeNull();
    fireEvent.press(screen.getByText("Preview exact submission"));
    await screen.findByLabelText("Allow publication of this exact preview");
    expect(
      screen.getByLabelText("Allow publication of this exact preview")
    ).not.toBeChecked();
  });
  it("locks duplicate submit synchronously and retains an exact retry request after uncertainty", async () => {
    const request = deferred();
    mockSubmit.mockReturnValueOnce(request.promise);
    await ownerPreview();
    const submit = handler(screen.getByText("Submit private feedback"));
    await act(async () => {
      submit();
      submit();
    });
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    await act(async () => request.reject(new Error("lost receipt")));
    const first = mockSubmit.mock.calls[0][0];
    expect(screen.getByLabelText("Chosen public name")).toBeDisabled();
    fireEvent.press(screen.getByText("Retry exact submission"));
    await screen.findByText(
      "Private feedback saved. You did not give publication permission."
    );
    expect(mockSubmit.mock.calls[1][0]).toEqual(first);
  });
  it.each([
    "TESTIMONIAL_PHOTO_UNAVAILABLE",
    "TESTIMONIAL_PHOTO_CHANGED",
    "TESTIMONIAL_PREVIEW_CHANGED"
  ])("lets a confirmed %s rejection recover without carrying old consent", async (code) => {
    mockPicker.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///photo.jpg" }] });
    mockPreview.mockResolvedValue(
      preview({ photoEvidenceAssetId: "photo-1", photoSourceVersion: "generation-1" })
    );
    mockSubmit.mockRejectedValueOnce(new ApiError(code, 409));
    await ownerForm();
    const draftText = screen.getByLabelText("Your feedback").props.value;
    fireEvent.press(screen.getByText("Add optional photo"));
    await screen.findByText("Protected photo ready for preview.");
    fireEvent.press(screen.getByText("Preview exact submission"));
    await screen.findByLabelText("Allow publication of this exact preview");
    fireEvent.press(screen.getByText("Confirm exact photo loaded"));
    fireEvent.press(screen.getByLabelText("Allow publication of this exact preview"));
    const oldSubmit = handler(screen.getByText("Submit for Admin review"));
    fireEvent.press(screen.getByText("Submit for Admin review"));
    await screen.findByText(/The server rejected this preview/);
    expect(screen.queryByText("Retry exact submission")).toBeNull();
    expect(screen.getByLabelText("Your feedback").props.value).toBe(draftText);
    expect(screen.getByLabelText("Your feedback")).not.toBeDisabled();
    expect(screen.getByText("Remove draft photo")).not.toBeDisabled();
    expect(screen.queryByLabelText("Allow publication of this exact preview")).toBeNull();
    await act(async () => oldSubmit());
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText("Remove draft photo"));
    await screen.findByText("Photo removed from this draft. Nothing was published.");
    expect(mockRemove).toHaveBeenCalledWith("photo-1", expect.any(AbortSignal));
    mockPreview.mockResolvedValue(preview());
    fireEvent.press(screen.getByText("Preview exact submission"));
    await screen.findByLabelText("Allow publication of this exact preview");
    expect(screen.getByLabelText("Allow publication of this exact preview")).not.toBeChecked();
    fireEvent.press(screen.getByText("Submit private feedback"));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(2));
    expect(mockSubmit.mock.calls[1][0].clientSubmissionId).not.toBe(
      mockSubmit.mock.calls[0][0].clientSubmissionId
    );
    expect(mockSubmit.mock.calls[1][0].consent.granted).toBe(false);
    expect(mockSubmit.mock.calls[1][0].photoEvidenceAssetId).toBeNull();
  });
  it.each([
    [409, "TESTIMONIAL_PHOTO_BUSY"],
    [409, "TESTIMONIAL_REQUEST_CONFLICT"],
    [500, "TESTIMONIAL_PHOTO_UNAVAILABLE"],
    [null, "NETWORK_ERROR"]
  ])("keeps the exact retry for non-definitive %s/%s failures", async (status, code) => {
    mockSubmit.mockRejectedValueOnce(new ApiError(String(code), status as number | null));
    await ownerPreview();
    fireEvent.press(screen.getByText("Submit private feedback"));
    await screen.findByText("Retry exact submission");
    expect(screen.getByLabelText("Your feedback")).toBeDisabled();
    fireEvent.press(screen.getByText("Retry exact submission"));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(2));
    expect(mockSubmit.mock.calls[1][0]).toEqual(mockSubmit.mock.calls[0][0]);
  });
  it("resolves a withdrawn idempotent receipt as history without reviving it", async () => {
    mockSubmit.mockResolvedValue({
      submission: row({ isCurrent: false, status: "withdrawn" }),
      replayed: true
    });
    await ownerPreview();
    fireEvent.press(screen.getByText("Submit private feedback"));
    await screen.findByText(
      "The earlier submission was saved and has already been withdrawn. It was not submitted again."
    );
    expect(screen.queryByText("Your current feedback")).toBeNull();
    expect(screen.getByText("Withdrawal history")).toBeTruthy();
  });
  it("resolves an uncertain submission found withdrawn in the next owner read", async () => {
    mockSubmit.mockRejectedValue(new Error("unknown outcome"));
    await ownerPreview();
    fireEvent.press(screen.getByText("Submit private feedback"));
    await screen.findByText("Retry exact submission");
    mockMine.mockResolvedValue({
      current: null,
      history: [
        row({ clientSubmissionId: "request-1", status: "withdrawn", isCurrent: false })
      ],
      nextCursor: null
    });
    fireEvent.press(screen.getByLabelText("Refresh my feedback"));
    await screen.findByText(
      "The earlier submission was saved and has already been withdrawn. It was not submitted again."
    );
    expect(screen.queryByText("Retry exact submission")).toBeNull();
    expect(screen.getByLabelText("Chosen public name")).not.toBeDisabled();
  });
  it("discards late owner read when the account/session changes", async () => {
    const old = deferred();
    mockMine.mockReturnValueOnce(old.promise);
    const mounted = render(<FeedbackScreen />);
    mockAuth = {
      ...mockAuth,
      user: { id: "owner-2", email: "new@example.test" },
      token: "session-2"
    };
    mounted.rerender(<FeedbackScreen />);
    await screen.findByLabelText("Chosen public name");
    await settle(old, {
      current: row({ publicName: "Old account private name" }),
      history: [],
      nextCursor: null
    });
    expect(screen.queryByText("Old account private name")).toBeNull();
  });
  it("blocks captured old-context preview and submit handlers even after ABA account return", async () => {
    await ownerPreview();
    const old = handler(screen.getByText("Submit private feedback"));
    const original = mockAuth;
    const instance = screen;
    mockAuth = { ...original, token: "session-2" };
    instance.rerender(<FeedbackScreen />);
    await screen.findByLabelText("Chosen public name");
    mockAuth = original;
    instance.rerender(<FeedbackScreen />);
    await screen.findByLabelText("Chosen public name");
    await act(async () => old());
    expect(mockSubmit).not.toHaveBeenCalled();
  });
  it("preserves typed words on a same-account failed Refresh but gates submission", async () => {
    await ownerForm();
    mockMine.mockRejectedValueOnce(new Error("offline"));
    fireEvent.press(screen.getByLabelText("Refresh my feedback"));
    await screen.findByText(/records could not be loaded/);
    expect(screen.queryByText("Preview exact submission")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh my feedback"));
    await screen.findByDisplayValue("My actual words about using the app.");
  });
  it("withdraws only after an explicit separate confirmation", async () => {
    mockMine.mockResolvedValue({ current: row(), history: [], nextCursor: null });
    render(<FeedbackScreen />);
    await screen.findByText("Your current feedback");
    expect(screen.getByText("Withdraw feedback")).toBeDisabled();
    fireEvent.press(screen.getByRole("checkbox"));
    fireEvent.press(screen.getByText("Withdraw feedback"));
    await screen.findByText(/Feedback withdrawn/);
    expect(mockWithdraw).toHaveBeenCalledWith("one", 1, expect.any(AbortSignal));
    expect(screen.getByText("Withdrawal history")).toBeTruthy();
  });
  it("requests one original optional photo without EXIF and requires the sanitized preview to load", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///photo.jpg", mimeType: "image/jpeg", fileSize: 9000000 }]
    });
    mockPreview.mockResolvedValue(
      preview({ photoEvidenceAssetId: "photo-1", photoSourceVersion: "generation-1" })
    );
    await ownerForm();
    fireEvent.press(screen.getByText("Add optional photo"));
    await screen.findByText("Protected photo ready for preview.");
    expect(mockPicker.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        exif: false,
        quality: 1,
        allowsMultipleSelection: false,
        selectionLimit: 1,
        allowsEditing: false
      })
    );
    fireEvent.press(screen.getByText("Preview exact submission"));
    await screen.findByText("Canonical exact words from preview.");
    expect(screen.getByText("Submit private feedback")).toBeDisabled();
    fireEvent.press(screen.getByText("Confirm exact photo loaded"));
    fireEvent.press(screen.getByText("Submit private feedback"));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    expect(mockSubmit.mock.calls[0][0].photoEvidenceAssetId).toBe("photo-1");
  });
  it("does not upload a selected photo after account change", async () => {
    const picker = deferred();
    mockPicker.mockReturnValue(picker.promise);
    await ownerForm();
    fireEvent.press(screen.getByText("Add optional photo"));
    await waitFor(() => expect(mockPicker).toHaveBeenCalled());
    mockAuth = { ...mockAuth, token: "new-session" };
    screen.rerender(<FeedbackScreen />);
    await screen.findByLabelText("Chosen public name");
    await settle(picker, { canceled: false, assets: [{ uri: "file:///photo.jpg" }] });
    expect(mockUpload).not.toHaveBeenCalled();
  });
  it("removes only an unsubmitted photo and does not withdraw or publish", async () => {
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///photo.jpg" }]
    });
    await ownerForm();
    fireEvent.press(screen.getByText("Add optional photo"));
    await screen.findByText("Protected photo ready for preview.");
    fireEvent.press(screen.getByText("Remove draft photo"));
    await screen.findByText("Photo removed from this draft. Nothing was published.");
    expect(mockRemove).toHaveBeenCalledWith("photo-1", expect.any(AbortSignal));
    expect(mockWithdraw).not.toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
  it.each(["unauthorized", "non-admin", "hydrating", "me-error"])(
    "does not expose Admin review when %s",
    (state) => {
      if (state === "non-admin") mockAuth.user.role = "user";
      if (state === "hydrating") mockAuth.isHydrating = true;
      if (state === "me-error") mockAuth.meStatus = "error";
      const result = render(
        <TestimonialReviewPanel authorized={state !== "unauthorized"} />
      );
      expect(result.toJSON()).toBeNull();
      expect(mockAdmin).not.toHaveBeenCalled();
    }
  );
  it("publishes only after exact-version and public-audience review, without changing submitted text", async () => {
    await adminSelected();
    expect(screen.getByText("Publish exact submission")).toBeDisabled();
    expect(screen.queryByLabelText("Chosen public name")).toBeNull();
    fireEvent.press(screen.getByLabelText("I reviewed the exact submitted version"));
    expect(screen.getByText("Publish exact submission")).toBeDisabled();
    fireEvent.press(
      screen.getByLabelText("Approve this exact content for the public audience")
    );
    fireEvent.press(screen.getByText("Publish exact submission"));
    await screen.findByText("Review confirmed: published.");
    expect(mockReview).toHaveBeenCalledWith(
      expect.objectContaining({ contentDigest: "digest-1", revision: 1 }),
      "publish",
      "",
      true,
      expect.any(AbortSignal)
    );
  });
  it("keeps publication gated until the exact protected photo loads", async () => {
    await adminSelected({
      photoEvidenceAssetId: "photo-1",
      photoSourceVersion: "generation-1"
    });
    fireEvent.press(screen.getByLabelText("I reviewed the exact submitted version"));
    fireEvent.press(
      screen.getByLabelText("Approve this exact content for the public audience")
    );
    expect(screen.getByText("Publish exact submission")).toBeDisabled();
    fireEvent.press(screen.getByText("Confirm exact photo loaded"));
    expect(screen.getByText("Publish exact submission")).not.toBeDisabled();
  });
  it("requires a reason for rejection, and does not require publication consent", async () => {
    await adminSelected();
    fireEvent.press(screen.getByLabelText("I reviewed the exact submitted version"));
    expect(screen.getByText("Reject submission")).toBeDisabled();
    fireEvent.changeText(
      screen.getByLabelText("Internal testimonial review reason"),
      "Private operational detail"
    );
    fireEvent.press(screen.getByText("Reject submission"));
    await screen.findByText("Review confirmed: rejected.");
    expect(mockReview.mock.calls[0][1]).toBe("reject");
  });
  it("offers no publish control for private feedback or restore control for withdrawn feedback", async () => {
    await adminSelected({
      status: "private",
      consent: { granted: false, version: "v1" }
    });
    expect(screen.queryByText("Publish exact submission")).toBeNull();
    expect(
      screen.getByText("This status has no publication or editing action.")
    ).toBeTruthy();
  });
  it("retains rows after review read failure but requires recovery before acting", async () => {
    await adminSelected();
    mockAdmin.mockRejectedValueOnce(new Error("offline"));
    fireEvent.press(screen.getByLabelText("Refresh feedback review"));
    await screen.findByText(/Feedback review could not be loaded/);
    expect(screen.getByText("Publish exact submission")).toBeDisabled();
    expect(screen.queryByText("No pending review feedback submissions.")).toBeNull();
  });
  it("clears review confirmations after uncertain write and will not blindly repeat", async () => {
    mockReview.mockRejectedValue(new Error("unknown outcome"));
    await adminSelected();
    fireEvent.press(screen.getByLabelText("I reviewed the exact submitted version"));
    fireEvent.press(
      screen.getByLabelText("Approve this exact content for the public audience")
    );
    const action = handler(screen.getByText("Publish exact submission"));
    await act(async () => {
      action();
      action();
    });
    await screen.findByText(/review action could not be confirmed/);
    await act(async () => action());
    expect(mockReview).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Publish exact submission")).toBeDisabled();
  });
  it("ignores late Admin responses and captured row handlers after role/account changes", async () => {
    const request = deferred();
    mockAdmin.mockReturnValueOnce(request.promise);
    const instance = render(<TestimonialReviewPanel authorized />);
    mockAuth = { ...mockAuth, user: { id: "other", role: "user" }, token: "other" };
    instance.rerender(<TestimonialReviewPanel authorized />);
    await settle(request, { submissions: [row()], nextCursor: null });
    expect(instance.toJSON()).toBeNull();
    expect(mockReview).not.toHaveBeenCalled();
  });
  it("labels synthetic review receipts as excluded from public testimonials", async () => {
    await adminSelected({ synthetic: true });
    fireEvent.press(screen.getByLabelText("I reviewed the exact submitted version"));
    fireEvent.press(
      screen.getByLabelText("Approve this exact content for the public audience")
    );
    fireEvent.press(screen.getByText("Publish exact submission"));
    await screen.findByText(
      "Review confirmed: published. Synthetic QA feedback remains excluded from public testimonials."
    );
  });

  it("renders no invented public proof when the confirmed list is empty", async () => {
    const result = render(<PublicTestimonials />);
    await waitFor(() => expect(mockPublic).toHaveBeenCalledTimes(1));
    expect(result.toJSON()).toBeNull();
  });
  it("clears public words and photos when refresh fails, and can retry", async () => {
    const entry = {
      publicId: "public-1",
      publicName: "Public grower",
      quote: "Actual approved words",
      photo: null,
      publishedAt: "2026-10-04"
    };
    mockPublic
      .mockResolvedValueOnce([entry])
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([entry]);
    render(<PublicTestimonials />);
    await screen.findByText("Actual approved words");
    fireEvent.press(screen.getByLabelText("Refresh public feedback"));
    await screen.findByText("Feedback is temporarily unavailable.");
    expect(screen.queryByText("Actual approved words")).toBeNull();
    fireEvent.press(screen.getByLabelText("Refresh public feedback"));
    await screen.findByText("Actual approved words");
  });
  it("withdraws visible proof if its controlled photo becomes unavailable", async () => {
    mockPublic.mockResolvedValue([
      {
        publicId: "public-1",
        publicName: "Public grower",
        quote: "Actual approved words",
        photo: {
          url: "https://api.example.test/api/public/testimonials/public-1/photo",
          alt: "Approved photo"
        },
        publishedAt: "2026-10-04"
      }
    ]);
    render(<PublicTestimonials />);
    await screen.findByLabelText("Approved photo");
    fireEvent(screen.getByLabelText("Approved photo"), "error");
    expect(screen.queryByText("Actual approved words")).toBeNull();
    expect(screen.getByText("Feedback is temporarily unavailable.")).toBeTruthy();
  });
  it("cleans the AppState subscription and ignores a late public read after unmount", async () => {
    const request = deferred();
    mockPublic.mockReturnValue(request.promise);
    const remove = jest.fn();
    jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove });
    const result = render(<PublicTestimonials />);
    result.unmount();
    await settle(request, []);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
