import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import CoursesScreen from "@/screens/CoursesScreen";

const mockPush = jest.fn();
const mockGlobalApiRequest = jest.fn();
const mockGenericUnpublish = jest.fn();
const mockGetCourseMediaAccessUrl = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: mockPush, replace: jest.fn() })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthed: true, user: { id: "staff-1", growInterests: {} } })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { COMMERCIAL_HOME: "COMMERCIAL_HOME" },
  useEntitlements: () => ({
    mode: "facility",
    ready: true,
    can: () => false,
    limits: {}
  })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockGlobalApiRequest(...args)
}));

jest.mock("@/api/courses", () => ({
  getCourse: jest.fn(),
  unpublishCourse: (...args: any[]) => mockGenericUnpublish(...args)
}));

jest.mock("@/api/uploads", () => ({
  getCourseMediaAccessUrl: (...args: any[]) => mockGetCourseMediaAccessUrl(...args)
}));

jest.mock("@/features/learning/learningAccess", () => ({
  countPaidCourses: () => 0,
  getLearningAccess: () => ({
    canViewCourses: true,
    canSeePaidCourses: true,
    canCreateCourses: true,
    canSellPaidCourses: true,
    canPublishCourses: true,
    canViewCourseAnalytics: true,
    maxPaidCourses: null,
    maxLessonsPerCourse: 100
  })
}));

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View, { testID: "personal-feed-placement" });
});

jest.mock("@/screens/CourseDetailScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ route }: any) =>
    React.createElement(
      Text,
      null,
      `Course detail: ${route?.params?.course?.title || ""}`
    );
});

