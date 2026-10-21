/** @jest-environment jsdom */
// 06U: only the new page/outlet/root/attempt joins; no old suite reruns.
import React, { useContext } from "react";
import { Platform, View } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import Entry, {
  InternalCourseGiftEntryBoundary
} from "@/components/courseGifts/CourseGiftCourseEntry";
import { InternalCourseGiftWebContext } from "@/components/courseGifts/CourseGiftWebScreen";
import { suppressCourseGiftDiagnostic } from "@/utils/courseGiftDiagnosticPrivacy";
import CourseDetailScreen from "@/screens/CourseDetailScreen";
import CommercialCourseDetailRoute from "@/app/home/commercial/courses/[courseId]";

const COURSE = "a".repeat(24),
  USER = "b".repeat(24),
  OTHER = "c".repeat(24);
const ATTEMPT = "a0000000-0000-4000-8000-000000000001";
const HASH = "d".repeat(64);
let mockAuth: any, mockEntitlements: any, mockFacility: any, mockCourse: any;
const mockApi = jest.fn(),
  mockReadCourse = jest.fn(),
  mockNavigate = jest.fn();
const mockMutation = jest.fn();
const mockCommercialRead = jest.fn();
const mockRouter = { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
const mockNavigation = { isReady: () => true, addListener: () => () => undefined };
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/courses",
  useGlobalSearchParams: () => ({}),
  useNavigationContainerRef: () => mockNavigation,
  useUnstableGlobalHref: () => "/courses",
  useLocalSearchParams: () => ({}),
  Link: ({ children }: any) => children
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({ useEntitlements: () => mockEntitlements }));
jest.mock("@/state/useFacility", () => ({ useFacility: () => mockFacility }));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => ({
    canViewCourses: true,
    canSeePaidCourses: true,
    canCreateCourses: true,
    canSellPaidCourses: true,
    canPublishCourses: true,
    maxLessonsPerCourse: 12
  })
}));
jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/components/sharing/PublicShareActions", () => () => null);
jest.mock("@/components/learning/LessonMediaCard", () => () => null);
jest.mock("@/components/learning/AuthorizedCourseImage", () => () => null);
jest.mock("@/components/learning/LessonMediaSourceEditor", () => () => null);
jest.mock("@/components/videos/VideoLibraryPicker", () => () => null);
jest.mock(
  "@/components/layout/AppPage",
  () =>
    ({ children }: any) =>
      children
);
jest.mock("@/api/commercialWorkflows", () => ({
  fetchCommercialCourse: (...args: any[]) => mockCommercialRead(...args),
  fetchProductLines: async () => [],
  addCommercialCourseLesson: (...args: any[]) => mockMutation(...args),
  archiveCommercialCourse: (...args: any[]) => mockMutation(...args),
  deleteCommercialCourseLesson: (...args: any[]) => mockMutation(...args),
  publishCommercialCourse: (...args: any[]) => mockMutation(...args),
  unpublishCommercialCourse: (...args: any[]) => mockMutation(...args),
  updateCommercialCourse: (...args: any[]) => mockMutation(...args),
  updateCommercialCourseLesson: (...args: any[]) => mockMutation(...args)
}));
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApi(...args),
  ApiError: class extends Error {}
}));
jest.mock("@/api/courses", () => ({
  getCourse: (...args: any[]) => mockReadCourse(...args),
  getEnrollmentStatus: async () => ({ enrolled: false }),
  getCourseLearnerNotes: async () => ({ notes: [] }),
  getReviews: async () => [],
  trackCourseView: async () => ({}),
  trackDropoff: async () => ({}),
  archiveCourse: (...args: any[]) => mockMutation(...args),
  enrollInCourse: (...args: any[]) => mockMutation(...args),
  completeLesson: (...args: any[]) => mockMutation(...args),
  publishCourse: (...args: any[]) => mockMutation(...args),
  saveCourseLearnerNote: (...args: any[]) => mockMutation(...args),
  sendWatchTime: (...args: any[]) => mockMutation(...args),
  unpublishCourse: (...args: any[]) => mockMutation(...args),
  updateCourse: (...args: any[]) => mockMutation(...args)
}));
jest.mock("@/api/coursePayments", () => ({
  getCoursePaymentStatus: async () => ({ paymentStatus: "not_started" }),
  startCourseCheckout: (...args: any[]) => mockMutation(...args),
  requestCourseRefund: (...args: any[]) => mockMutation(...args),
  openCourseDispute: (...args: any[]) => mockMutation(...args)
}));
jest.mock("@/api/reports", () => ({
  submitReport: (...args: any[]) => mockMutation(...args),
  exportCourseSales: (...args: any[]) => mockMutation(...args)
}));
jest.mock("@/api/grows", () => ({ listPersonalGrows: async () => [] }));
jest.mock("@/api/tasks", () => ({
  createPersonalTask: (...args: any[]) => mockMutation(...args)
}));
jest.mock("@/api/uploads", () => ({
  getCourseMediaAccessUrl: (...args: any[]) => mockMutation(...args)
}));

