/** @jest-environment jsdom */
// Import the ordinary app root, not a fixture replacement for its gift boundary.
// Existing auth/provider engines remain independently accepted; this small seam
// fixture supplies their snapshots and blocks all external I/O.
import React, { useContext } from "react";
import http from "node:http";
import https from "node:https";
import { Platform, Text } from "react-native";
import { act, cleanup, fireEvent, render } from "@testing-library/react-native";

const WEB = "https://growpath-web-staging.onrender.com";
const API = "https://growpath-api-staging.onrender.com";
const COURSE = "a".repeat(24);
const USER = "b".repeat(24);
const INVITATION = "c".repeat(64);
const ATTEMPT = "a0000000-0000-4000-8000-000000000001";
const isStagingOrigin = window.location.origin === WEB;
let mockApiUrl = API;
let mockAuth: any, mockEntitlements: any, mockFacility: any;
let mockPath = "/courses";
let mockScene: "entry" | "claim" = "entry";
const mockApi = jest.fn();
const mockRouter = { setParams: jest.fn() };
const mockNavigation = { isReady: () => true, addListener: () => () => undefined };

jest.mock("expo-router", () => ({
  Slot: () => <MockRootProbe />,
  usePathname: () => mockPath.split(/[?#]/)[0],
  useUnstableGlobalHref: () => mockPath,
  useGlobalSearchParams: () => ({}),
  useRouter: () => mockRouter,
  useNavigationContainerRef: () => mockNavigation
}));
jest.mock("@react-navigation/native", () => ({
  DefaultTheme: { colors: {} },
  ThemeProvider: ({ children }: any) => children
}));
jest.mock("react-native-screens", () => ({ enableScreens: jest.fn() }));
jest.mock("@tanstack/react-query", () => ({
  QueryClient: class {},
  QueryClientProvider: ({ children }: any) => children
}));
jest.mock("@/auth/AuthContext", () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => mockAuth
}));
jest.mock("@/session/SessionProvider", () => ({
  SessionProvider: ({ children }: any) => children
}));
jest.mock("@/entitlements/EntitlementsProvider", () => ({
  EntitlementsProvider: ({ children }: any) => children
}));
jest.mock("@/entitlements", () => ({ useEntitlements: () => mockEntitlements }));
jest.mock("@/facility/FacilityProvider", () => ({
  FacilityProvider: ({ children }: any) => children
}));
jest.mock("@/state/useFacility", () => ({ useFacility: () => mockFacility }));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    ThemeModeProvider: ({ children }: any) => children,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
jest.mock("@/components/GlobalApiStatusBanner", () => ({
  GlobalApiStatusBanner: () => null
}));
jest.mock("@/components/GlobalReportBugButton", () => ({
  __esModule: true,
  default: () => null
}));
jest.mock("@/notifications/useNotificationDeepLinks", () => ({
  useNotificationDeepLinks: jest.fn()
}));
jest.mock("@/seo/publicRouteMetadata", () => ({ applyPublicRouteMetadata: jest.fn() }));
jest.mock("@/utils/monitoring", () => ({
  initMonitoring: jest.fn(),
  wrapWithMonitoring: (value: any) => value
}));
jest.mock("@/api/apiRequest", () => ({
  get API_URL() {
    return mockApiUrl;
  },
  apiRequest: (...args: any[]) => mockApi(...args),
  setOnUnauthorized: jest.fn(),
  ApiError: class extends Error {}
}));

import RootLayout from "@/app/_layout";
import Entry from "@/components/courseGifts/CourseGiftCourseEntry";
import GiftScreen, {
  InternalCourseGiftWebContext
} from "@/components/courseGifts/CourseGiftWebScreen";
import { suppressCourseGiftDiagnostic } from "@/utils/courseGiftDiagnosticPrivacy";

