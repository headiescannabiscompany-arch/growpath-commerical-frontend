/** @jest-environment jsdom */
import React, { useContext } from "react";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { Platform, Text } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { PreparedProductionCourseGiftWebBoundary as Root } from "@/components/courseGifts/PreparedProductionCourseGiftWebBoundary";
import Entry from "@/components/courseGifts/CourseGiftCourseEntry";
import CourseGiftWebScreen, {
  InternalCourseGiftWebContext
} from "@/components/courseGifts/CourseGiftWebScreen";
import { createProductionCourseGiftWebContextInternal as context } from "@/utils/courseGiftStagingWebContext";

const COURSE = "a".repeat(24),
  USER = "b".repeat(24),
  HASH = "d".repeat(64);
let mockApiUrl = "https://api.growpathai.com",
  mockAuth: any,
  mockEntitlements: any,
  mockPath = "/courses";
const mockApi = jest.fn(),
  mockRouter = { setParams: jest.fn() };
const navigation = { isReady: () => true, addListener: () => () => undefined };
jest.mock("expo-router", () => ({
  usePathname: () => mockPath.split(/[?#]/)[0],
  useUnstableGlobalHref: () => mockPath,
  useGlobalSearchParams: () => ({}),
  useRouter: () => mockRouter,
  useNavigationContainerRef: () => navigation
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({ useEntitlements: () => mockEntitlements }));
jest.mock("@/state/useFacility", () => ({ useFacility: () => ({ selectedId: null }) }));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
jest.mock("@/api/apiRequest", () => ({
  get API_URL() {
    return mockApiUrl;
  },
  apiRequest: (...args: any[]) => mockApi(...args),
  ApiError: class extends Error {}
}));
let current: React.ContextType<typeof InternalCourseGiftWebContext>;
function Probe() {
  current = useContext(InternalCourseGiftWebContext);
  return <Text>Ordinary content</Text>;
}
const content = (mode: "buyer" | "creator" = "buyer") => (
  <>
    <Probe />
    <Entry courseId={COURSE} requestedCourseId={COURSE} eligible mode={mode} />
  </>
);
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "web");
  mockApiUrl = "https://api.growpathai.com";
  mockPath = "/courses";
  window.history.replaceState(null, "", mockPath);
  window.sessionStorage.clear();
  mockAuth = {
    isAuthed: true,
    isHydrating: false,
    meStatus: "ready",
    token: "synthetic-token",
    user: { id: USER, emailVerified: true, plan: "pro", role: "user", aiCredits: 37 }
  };
  mockEntitlements = {
    ready: true,
    mode: "personal",
    facilityId: null,
    facilityRole: null
  };
  Object.defineProperty(window.crypto, "randomUUID", {
    configurable: true,
    value: jest.fn(() => "a0000000-0000-4000-8000-000000000001")
  });
  mockApi.mockResolvedValue({
    success: true,
    data: {
      courseId: COURSE,
      canAccept: false,
      matchesPolicy: false,
      consent: null,
      policy: null
    }
  });
  const deny = () => {
    throw Error("External access blocked");
  };
  for (const module of [http, https])
    for (const method of ["get", "request"] as const)
      jest.spyOn(module, method).mockImplementation(deny);
  if (typeof global.fetch === "function")
    jest.spyOn(global, "fetch").mockImplementation(deny);
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/courses");
});
test("prepared production entry is inert until an explicit action and preserves plan and credits", () => {
  const before = JSON.stringify(mockAuth);
  const screen = render(<Root>{content()}</Root>);
  expect(screen.getByText("Review gifting this course")).toBeTruthy();
  expect(mockApi).not.toHaveBeenCalled();
  expect(window.crypto.randomUUID).not.toHaveBeenCalled();
  expect(JSON.stringify(mockAuth)).toBe(before);
  const source = fs.readFileSync(path.join(process.cwd(), "src/app/_layout.tsx"), "utf8");
  expect(source).not.toContain("PreparedProductionCourseGiftWebBoundary");
  expect(source).toContain(
    'import CourseGiftWebBoundary from "@/components/courseGifts/CourseGiftWebBoundary"'
  );
});
test.each([
  "https://growpath-api-staging.onrender.com",
  "https://api.growpathai.com.evil.invalid",
  "http://localhost:5002"
])("rejects mismatched API %s", (url) => {
  mockApiUrl = url;
  expect(context).toThrow("COURSE_GIFT_PRODUCTION_UNAVAILABLE");
  const screen = render(<Root>{content()}</Root>);
  expect(screen.getByText("Ordinary content")).toBeTruthy();
  expect(screen.queryByText("Review gifting this course")).toBeNull();
});
test.each(["ios", "android"] as const)("keeps native %s closed", (platform) => {
  jest.replaceProperty(Platform, "OS", platform);
  expect(context).toThrow();
  expect(mockApi).not.toHaveBeenCalled();
});
test("creator uses quiet canonical authenticated transport and default unavailable terms", async () => {
  const screen = render(<Root>{content("creator")}</Root>);
  fireEvent.press(screen.getByText("Review course gift settings"));
  await flush();
  expect(mockApi).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Review current gift permission"));
  await flush();
  expect(mockApi.mock.calls[0][0]).toBe("/api/course-gifts/creator/review");
  expect(mockApi.mock.calls[0][1]).toMatchObject({
    notifyTokenBalance: false,
    invalidateOn401: false,
    retries: 0,
    cache: "no-store",
    redirect: "error"
  });
});
test("production recipient captures privately without claiming or storing its link", async () => {
  mockApi.mockResolvedValue({
    success: true,
    data: {
      giftId: "e".repeat(24),
      courseId: COURSE,
      courseTitle: "Synthetic recipient course",
      recipient: "l***@example.invalid",
      claimExpiresAt: new Date(Date.now() + 60000).toISOString(),
      code: "COURSE_GIFT_RECIPIENT_MISMATCH"
    }
  });
  mockPath = "/claim-course-gift#token=" + HASH;
  window.history.replaceState(null, "", mockPath);
  const screen = render(
    <Root>
      <Probe />
      <CourseGiftWebScreen />
    </Root>
  );
  expect(window.location.hash).toBe("");
  expect(current?.snapshot?.hasInvitation).toBe(true);
  expect(mockApi).not.toHaveBeenCalled();
  let review!: Promise<unknown>;
  act(() => {
    review = current!.session.reviewRecipient();
  });
  await expect(review).resolves.toMatchObject({
    code: "COURSE_GIFT_RECIPIENT_MISMATCH"
  });
  await flush();
  expect(mockApi.mock.calls[0][0]).toBe("/api/course-gifts/recipient/review");
  expect(mockApi.mock.calls[0][1].body).toEqual({ token: HASH });
  expect(window.sessionStorage.length).toBe(0);
  screen.unmount();
});
test("pagehide aborts late private replies and pageshow does not replay", async () => {
  let release!: (value: unknown) => void;
  mockApi.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );
  const before = JSON.stringify(mockAuth);
  const screen = render(<Root>{content("creator")}</Root>);
  fireEvent.press(screen.getByText("Review course gift settings"));
  await flush();
  fireEvent.press(screen.getByText("Review current gift permission"));
  await flush();
  const signal = mockApi.mock.calls[0][1].signal;
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(signal.aborted).toBe(true);
  await act(async () => release({ success: true, data: { late: true } }));
  act(() => window.dispatchEvent(new Event("pageshow")));
  expect(mockApi).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Review course gift settings")).toBeNull();
  expect(JSON.stringify(mockAuth)).toBe(before);
});
test("account replacement removes private form and requires a deliberate new opening", async () => {
  const screen = render(<Root>{content()}</Root>);
  fireEvent.press(screen.getByText("Review gifting this course"));
  await flush();
  mockAuth = { ...mockAuth, token: "replacement-synthetic-token" };
  screen.rerender(<Root>{content()}</Root>);
  await flush();
  expect(screen.getByText("Review gifting this course")).toBeTruthy();
  expect(mockApi).not.toHaveBeenCalled();
});