let records: Map<string, string>, storage: any, newId: jest.Mock, before: string;
const creatorReview = () => ({
  courseId: COURSE,
  canAccept: false,
  matchesPolicy: false,
  consent: null,
  policy: null
});
const quote = () => ({
  version: "course-gift-sale-review-v1",
  courseId: COURSE,
  checkoutAttemptId: ATTEMPT,
  recipientEmail: "recipient@example.invalid",
  reviewFingerprint: HASH,
  title: "Synthetic paid course",
  amountCents: 2500,
  currency: "usd",
  terms: {
    version: "synthetic-v1",
    expiry: "Synthetic expiry",
    duplicateAccess: "Manual review",
    courseUnavailable: "Manual review",
    refund: "Manual refund review"
  }
});
const giftCalls = () =>
  mockApi.mock.calls.filter(([url]) => url.startsWith("/api/course-gifts/"));
const hintKey = () => `course_gift_sale_v1:${USER}:${COURSE}:buyer`;
function seedHint(expired = false) {
  records.set(
    hintKey(),
    JSON.stringify({
      version: 1,
      userId: USER,
      expiresAt: Date.now() + (expired ? -1000 : 600000),
      value: {
        kind: "buyer",
        courseId: COURSE,
        attemptId: ATTEMPT,
        fingerprint: HASH,
        giftId: null
      }
    })
  );
}
function Root({ children }: { children: React.ReactNode }) {
  return (
    <InternalCourseGiftEntryBoundary
      storage={storage}
      newRequestId={newId}
      onNavigateToCheckout={mockNavigate}
    >
      {children}
    </InternalCourseGiftEntryBoundary>
  );
}
function outlet(mode: "buyer" | "creator" = "buyer", courseId = COURSE, eligible = true) {
  return (
    <Root>
      <Entry
        courseId={courseId}
        requestedCourseId={courseId}
        eligible={eligible}
        mode={mode}
      />
    </Root>
  );
}
function page() {
  return (
    <Root>
      <CourseDetailScreen route={{ params: { id: COURSE } }} />
    </Root>
  );
}
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
beforeEach(() => {
  process.env.NODE_ENV = "test";
  jest.replaceProperty(Platform, "OS", "web");
  mockAuth = {
    isAuthed: true,
    isHydrating: false,
    meStatus: "ready",
    token: "synthetic-token",
    user: { id: USER, emailVerified: true, plan: "pro", role: "user" }
  };
  mockEntitlements = {
    ready: true,
    mode: "personal",
    facilityId: null,
    facilityRole: null
  };
  mockFacility = { selectedId: null };
  mockCourse = {
    id: COURSE,
    title: "Synthetic paid course",
    userId: OTHER,
    isPublished: true,
    priceCents: 2500,
    lessons: []
  };
  mockReadCourse.mockImplementation(async () => mockCourse);
  mockCommercialRead.mockImplementation(async () => ({
    ...mockCourse,
    userId: USER,
    status: "draft",
    access: "paid",
    price: 25
  }));
  mockApi.mockImplementation(async (url: string) => {
    if (url.endsWith("creator/review")) return { success: true, data: creatorReview() };
    if (url.endsWith("buyer/review")) return { success: true, data: quote() };
    if (url.startsWith("/api/course-gifts/")) throw Error("Synthetic unavailable");
    return { sessionIds: [] };
  });
  records = new Map();
  storage = {
    getItem: jest.fn((key) => records.get(key) || null),
    setItem: jest.fn((key, value) => records.set(key, value))
  };
  newId = jest.fn(() => ATTEMPT);
  before = JSON.stringify([mockAuth, mockEntitlements, mockFacility]);
  const forbidden = () => {
    throw Error("No network in local entry checks");
  };
  for (const module of [http, https])
    for (const method of ["get", "request"] as const)
      jest.spyOn(module, method).mockImplementation(forbidden);
  if (typeof global.fetch === "function")
    jest.spyOn(global, "fetch").mockImplementation(forbidden);
});
afterEach(() => {
  cleanup();
  expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
  expect(mockMutation).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(giftCalls().every(([url]) => /\/(review|status)$/.test(url))).toBe(true);
  process.env.NODE_ENV = "development";
});

test.each(["buyer", "creator"] as const)(
  "06W unopened %s entry never places an empty string inside View",
  (mode) => {
    const screen = render(outlet(mode));
    for (const view of screen.UNSAFE_getAllByType(View)) {
      expect(React.Children.toArray(view.props.children)).not.toContain("");
    }
    expect(newId).not.toHaveBeenCalled();
    expect(giftCalls()).toHaveLength(0);
  }
);

