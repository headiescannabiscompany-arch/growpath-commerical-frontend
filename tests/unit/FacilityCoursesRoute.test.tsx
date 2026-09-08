import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import FacilityCoursesRoute from "@/app/home/facility/(tabs)/courses";

const mockParams: Record<string, string> = {};
const mockReplace = jest.fn();
const mockEntitlements = {
  ready: true,
  mode: "facility",
  facilityId: "facility-1",
  facilityRole: "OWNER"
};
const mockFacility = { selectedId: "facility-1" };
const mockList = jest.fn();
const mockGet = jest.fn();
const mockCourseScreenProps = jest.fn();
const mockBuilderProps = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => mockEntitlements
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => mockFacility
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ScreenBoundary: ({ children }: any) => React.createElement(View, null, children)
  };
});

jest.mock("@/screens/CoursesScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props: any) => {
    mockCourseScreenProps(props);
    return React.createElement(Text, null, "Scoped course list");
  };
});

jest.mock("@/screens/commercial/CreateCourseScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return (props: any) => {
    mockBuilderProps(props);
    return React.createElement(Text, null, "Scoped course builder");
  };
});

jest.mock("@/screens/AddLessonScreen", () => () => null);
jest.mock("@/screens/EditLessonScreen", () => () => null);

jest.mock("@/api/facilityCourses", () => {
  const actual = jest.requireActual("@/api/facilityCourses");
  return {
    ...actual,
    listFacilityCourses: (...args: any[]) => mockList(...args),
    getFacilityCourse: (...args: any[]) => mockGet(...args),
    createFacilityCourse: jest.fn(),
    updateFacilityCourse: jest.fn(),
    addFacilityCourseLesson: jest.fn(),
    updateFacilityCourseLesson: jest.fn(),
    publishFacilityCourse: jest.fn(),
    unpublishFacilityCourse: jest.fn(),
    archiveFacilityCourse: jest.fn()
  };
});

jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({
    palette: {
      surface: "#111",
      border: "#222",
      text: "#fff",
      textMuted: "#aaa",
      accent: "#0a0",
      accentText: "#000"
    }
  })
}));

describe("FacilityCoursesRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    Object.assign(mockEntitlements, {
      ready: true,
      mode: "facility",
      facilityId: "facility-1",
      facilityRole: "OWNER"
    });
    mockFacility.selectedId = "facility-1";
    mockList.mockResolvedValue({
      courses: [],
      permissions: { canCreateDraft: true, canSetPrice: true },
      limits: {
        maxPaidCourses: 10,
        maxLessonsPerCourse: 50,
        currentPublishedPaidCourses: 0
      }
    });
  });

  it("passes one matching, authoritative Facility scope to the shared course list", () => {
    const screen = render(<FacilityCoursesRoute />);

    expect(screen.getByText("Scoped course list")).toBeTruthy();
    expect(mockCourseScreenProps).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogHref: "/home/facility/courses",
        facilityWorkspace: expect.objectContaining({
          facilityId: "facility-1",
          role: "OWNER",
          api: expect.objectContaining({
            list: expect.any(Function),
            get: expect.any(Function),
            create: expect.any(Function)
          })
        })
      })
    );
  });

  it("fails closed when selected and entitled Facility IDs do not match", () => {
    mockFacility.selectedId = "facility-2";

    const screen = render(<FacilityCoursesRoute />);

    expect(screen.getByText("Facility course access unavailable")).toBeTruthy();
    expect(screen.queryByText("Scoped course list")).toBeNull();
    expect(mockList).not.toHaveBeenCalled();
  });

  it("opens the shared builder only after affirmative list-level permissions", async () => {
    mockParams.action = "create";

    const screen = render(<FacilityCoursesRoute />);

    expect(await screen.findByText("Scoped course builder")).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith("facility-1");
    expect(mockBuilderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityWorkspace: expect.objectContaining({
          facilityId: "facility-1",
          role: "OWNER",
          permissions: { canCreateDraft: true, canSetPrice: true }
        })
      })
    );
  });

  it("does not render the builder when the server omits create permission", async () => {
    mockParams.action = "create";
    mockList.mockResolvedValueOnce({
      courses: [],
      permissions: { canCreateDraft: false, canSetPrice: false },
      limits: {}
    });

    const screen = render(<FacilityCoursesRoute />);

    await waitFor(() =>
      expect(screen.getByText("Course Builder unavailable")).toBeTruthy()
    );
    expect(screen.queryByText("Scoped course builder")).toBeNull();
  });
});
