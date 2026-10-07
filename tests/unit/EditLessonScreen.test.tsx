import React from "react";
let mockDocumentProps: any;
jest.mock("@/components/learning/FacilityLessonDocument", () => {
  const { Text } = require("react-native");
  return (props: any) => {
    mockDocumentProps = props;
    return <Text>Facility document uploads are temporarily unavailable</Text>;
  };
});
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
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
  it("adds an Office document without replacing the saved PDF or previous documents", async () => {
    const FacilityEditor = require("@/screens/EditLessonScreen").default;
    const save = jest.fn().mockResolvedValue({});
    const pdf = "/api/course-media/64f000000000000000000710/file";
    const old = "/api/course-media/64f000000000000000000711/file";
    const url = "/api/course-media/64f000000000000000000712/file";
    const screen = render(
      <FacilityEditor
        route={{
          params: {
            courseId: "course-1",
            lessonId: "lesson-1",
            lesson: { title: "Office lesson", pdfUrl: pdf, documentUrls: [old] }
          }
        }}
        navigation={{ goBack: jest.fn() }}
        facilityWorkspace={{
          facilityId: "facility-1",
          permissions: { canEditLessons: true },
          api: { updateLesson: save }
        }}
      />
    );
    await screen.findByDisplayValue("Office lesson");
    act(() => {
      mockDocumentProps.onReady(url, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      mockDocumentProps.onReady(url, {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
    });
    fireEvent.press(screen.getByLabelText("Save lesson changes"));
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        "course-1",
        "lesson-1",
        expect.objectContaining({ pdfUrl: pdf, documentUrls: [old, url] })
      )
    );
  });
  it.each([false, true])(
    "preserves old PDF unless a verified replacement is selected: %s",
    async (replace) => {
      const FacilityEditor = require("@/screens/EditLessonScreen").default;
      const save = jest.fn().mockResolvedValue({});
      const original = "/api/course-media/64f000000000000000000710/file";
      const replacement = "/api/course-media/64f000000000000000000712/file";
      const screen = render(
        <FacilityEditor
          route={{
            params: {
              courseId: "course-1",
              lessonId: "lesson-1",
              lesson: { id: "lesson-1", title: "PDF lesson", pdfUrl: original }
            }
          }}
          navigation={{ goBack: jest.fn() }}
          facilityWorkspace={{
            facilityId: "facility-1",
            permissions: { canEditLessons: true },
            api: { updateLesson: save }
          }}
        />
      );
      await screen.findByDisplayValue("PDF lesson");
      if (replace) act(() => mockDocumentProps.onReady(replacement));
      fireEvent.press(screen.getByLabelText("Save lesson changes"));
      await waitFor(() =>
        expect(save).toHaveBeenCalledWith(
          "course-1",
          "lesson-1",
          expect.objectContaining({ pdfUrl: replace ? replacement : original })
        )
      );
    }
  );
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
    expect(screen.getByText("PDF URL")).toBeTruthy();

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

  it("preserves unsaved lesson edits when the parent supplies a new navigation object", async () => {
    const lesson = {
      id: "lesson-1",
      title: "Saved title",
      order: 2,
      content: "Saved body"
    };
    const route = { params: { lessonId: "lesson-1", lesson } };
    const screen = render(
      <EditLessonScreen route={route} navigation={{ goBack: jest.fn() }} />
    );

    fireEvent.changeText(await screen.findByDisplayValue("Saved title"), "Unsaved title");
    expect(screen.getByDisplayValue("Unsaved title")).toBeTruthy();

    screen.rerender(
      <EditLessonScreen route={route} navigation={{ goBack: jest.fn() }} />
    );

    expect(screen.getByDisplayValue("Unsaved title")).toBeTruthy();
    expect(screen.queryByDisplayValue("Saved title")).toBeNull();
  });

  it("does not offer unscanned document authoring in a Facility lesson", async () => {
    const screen = render(
      <EditLessonScreen
        route={{
          params: {
            courseId: "course-1",
            lessonId: "lesson-1",
            lesson: {
              id: "lesson-1",
              title: "Facility lesson",
              order: 1,
              content: "Body",
              pdfUrl: "/api/course-media/64f000000000000000000777/file"
            }
          }
        }}
        navigation={{ goBack: jest.fn() }}
        facilityWorkspace={
          {
            facilityId: "facility-1",
            permissions: { canEditLessons: true },
            api: { updateLesson: jest.fn() }
          } as any
        }
      />
    );

    expect(await screen.findByDisplayValue("Facility lesson")).toBeTruthy();
    expect(screen.queryByText("PDF URL")).toBeNull();
    expect(
      screen.getByText(/Facility document uploads are temporarily unavailable/)
    ).toBeTruthy();
  });
});
