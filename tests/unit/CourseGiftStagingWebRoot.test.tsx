/** @jest-environment jsdom */
import React, { useContext } from "react";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { Platform, Text } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";
import { PreparedStagingCourseGiftWebBoundary as Root } from "@/components/courseGifts/PreparedStagingCourseGiftWebBoundary";
import Entry, {
  InternalCourseGiftEntryBoundary
} from "@/components/courseGifts/CourseGiftCourseEntry";
import PublicBoundary from "@/components/courseGifts/CourseGiftWebBoundary";
import CourseGiftWebScreen, {
  InternalCourseGiftWebContext
} from "@/components/courseGifts/CourseGiftWebScreen";
import { suppressCourseGiftDiagnostic } from "@/utils/courseGiftDiagnosticPrivacy";

const COURSE = "a".repeat(24),
  USER = "b".repeat(24),
  HASH = "d".repeat(64);
const API = "https://growpath-api-staging.onrender.com";
const ATTEMPT = "a0000000-0000-4000-8000-000000000001";
let mockApiUrl = API,
  mockAuth: any,
  mockEntitlements: any,
  mockFacility: any;
let mockPath = "/courses";
const mockApi = jest.fn();
const mockRouter = { setParams: jest.fn() };
const mockNavigation = { isReady: () => true, addListener: () => () => undefined };
jest.mock("expo-router", () => ({
  usePathname: () => mockPath.split(/[?#]/)[0],
  useUnstableGlobalHref: () => mockPath,
  useGlobalSearchParams: () => ({}),
  useRouter: () => mockRouter,
  useNavigationContainerRef: () => mockNavigation
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
  mockApiUrl = API;
  mockPath = "/courses";
  window.history.replaceState(null, "", mockPath);
  window.sessionStorage.clear();
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
  Object.defineProperty(window.crypto, "randomUUID", {
    configurable: true,
    value: jest.fn(() => ATTEMPT)
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
  const forbidden = () => {
    throw Error("External access blocked");
  };
  for (const module of [http, https])
    for (const method of ["get", "request"] as const)
      jest.spyOn(module, method).mockImplementation(forbidden);
  if (typeof global.fetch === "function")
    jest.spyOn(global, "fetch").mockImplementation(forbidden);
});
afterEach(() => {
  cleanup();
  // Unmount does not leave a private browser URL. That URL must remain protected
  // until navigation, independently of the component-owned diagnostic scope.
  window.history.replaceState(null, "", "/courses");
  expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
});

describe("R09 staging web root", () => {
  test("standalone public boundary stays inert; candidate root selects only the pinned staging wrapper", () => {
    const screen = render(<PublicBoundary>{content()}</PublicBoundary>);
    expect(screen.getByText("Ordinary content")).toBeTruthy();
    expect(screen.queryByText("Review gifting this course")).toBeNull();
    expect(mockApi).not.toHaveBeenCalled();
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/_layout.tsx"),
      "utf8"
    );
    expect(source).toContain(
      'import { PreparedStagingCourseGiftWebBoundary as CourseGiftWebBoundary } from "@/components/courseGifts/PreparedStagingCourseGiftWebBoundary"'
    );
    expect(source).not.toContain("InternalCourseGiftEntryBoundary");
  });
  test("loopback fixture boundary is not relaxed for staging", () => {
    const screen = render(
      <InternalCourseGiftEntryBoundary
        storage={window.sessionStorage}
        newRequestId={() => ATTEMPT}
        onNavigateToCheckout={jest.fn()}
      >
        {content()}
      </InternalCourseGiftEntryBoundary>
    );
    expect(screen.queryByText("Review gifting this course")).toBeNull();
    expect(mockApi).not.toHaveBeenCalled();
  });
  test("prepared entry makes no request and preserves plan and credits", () => {
    mockAuth.user.aiCredits = 37;
    const before = JSON.stringify([mockAuth, mockEntitlements, mockFacility]);
    const screen = render(<Root>{content()}</Root>);
    expect(screen.getByText("Review gifting this course")).toBeTruthy();
    expect(mockApi).not.toHaveBeenCalled();
    expect(window.crypto.randomUUID).not.toHaveBeenCalled();
    expect(JSON.stringify([mockAuth, mockEntitlements, mockFacility])).toBe(before);
  });
  test("creator review uses existing guarded client and privacy scope", async () => {
    const screen = render(<Root>{content("creator")}</Root>);
    fireEvent.press(screen.getByText("Review course gift settings"));
    await flush();
    expect(mockApi).not.toHaveBeenCalled();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(true);
    fireEvent.press(screen.getByText("Review current gift permission"));
    await flush();
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi.mock.calls[0][0]).toBe("/api/course-gifts/creator/review");
    expect(mockApi.mock.calls[0][1].notifyTokenBalance).toBe(false);
  });
  test("buyer opening reuses opaque original attempt without network", async () => {
    window.sessionStorage.setItem(
      `course_gift_sale_v1:${USER}:${COURSE}:buyer`,
      JSON.stringify({
        version: 1,
        userId: USER,
        expiresAt: Date.now() + 600000,
        value: {
          kind: "buyer",
          courseId: COURSE,
          attemptId: ATTEMPT,
          fingerprint: HASH,
          giftId: null
        }
      })
    );
    const screen = render(<Root>{content()}</Root>);
    fireEvent.press(screen.getByText("Review gifting this course"));
    await flush();
    expect(window.crypto.randomUUID).not.toHaveBeenCalled();
    expect(mockApi).not.toHaveBeenCalled();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(true);
  });
  test.each(["pending", "unverified", "facility"] as const)(
    "does not open %s sale entry",
    (kind) => {
      if (kind === "pending") mockAuth.isHydrating = true;
      if (kind === "unverified") mockAuth.user.emailVerified = false;
      if (kind === "facility") mockEntitlements.mode = "facility";
      const screen = render(<Root>{content()}</Root>);
      expect(screen.queryByText("Review gifting this course")).toBeNull();
      expect(mockApi).not.toHaveBeenCalled();
    }
  );
  test("API mismatch preserves ordinary content without gift context", () => {
    mockApiUrl = "https://growpath-api.onrender.com";
    const screen = render(<Root>{content()}</Root>);
    expect(screen.getByText("Ordinary content")).toBeTruthy();
    expect(screen.queryByText("Review gifting this course")).toBeNull();
    expect(current).toBeNull();
    expect(mockApi).not.toHaveBeenCalled();
  });
  test("recipient capture scrubs the URL and uses the same guarded transport", async () => {
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
    expect(
      screen.queryByText(
        "Course gifting is not available yet. No payment or claim has been started."
      )
    ).toBeNull();
    expect(mockApi).not.toHaveBeenCalled();
    await act(async () => {
      await current!.session.reviewRecipient().catch(() => undefined);
    });
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi.mock.calls[0][0]).toBe("/api/course-gifts/recipient/review");
    expect(mockApi.mock.calls[0][1].body).toEqual({ token: HASH });
    expect(window.sessionStorage.length).toBe(0);
    screen.unmount();
  });
  test("session replacement discards an open private form without request", async () => {
    const screen = render(<Root>{content()}</Root>);
    fireEvent.press(screen.getByText("Review gifting this course"));
    await flush();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(true);
    mockAuth = { ...mockAuth, token: "replacement-token" };
    screen.rerender(<Root>{content()}</Root>);
    await flush();
    expect(screen.getByText("Review gifting this course")).toBeTruthy();
    expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
    expect(mockApi).not.toHaveBeenCalled();
  });
  test("pagehide closes outstanding work and does not revive on pageshow", async () => {
    let release!: (value: unknown) => void;
    mockApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const screen = render(<Root>{content("creator")}</Root>);
    fireEvent.press(screen.getByText("Review course gift settings"));
    await flush();
    fireEvent.press(screen.getByText("Review current gift permission"));
    await flush();
    expect(mockApi).toHaveBeenCalledTimes(1);
    const signal = mockApi.mock.calls[0][1].signal;
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(signal.aborted).toBe(true);
    await act(async () => {
      release({ success: true, data: { late: true } });
    });
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(screen.queryByText("Review course gift settings")).toBeNull();
    expect(screen.getByText("Ordinary content")).toBeTruthy();
    expect(mockApi).toHaveBeenCalledTimes(1);
  });
  test("unmount cancels work without changing the signed-in account", async () => {
    mockApi.mockImplementation(() => new Promise(() => undefined));
    const before = JSON.stringify(mockAuth);
    const screen = render(<Root>{content("creator")}</Root>);
    fireEvent.press(screen.getByText("Review course gift settings"));
    await flush();
    fireEvent.press(screen.getByText("Review current gift permission"));
    await flush();
    const signal = mockApi.mock.calls[0][1].signal;
    screen.unmount();
    expect(signal.aborted).toBe(true);
    expect(JSON.stringify(mockAuth)).toBe(before);
  });
});