test("06U actual shared page is inert under shipped/default root", async () => {
  const screen = render(<CourseDetailScreen route={{ params: { id: COURSE } }} />);
  await screen.findByText("Synthetic paid course");
  expect(screen.queryByText("Review gifting this course")).toBeNull();
  expect(giftCalls()).toHaveLength(0);
  expect(storage.getItem).not.toHaveBeenCalled();
  expect(JSON.stringify([mockAuth, mockEntitlements, mockFacility])).toBe(before);
});
test("06U shared buyer page opens existing form only on deliberate entry", async () => {
  const screen = render(page());
  await screen.findByText("Review gifting this course");
  expect(giftCalls()).toHaveLength(0);
  expect(newId).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Review gifting this course"));
  await flush();
  expect(screen.getByText("Review a course gift")).toBeTruthy();
  expect(newId).toHaveBeenCalledTimes(1);
  expect(giftCalls()).toHaveLength(0);
  expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(true);
  expect(JSON.stringify([mockAuth, mockEntitlements, mockFacility])).toBe(before);
});
test("06U shared draft owner can review consent without publishing or changing plan", async () => {
  Object.assign(mockCourse, { userId: USER, isPublished: false, priceCents: 0 });
  const screen = render(page());
  fireEvent.press(await screen.findByText("Review course gift settings"));
  await flush();
  expect(giftCalls()).toHaveLength(0);
  fireEvent.press(screen.getByText("Review current gift permission"));
  await flush();
  expect(giftCalls()).toHaveLength(1);
  expect(giftCalls()[0][0]).toBe("/api/course-gifts/creator/review");
  expect(
    screen.getByText("Approved gift terms are unavailable. New consent cannot be saved.")
  ).toBeTruthy();
});
test.each([
  "facility-source",
  "facility-id",
  "commercial-owner",
  "free-buyer",
  "unpublished-buyer",
  "wrong-id"
])("06U shared page with %s does not expose a gift entry", async (kind) => {
  if (kind === "facility-source") mockCourse.sourceType = "facility_course";
  if (kind === "facility-id") mockCourse.facilityId = OTHER;
  if (kind === "commercial-owner")
    Object.assign(mockCourse, { sourceType: "commercial_course", userId: USER });
  if (kind === "free-buyer") mockCourse.priceCents = 0;
  if (kind === "unpublished-buyer") mockCourse.isPublished = false;
  if (kind === "wrong-id") mockCourse.id = OTHER;
  const screen = render(page());
  await screen.findByText("Synthetic paid course");
  expect(screen.queryByText("Review gifting this course")).toBeNull();
  expect(screen.queryByText("Review course gift settings")).toBeNull();
  expect(newId).not.toHaveBeenCalled();
  expect(giftCalls()).toHaveLength(0);
});
test("06U failed actual course read never exposes a gift outlet", async () => {
  mockReadCourse.mockRejectedValue(Error("Synthetic unavailable"));
  const screen = render(page());
  await screen.findByText("Course unavailable");
  expect(screen.queryByText("Review gifting this course")).toBeNull();
  expect(giftCalls()).toHaveLength(0);
});
test.each([false, true])(
  "06U saved buyer attempt, expired=%s, never replaced on entry",
  async (expired) => {
    seedHint(expired);
    const original = records.get(hintKey());
    const screen = render(outlet());
    fireEvent.press(screen.getByText("Review gifting this course"));
    await flush();
    expect(newId).not.toHaveBeenCalled();
    expect(records.get(hintKey())).toBe(original);
    expect(screen.getByText("Review a course gift")).toBeTruthy();
    expect(giftCalls()).toHaveLength(0);
  }
);
test.each(["corrupt", "unreadable"])(
  "06U %s recovery blocks a replacement attempt",
  async (kind) => {
    if (kind === "corrupt") records.set(hintKey(), "not-json");
    else
      storage.getItem.mockImplementation(() => {
        throw Error("Synthetic storage denied");
      });
    const screen = render(outlet());
    fireEvent.press(screen.getByText("Review gifting this course"));
    await flush();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(newId).not.toHaveBeenCalled();
    expect(giftCalls()).toHaveLength(0);
    expect(screen.queryByText("Review a course gift")).toBeNull();
  }
);
test("06U rapid entry presses generate one opaque ID without writing storage", async () => {
  const screen = render(outlet());
  const button = screen.getByText("Review gifting this course");
  act(() => {
    fireEvent.press(button);
    fireEvent.press(button);
  });
  await flush();
  expect(newId).toHaveBeenCalledTimes(1);
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(giftCalls()).toHaveLength(0);
});
test.each([
  "token",
  "account",
  "workspace",
  "verification",
  "pending",
  "role",
  "facility-selection"
])("06U %s change immediately discards private form and suppression", async (kind) => {
  const screen = render(outlet());
  fireEvent.press(screen.getByText("Review gifting this course"));
  await flush();
  expect(screen.getByText("Review a course gift")).toBeTruthy();
  if (kind === "token") mockAuth.token = "synthetic-next";
  if (kind === "account") mockAuth.user.id = OTHER;
  if (kind === "workspace") mockEntitlements.mode = "facility";
  if (kind === "verification") mockAuth.user.emailVerified = false;
  if (kind === "pending") mockAuth.isHydrating = true;
  if (kind === "role") mockAuth.user.role = "admin";
  if (kind === "facility-selection") mockFacility.selectedId = OTHER;
  screen.rerender(outlet());
  await flush();
  expect(screen.queryByText("Review a course gift")).toBeNull();
  expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
  expect(giftCalls()).toHaveLength(0);
});
test("06U course change discards form without reusing original attempt", async () => {
  const screen = render(outlet());
  fireEvent.press(screen.getByText("Review gifting this course"));
  await flush();
  screen.rerender(outlet("buyer", OTHER));
  await flush();
  expect(screen.queryByText("Review a course gift")).toBeNull();
  expect(newId).toHaveBeenCalledTimes(1);
});
test.each(["production", "native", "signed-out", "unready"])(
  "06U %s cannot select local entries",
  (kind) => {
    if (kind === "production") process.env.NODE_ENV = "production";
    if (kind === "native") jest.replaceProperty(Platform, "OS", "android");
    if (kind === "signed-out") mockAuth.isAuthed = false;
    if (kind === "unready") mockEntitlements.ready = false;
    const screen = render(outlet());
    expect(screen.queryByText("Review gifting this course")).toBeNull();
    expect(giftCalls()).toHaveLength(0);
    expect(storage.getItem).not.toHaveBeenCalled();
  }
);
test("06U local entry root reuses recipient continuation context, not a second router", () => {
  let selected = false;
  function Probe() {
    selected = Boolean(useContext(InternalCourseGiftWebContext));
    return null;
  }
  render(
    <Root>
      <Probe />
    </Root>
  );
  expect(selected).toBe(true);
  expect(giftCalls()).toHaveLength(0);
});
test("06U Commercial author page has a saved-identity, nonpreview, read-ready outlet; root excludes the local fixture", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../../src/app/home/commercial/courses/[courseId].tsx"),
    "utf8"
  );
  expect(source).toMatch(
    /<CourseGiftCourseEntry[\s\S]*?courseId=\{course\?\.id \|\| course\?\._id\}[\s\S]*?requestedCourseId=\{courseId\}[\s\S]*?mode="creator"/
  );
  expect(source).toContain(
    "course && !loading && !error && !courseBusy && !learnerPreview"
  );
  const root = fs.readFileSync(
    path.resolve(__dirname, "../../src/app/_layout.tsx"),
    "utf8"
  );
  expect(root).not.toContain("InternalCourseGiftEntryBoundary");
  expect(root).toContain("<CourseGiftWebBoundary>");
});

