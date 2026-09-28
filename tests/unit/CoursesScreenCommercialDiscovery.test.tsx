import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import CoursesScreen, { courseCatalogRequest } from "@/screens/CoursesScreen";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockRetryMe = jest.fn();
const mockAuthState = {
  isAuthed: true,
  isHydrating: false,
  token: "learner-token" as string | null,
  meStatus: "ready",
  retryMe: mockRetryMe,
  user: { id: "learner", growInterests: {} } as { id: string; growInterests: {} } | null
};
const mockEntitlements = {
  ready: true,
  bootstrapError: null as string | null,
  mode: "personal",
  limits: {},
  canViewCourses: true,
  can: (capability: string) =>
    mockEntitlements.ready &&
    (capability !== "COURSES_VIEW" || mockEntitlements.canViewCourses)
};

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    ...mockAuthState,
    user: mockAuthState.user ? { ...mockAuthState.user } : null
  })
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: {
    COMMERCIAL_HOME: "COMMERCIAL_HOME",
    COURSES_VIEW: "COURSES_VIEW",
    COURSES_CREATE: "COURSES_CREATE"
  },
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

describe("CoursesScreen commercial discovery", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Object.assign(mockAuthState, {
      isAuthed: true,
      isHydrating: false,
      token: "learner-token",
      meStatus: "ready",
      user: { id: "learner", growInterests: {} }
    });
    Object.assign(mockEntitlements, {
      ready: true,
      bootstrapError: null,
      mode: "personal",
      canViewCourses: true
    });
    mockRetryMe.mockResolvedValue(undefined);
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/commercial/courses/public") {
        return {
          courses: [
            {
              id: "commercial-course-1",
              title: "Living Soil Product School",
              price: 0,
              status: "published",
              sourceType: "commercial_course",
              storefrontSlug: "soil-school"
            }
          ]
        };
      }
      return { courses: [] };
    });
  });

  it.each(["auth", "entitlements", "both"])(
    "waits for %s readiness before public or owned catalog requests",
    async (pending) => {
      mockAuthState.isHydrating = pending !== "entitlements";
      mockEntitlements.ready = pending === "auth";
      const screen = render(<CoursesScreen />);
      expect(screen.getByText("Loading courses...")).toBeTruthy();
      expect(
        screen.queryByText("Course access is not available for this account.")
      ).toBeNull();
      expect(screen.queryByText("Published course catalog")).toBeNull();
      expect(mockApiRequest).not.toHaveBeenCalled();

      mockAuthState.isHydrating = false;
      mockEntitlements.ready = true;
      await act(async () => screen.rerender(<CoursesScreen />));
      expect(await screen.findByText("Living Soil Product School")).toBeTruthy();
      expect(
        mockApiRequest.mock.calls.filter(([path]) => path === "/api/courses")
      ).toHaveLength(1);
      expect(
        mockApiRequest.mock.calls.filter(([path]) => path === "/api/courses/mine")
      ).toHaveLength(1);
    }
  );

  it("waits for anonymous entitlement defaults, then requests only public catalogs", async () => {
    Object.assign(mockAuthState, { isAuthed: false, token: null, user: null });
    mockEntitlements.ready = false;
    const screen = render(<CoursesScreen />);
    expect(screen.getByText("Loading courses...")).toBeTruthy();
    expect(mockApiRequest).not.toHaveBeenCalled();
    mockEntitlements.ready = true;
    await act(async () => screen.rerender(<CoursesScreen />));
    expect(await screen.findByText("Living Soil Product School")).toBeTruthy();
    expect(screen.getByText("Published course catalog")).toBeTruthy();
    expect(mockApiRequest.mock.calls.map(([path]) => path)).toEqual([
      "/api/courses",
      "/api/commercial/courses/public"
    ]);
  });

  it("shows true settled denial without starting catalog requests", () => {
    mockEntitlements.canViewCourses = false;
    const screen = render(<CoursesScreen />);
    expect(
      screen.getByText("Course access is not available for this account.")
    ).toBeTruthy();
    expect(screen.queryByText("Loading courses...")).toBeNull();
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("shows a recoverable initial access-check failure instead of endless loading or denial", async () => {
    mockEntitlements.ready = false;
    mockEntitlements.bootstrapError = "Initial account check failed";
    mockAuthState.meStatus = "error";
    const screen = render(<CoursesScreen />);
    expect(screen.getByText(/Unable to verify course access/)).toBeTruthy();
    expect(screen.queryByText("Loading courses...")).toBeNull();
    expect(
      screen.queryByText("Course access is not available for this account.")
    ).toBeNull();
    expect(mockRetryMe).not.toHaveBeenCalled();
    expect(mockApiRequest).not.toHaveBeenCalled();
    await act(async () =>
      fireEvent.press(screen.getByRole("button", { name: "Retry course access" }))
    );
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).not.toHaveBeenCalled();
    Object.assign(mockEntitlements, { ready: true, bootstrapError: null });
    mockAuthState.meStatus = "ready";
    await act(async () => screen.rerender(<CoursesScreen />));
    expect(await screen.findByText("Living Soil Product School")).toBeTruthy();
  });

  it.each(["loading", "error"])(
    "keeps already-resolved access during a same-session background account %s",
    async (meStatus) => {
      const screen = render(<CoursesScreen />);
      await screen.findByText("Living Soil Product School");
      const calls = mockApiRequest.mock.calls.length;
      mockAuthState.meStatus = meStatus;
      await act(async () => screen.rerender(<CoursesScreen />));
      expect(screen.getByText("Living Soil Product School")).toBeTruthy();
      expect(screen.queryByText("Loading courses...")).toBeNull();
      expect(
        screen.queryByText("Course access is not available for this account.")
      ).toBeNull();
      expect(screen.queryByText(/Unable to verify course access/)).toBeNull();
      expect(mockApiRequest).toHaveBeenCalledTimes(calls);
    }
  );

  it("discards pending owned records and partial-failure warnings when readiness is lost", async () => {
    let resolveOwned!: (value: unknown) => void;
    let rejectCommercial!: (error: Error) => void;
    mockApiRequest.mockImplementation((path: string) => {
      if (path === "/api/courses/mine")
        return new Promise((resolve) => {
          resolveOwned = resolve;
        });
      if (path === "/api/commercial/courses/public")
        return new Promise((_resolve, reject) => {
          rejectCommercial = reject;
        });
      return Promise.resolve({ courses: [] });
    });
    const screen = render(<CoursesScreen />);
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledTimes(3));
    mockEntitlements.ready = false;
    await act(async () => screen.rerender(<CoursesScreen />));
    await act(async () => {
      resolveOwned({
        courses: [{ id: "private-old", title: "Previous private draft", status: "draft" }]
      });
      rejectCommercial(new Error("Old commercial request failed"));
    });
    expect(screen.getByText("Loading courses...")).toBeTruthy();
    expect(screen.queryByText("Previous private draft")).toBeNull();
    expect(screen.queryByText(/Some course sources could not load/)).toBeNull();
    expect(mockApiRequest).toHaveBeenCalledTimes(3);
    mockApiRequest.mockResolvedValue({
      courses: [{ id: "current", title: "Current public course", isPublished: true }]
    });
    mockEntitlements.ready = true;
    await act(async () => screen.rerender(<CoursesScreen />));
    expect(await screen.findByText("Current public course")).toBeTruthy();
    expect(screen.queryByText("Previous private draft")).toBeNull();
    expect(screen.queryByText(/Some course sources could not load/)).toBeNull();
  });

  it.each(["auth", "entitlements", "both"])(
    "does not call a Facility adapter before %s readiness",
    async (pending) => {
      mockAuthState.isHydrating = pending !== "entitlements";
      mockEntitlements.ready = pending === "auth";
      mockEntitlements.mode = "facility";
      const api = {
        list: jest.fn().mockResolvedValue({
          courses: [
            {
              id: "facility-course",
              facilityId: "facility-1",
              title: "Facility course",
              isPublished: true
            }
          ]
        }),
        get: jest.fn()
      };
      const props = { facilityId: "facility-1", role: "MANAGER", api };
      const screen = render(<CoursesScreen facilityWorkspace={props} />);
      expect(screen.getByText("Loading courses...")).toBeTruthy();
      expect(api.list).not.toHaveBeenCalled();
      expect(api.get).not.toHaveBeenCalled();
      expect(mockApiRequest).not.toHaveBeenCalled();
      mockAuthState.isHydrating = false;
      mockEntitlements.ready = true;
      await act(async () => screen.rerender(<CoursesScreen facilityWorkspace={props} />));
      expect(await screen.findByText("Facility course")).toBeTruthy();
      expect(api.list).toHaveBeenCalledTimes(1);
      expect(mockApiRequest).not.toHaveBeenCalled();
    }
  );

  it("loads published commercial courses and opens their storefront detail", async () => {
    const screen = render(<CoursesScreen />);

    await waitFor(() =>
      expect(screen.getByText("Living Soil Product School")).toBeTruthy()
    );
    await waitFor(() => expect(screen.queryByText("Loading courses...")).toBeNull());
    expect(mockApiRequest).toHaveBeenCalledWith("/api/commercial/courses/public", {
      timeoutMs: 8000,
      retries: 0
    });

    fireEvent.press(screen.getByText("Living Soil Product School"));

    expect(mockPush).toHaveBeenCalledWith(
      "/store/soil-school/courses/commercial-course-1"
    );
  });

  it("routes an owned Commercial projection to its authoring workspace without generic unpublish", async () => {
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/courses/mine") {
        return {
          courses: [
            {
              id: "commercial-course-1",
              title: "Living Soil Product School",
              creator: "learner",
              isPublished: true,
              authoringSource: "commercial_record"
            }
          ]
        };
      }
      if (path === "/api/commercial/courses/public") {
        return {
          courses: [
            {
              id: "commercial-course-1",
              title: "Living Soil Product School",
              price: 0,
              status: "published",
              sourceType: "commercial_course",
              storefrontSlug: "soil-school"
            }
          ]
        };
      }
      return { courses: [] };
    });

    const screen = render(<CoursesScreen />);

    const manage = await screen.findByRole("button", {
      name: "Manage Living Soil Product School in Commercial workspace"
    });
    expect(
      screen.queryByRole("button", { name: "Unpublish Living Soil Product School" })
    ).toBeNull();

    fireEvent.press(manage);
    expect(mockPush).toHaveBeenCalledWith("/home/commercial/courses/commercial-course-1");
  });

  it("bounds a course source even when the transport never settles", async () => {
    jest.useFakeTimers();
    mockApiRequest.mockReturnValue(new Promise(() => undefined));

    const pending = courseCatalogRequest("/api/courses/mine");
    jest.advanceTimersByTime(8000);

    await expect(pending).rejects.toThrow("Course source timed out");
    jest.useRealTimers();
  });

  it("shows available courses and a retry when one source fails", async () => {
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === "/api/courses/mine") throw new Error("Owned courses timed out");
      if (path === "/api/courses") {
        return {
          courses: [
            {
              id: "public-course-1",
              title: "Available Public Course",
              price: 0,
              status: "published"
            }
          ]
        };
      }
      return { courses: [] };
    });

    const screen = render(<CoursesScreen />);

    await waitFor(() => expect(screen.getByText("Available Public Course")).toBeTruthy());
    await waitFor(() => expect(screen.queryByText("Loading courses...")).toBeNull());
    expect(
      screen.getByText(
        "Some course sources could not load. Showing the available courses."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Retry course catalog" }));

    await waitFor(() =>
      expect(
        mockApiRequest.mock.calls.filter(([path]) => path === "/api/courses")
      ).toHaveLength(2)
    );
  });
});
