import React from "react";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import EditLessonScreen, { createStyles } from "@/screens/EditLessonScreen";
import { getThemePalette } from "@/theme/appTheme";

jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") })
  };
});
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ can: () => true })
}));
jest.mock("@/features/learning/learningAccess", () => ({
  getLearningAccess: () => ({ canCreateCourses: true })
}));
jest.mock("@/components/ScreenContainer", () => {
  const { ScrollView } = require("react-native");
  return function MockScreenContainer({ children }: any) {
    return <ScrollView>{children}</ScrollView>;
  };
});
jest.mock(
  "@/components/GrowInterestPicker",
  () =>
    function MockPicker() {
      return null;
    }
);
jest.mock(
  "@/components/learning/LessonMediaSourceEditor",
  () =>
    function MockMediaEditor() {
      return null;
    }
);
jest.mock(
  "@/components/videos/VideoLibraryPicker",
  () =>
    function MockVideoPicker() {
      return null;
    }
);
jest.mock(
  "@/components/feed/PersonalFeedPlacement",
  () =>
    function MockFeed() {
      return null;
    }
);
jest.mock("@/api/courses", () => ({ updateLesson: jest.fn() }));
jest.mock("@/api/uploads", () => ({ uploadCourseMedia: jest.fn() }));
jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Videos: "Videos" },
  launchImageLibraryAsync: jest.fn()
}));

describe("EditLessonScreen theme", () => {
  it("renders loaded lesson fields with the Night palette and derives Day styles", async () => {
    const nightPalette = getThemePalette("night", "dark");
    const dayPalette = getThemePalette("day", "light");
    const screen = render(
      <EditLessonScreen
        route={{
          params: {
            lessonId: "lesson-1",
            lesson: { id: "lesson-1", title: "Edit me", order: 2, content: "Body" }
          }
        }}
        navigation={{ goBack: jest.fn() }}
      />
    );

    const title = await screen.findByDisplayValue("Edit me");
    const heading = screen.getByText("Edit Lesson");

    expect(StyleSheet.flatten(heading.props.style).color).toBe(nightPalette.text);
    expect(StyleSheet.flatten(title.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: nightPalette.surface,
        borderColor: nightPalette.border,
        color: nightPalette.text
      })
    );
    expect(title.props.placeholderTextColor).toBe(nightPalette.textMuted);

    const dayStyles = createStyles(dayPalette);
    expect(dayStyles.header.color).toBe(dayPalette.text);
    expect(dayStyles.helpText.color).toBe(dayPalette.textMuted);
    expect(dayStyles.input).toEqual(
      expect.objectContaining({
        backgroundColor: dayPalette.surface,
        borderColor: dayPalette.border,
        color: dayPalette.text
      })
    );
    expect(dayStyles.btn.backgroundColor).toBe(dayPalette.accent);
    expect(dayStyles.btnText.color).toBe(dayPalette.accentText);
  });
});