let owner: React.ContextType<typeof InternalCourseGiftWebContext>;
function MockRootProbe() {
  owner = useContext(InternalCourseGiftWebContext);
  return (
    <>
      <Text>Ordinary course content</Text>
      {mockScene === "claim" ? (
        <GiftScreen />
      ) : (
        <Entry
          courseId={COURSE}
          requestedCourseId={COURSE}
          eligible
          mode="creator"
        />
      )}
    </>
  );
}
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};
beforeEach(() => {
  jest.replaceProperty(Platform, "OS", "web");
  mockApiUrl = API;
  mockPath = "/courses";
  mockScene = "entry";
  window.history.replaceState(null, "", mockPath);
  window.sessionStorage.clear();
  mockAuth = {
    isAuthed: true,
    isHydrating: false,
    meStatus: "ready",
    token: "synthetic-token",
    user: {
      id: USER,
      emailVerified: true,
      plan: "pro",
      role: "user",
      tokenBalance: 37
    }
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
  const blocked = () => {
    throw Error("External access blocked");
  };
  for (const module of [http, https])
    for (const method of ["get", "request"] as const)
      jest.spyOn(module, method).mockImplementation(blocked);
  if (typeof global.fetch === "function")
    jest.spyOn(global, "fetch").mockImplementation(blocked);
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/courses");
  expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
  expect(mockAuth.user).toMatchObject({ plan: "pro", tokenBalance: 37 });
});

if (isStagingOrigin) {
  describe("R09 selected normal root", () => {
    test("mounts the pinned staging owner without requests, IDs or storage writes", () => {
      const before = JSON.stringify([mockAuth, mockEntitlements, mockFacility]);
      const screen = render(<RootLayout />);
      expect(owner).not.toBeNull();
      expect(screen.getByText("Ordinary course content")).toBeTruthy();
      expect(screen.getByText("Review course gift settings")).toBeTruthy();
      expect(mockApi).not.toHaveBeenCalled();
      expect(window.crypto.randomUUID).not.toHaveBeenCalled();
      expect(window.sessionStorage.length).toBe(0);
      expect(JSON.stringify([mockAuth, mockEntitlements, mockFacility])).toBe(before);
    });

    test("production API mismatch retains ordinary content with no private owner", () => {
      mockApiUrl = "https://api.growpathai.com";
      const screen = render(<RootLayout />);
      expect(owner).toBeNull();
      expect(screen.getByText("Ordinary course content")).toBeTruthy();
      expect(screen.queryByText("Review course gift settings")).toBeNull();
      expect(mockApi).not.toHaveBeenCalled();
    });

    test.each(["android", "ios"] as const)(
      "%s remains inert even when the synthetic URL and API match staging",
      (platform) => {
        jest.replaceProperty(Platform, "OS", platform);
        const screen = render(<RootLayout />);
        expect(owner).toBeNull();
        expect(screen.getByText("Ordinary course content")).toBeTruthy();
        expect(screen.queryByText("Review course gift settings")).toBeNull();
        expect(mockApi).not.toHaveBeenCalled();
      }
    );

    test("recipient capture precedes unavailable UI through pending identity and readiness", async () => {
      mockScene = "claim";
      mockPath = "/claim-course-gift#token=" + INVITATION;
      window.history.replaceState(null, "", mockPath);
      mockAuth.isHydrating = true;
      mockAuth.meStatus = "loading";
      mockEntitlements.ready = false;
      const screen = render(<RootLayout />);
      expect(window.location.hash).toBe("");
      expect(owner?.snapshot).toMatchObject({
        authState: "pending",
        hasInvitation: true
      });
      expect(screen.queryByText(/Course gifting is not available yet/)).toBeNull();
      mockPath = "/claim-course-gift";
      mockAuth = { ...mockAuth, isHydrating: false, meStatus: "ready" };
      mockEntitlements = { ...mockEntitlements, ready: true };
      screen.rerender(<RootLayout />);
      await flush();
      expect(owner?.snapshot).toMatchObject({
        authState: "ready",
        hasInvitation: true
      });
      expect(mockApi).not.toHaveBeenCalled();
      expect(window.sessionStorage.length).toBe(0);
    });

    test("session replacement clears an opened private form without replay", async () => {
      const screen = render(<RootLayout />);
      fireEvent.press(screen.getByText("Review course gift settings"));
      await flush();
      expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(true);
      mockAuth = { ...mockAuth, token: "synthetic-replacement-token" };
      screen.rerender(<RootLayout />);
      await flush();
      expect(screen.getByText("Review course gift settings")).toBeTruthy();
      expect(suppressCourseGiftDiagnostic("ordinary message")).toBe(false);
      expect(mockApi).not.toHaveBeenCalled();
    });

    test("pagehide aborts an explicit read and a late reply cannot reopen the root owner", async () => {
      let release!: (value: unknown) => void;
      mockApi.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = resolve;
          })
      );
      const screen = render(<RootLayout />);
      fireEvent.press(screen.getByText("Review course gift settings"));
      await flush();
      fireEvent.press(screen.getByText("Review current gift permission"));
      await flush();
      expect(mockApi).toHaveBeenCalledTimes(1);
      const signal = mockApi.mock.calls[0][1].signal;
      act(() => window.dispatchEvent(new Event("pagehide")));
      expect(signal.aborted).toBe(true);
      await act(async () => release({ success: true, data: { late: true } }));
      act(() => window.dispatchEvent(new Event("pageshow")));
      expect(owner).toBeNull();
      expect(screen.queryByText("Review course gift settings")).toBeNull();
      expect(screen.getByText("Ordinary course content")).toBeTruthy();
      expect(mockApi).toHaveBeenCalledTimes(1);
    });
  });
} else {
  test("R09 production normal root remains inert even with a staging API value", () => {
    expect(window.location.origin).toBe("https://growpathai.com");
    const before = JSON.stringify([mockAuth, mockEntitlements, mockFacility]);
    const screen = render(<RootLayout />);
    expect(owner).toBeNull();
    expect(screen.getByText("Ordinary course content")).toBeTruthy();
    expect(screen.queryByText("Review course gift settings")).toBeNull();
    expect(mockApi).not.toHaveBeenCalled();
    expect(window.crypto.randomUUID).not.toHaveBeenCalled();
    expect(window.sessionStorage.length).toBe(0);
    expect(JSON.stringify([mockAuth, mockEntitlements, mockFacility])).toBe(before);
  });
}