test("06U rendered Commercial author page opens existing creator review without writes", async () => {
  mockEntitlements.mode = "commercial";
  const screen = render(
    <Root>
      <CommercialCourseDetailRoute route={{ params: { courseId: COURSE } }} />
    </Root>
  );
  fireEvent.press(await screen.findByText("Review course gift settings"));
  await flush();
  expect(giftCalls()).toHaveLength(0);
  fireEvent.press(screen.getByText("Review current gift permission"));
  await flush();
  expect(
    screen.getByText("Approved gift terms are unavailable. New consent cannot be saved.")
  ).toBeTruthy();
  expect(giftCalls()).toHaveLength(1);
  expect(mockCommercialRead).toHaveBeenCalledWith(COURSE);
});

test.each(["default", "preview", "wrong-id", "read-error"])(
  "06U rendered Commercial %s page exposes no gift entry",
  async (kind) => {
    mockEntitlements.mode = "commercial";
    if (kind === "wrong-id") mockCourse.id = OTHER;
    if (kind === "read-error")
      mockCommercialRead.mockRejectedValue(Error("Synthetic read failure"));
    const view = (
      <CommercialCourseDetailRoute
        route={{
          params: {
            courseId: COURSE,
            preview: kind === "preview" ? "1" : undefined
          }
        }}
      />
    );
    const screen = render(kind === "default" ? view : <Root>{view}</Root>);
    await flush();
    expect(mockCommercialRead).toHaveBeenCalledWith(COURSE);
    expect(screen.queryByText("Review course gift settings")).toBeNull();
    expect(newId).not.toHaveBeenCalled();
    expect(giftCalls()).toHaveLength(0);
  }
);