describe("CoursesScreen Facility workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCourseMediaAccessUrl.mockImplementation(async (url: string) => url);
  });

  it("exchanges a protected Facility cover before rendering the list card", async () => {
    const protectedCover = "/api/course-media/64f000000000000000000901/file";
    const signedCover =
      "https://api.growpath.test/api/course-media/64f000000000000000000901/file?access=signed";
    mockGetCourseMediaAccessUrl.mockResolvedValue(signedCover);
    const api = {
      list: jest.fn().mockResolvedValue({
        courses: [
          {
            id: "facility-course-cover",
            facilityId: "facility-1",
            authoringSource: "facility_workspace",
            title: "Protected Cover Training",
            coverImage: protectedCover,
            isPublished: false,
            permissions: {}
          }
        ],
        permissions: {}
      }),
      get: jest.fn()
    };

    const screen = render(
      <CoursesScreen
        catalogHref="/home/facility/courses"
        facilityWorkspace={{ facilityId: "facility-1", role: "VIEWER", api }}
      />
    );

    const cover = await screen.findByLabelText("Protected Cover Training cover");
    expect(mockGetCourseMediaAccessUrl).toHaveBeenCalledWith(protectedCover);
    expect(cover.props.source).toEqual({ uri: signedCover });
  });

  it("uses only the scoped adapter and exposes actions from server permissions", async () => {
    const api = {
      list: jest.fn().mockResolvedValue({
        courses: [
          {
            id: "facility-course-1",
            facilityId: "facility-1",
            authoringSource: "facility_workspace",
            title: "Workspace Training",
            isPublished: true,
            permissions: {
              canEditCourse: true,
              canEditLessons: true,
              canSetPrice: true,
              canPublish: false,
              canUnpublish: true,
              canArchive: false
            }
          }
        ],
        permissions: { canCreateDraft: true, canSetPrice: true },
        limits: {
          maxPaidCourses: 10,
          maxLessonsPerCourse: 50,
          currentPublishedPaidCourses: 1
        }
      }),
      get: jest.fn(),
      unpublish: jest.fn().mockResolvedValue({})
    };

    const screen = render(
      <CoursesScreen
        catalogHref="/home/facility/courses"
        facilityWorkspace={{ facilityId: "facility-1", role: "MANAGER", api }}
      />
    );

    expect(await screen.findByText("Workspace Training")).toBeTruthy();
    expect(screen.getByText("Facility workspace course")).toBeTruthy();
    expect(screen.getByText("Paid course limit: 1/10")).toBeTruthy();
    expect(screen.queryAllByTestId("personal-feed-placement")).toHaveLength(0);
    expect(mockGlobalApiRequest).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole("button", { name: "Create Course" }));
    expect(mockPush).toHaveBeenCalledWith("/home/facility/courses?action=create");

    fireEvent.press(screen.getByRole("button", { name: "Unpublish Workspace Training" }));
    await waitFor(() => expect(api.unpublish).toHaveBeenCalledWith("facility-course-1"));
    expect(mockGenericUnpublish).not.toHaveBeenCalled();
  });

  it("fails closed when list permissions are absent", async () => {
    const api = {
      list: jest.fn().mockResolvedValue({
        courses: [
          {
            id: "facility-course-2",
            facilityId: "facility-1",
            authoringSource: "facility_workspace",
            title: "Read Only Training",
            isPublished: true,
            permissions: {}
          }
        ]
      }),
      get: jest.fn()
    };

    const screen = render(
      <CoursesScreen
        catalogHref="/home/facility/courses"
        facilityWorkspace={{ facilityId: "facility-1", role: "VIEWER", api }}
      />
    );

    expect(await screen.findByText("Read Only Training")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create Course" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Unpublish Read Only Training" })
    ).toBeNull();
  });

  it("clears a selected Facility detail immediately when the workspace changes", async () => {
    const firstApi = {
      list: jest.fn().mockResolvedValue({
        courses: [
          {
            id: "facility-course-a",
            facilityId: "facility-a",
            authoringSource: "facility_workspace",
            title: "Facility A private training",
            isPublished: false,
            permissions: {}
          }
        ],
        permissions: {}
      }),
      get: jest.fn()
    };
    const secondApi = {
      list: jest.fn().mockResolvedValue({
        courses: [
          {
            id: "facility-course-b",
            facilityId: "facility-b",
            authoringSource: "facility_workspace",
            title: "Facility B training",
            isPublished: false,
            permissions: {}
          }
        ],
        permissions: {}
      }),
      get: jest.fn()
    };
    const screen = render(
      <CoursesScreen
        catalogHref="/home/facility/courses"
        facilityWorkspace={{ facilityId: "facility-a", role: "VIEWER", api: firstApi }}
      />
    );

    fireEvent.press(await screen.findByText("Facility A private training"));
    expect(screen.getByText("Course detail: Facility A private training")).toBeTruthy();

    screen.rerender(
      <CoursesScreen
        catalogHref="/home/facility/courses"
        facilityWorkspace={{
          facilityId: "facility-b",
          role: "VIEWER",
          api: secondApi
        }}
      />
    );

    expect(screen.queryByText("Course detail: Facility A private training")).toBeNull();
    expect(await screen.findByText("Facility B training")).toBeTruthy();
  });

  it("keeps the generic catalog learner-only in Facility mode and skips /mine", async () => {
    mockGlobalApiRequest.mockImplementation((path: string) => {
      if (path === "/api/courses") {
        return Promise.resolve([
          {
            id: "facility-public-projection",
            title: "Public Facility Training",
            sourceType: "facility_course",
            creator: "staff-1",
            _viewerOwnsCourse: true,
            isPublished: true
          }
        ]);
      }
      return Promise.resolve([]);
    });

    const screen = render(<CoursesScreen />);

    expect(await screen.findByText("Public Facility Training")).toBeTruthy();
    expect(mockGlobalApiRequest).toHaveBeenCalledWith("/api/courses", expect.any(Object));
    expect(mockGlobalApiRequest).toHaveBeenCalledWith(
      "/api/commercial/courses/public",
      expect.any(Object)
    );
    expect(
      mockGlobalApiRequest.mock.calls.some(([path]) => path === "/api/courses/mine")
    ).toBe(false);
    expect(screen.queryByRole("button", { name: "Create Course" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Unpublish Public Facility Training" })
    ).toBeNull();
    expect(mockGenericUnpublish).not.toHaveBeenCalled();
  });
});
