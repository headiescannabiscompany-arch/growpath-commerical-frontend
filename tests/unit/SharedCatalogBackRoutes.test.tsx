import React from "react";
import { render } from "@testing-library/react-native";

import CoursesRoute from "@/app/courses";
import SharedForumRoute from "@/app/forum";
import FacilityFeedRoute from "@/app/home/facility/feed";

let mockIsAuthed = false;

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    isAuthed: mockIsAuthed,
    user: mockIsAuthed ? { id: "user-1" } : null
  })
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ backFallbackHref, children, showBack, title }: any) => (
      <View>
        <Text>{`${title}:${showBack ? "back" : "no-back"}:${backFallbackHref}`}</Text>
        {children}
      </View>
    )
  };
});

jest.mock("@/screens/CoursesScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return ({ onDetailVisibilityChange }: any) => {
    React.useEffect(() => onDetailVisibilityChange?.(false), [onDetailVisibilityChange]);
    return <Text>Courses content</Text>;
  };
});

jest.mock("@/app/home/personal/(tabs)/forum", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>Forum content</Text>;
});

jest.mock("@/app/feed", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => <Text>Facility feed content</Text>;
});

describe("shared catalog route Back controls", () => {
  beforeEach(() => {
    mockIsAuthed = false;
  });

  it("keeps one shared Back boundary on Courses", () => {
    const screen = render(<CoursesRoute />);

    expect(screen.getByText("Courses:back:/")).toBeTruthy();
    expect(screen.getByText("Courses content")).toBeTruthy();
  });

  it("keeps one shared Back boundary on Forum", () => {
    const screen = render(<SharedForumRoute />);

    expect(screen.getByText("Forum and Q&A:back:/")).toBeTruthy();
    expect(screen.getByText("Forum content")).toBeTruthy();
  });

  it("uses the workspace chooser as the signed-in fallback", () => {
    mockIsAuthed = true;

    const courses = render(<CoursesRoute />);
    const forum = render(<SharedForumRoute />);

    expect(courses.getByText("Courses:back:/account/workspace")).toBeTruthy();
    expect(forum.getByText("Forum and Q&A:back:/account/workspace")).toBeTruthy();
  });

  it("delegates Facility outreach to the shared feed boundary", () => {
    const screen = render(<FacilityFeedRoute />);

    expect(screen.getByText("Facility feed content")).toBeTruthy();
    expect(screen.queryByText(/Facility outreach feed:back:/)).toBeNull();
  });
});
