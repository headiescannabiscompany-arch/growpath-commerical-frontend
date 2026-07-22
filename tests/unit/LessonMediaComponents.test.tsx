import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import LessonMediaCard from "@/components/learning/LessonMediaCard";
import LessonMediaSourceEditor from "@/components/learning/LessonMediaSourceEditor";
import { emptyLessonMediaDraft } from "@/features/learning/lessonMedia";

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: (props: any) => React.createElement(View, props) };
});

describe("lesson media authoring and playback", () => {
  it("detects a provider while preserving author metadata controls", () => {
    let value = emptyLessonMediaDraft("other_url");
    const onChange = jest.fn((next) => {
      value = next;
    });
    const screen = render(<LessonMediaSourceEditor value={value} onChange={onChange} />);

    fireEvent.changeText(
      screen.getByLabelText("Lesson video page URL"),
      "https://youtu.be/QT7vv46368M"
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: "youtube",
        originalUrl: "https://youtu.be/QT7vv46368M"
      })
    );
  });

  it("does not show invalid embed code as publish-ready media", () => {
    const value = {
      ...emptyLessonMediaDraft("youtube"),
      originalUrl: '<iframe src="https://www.youtube.com/embed/QT7vv46368M"></iframe>'
    };
    const screen = render(
      <LessonMediaSourceEditor value={value} onChange={jest.fn()} />
    );

    expect(
      screen.getByText("Paste a video page URL, not iframe, embed, script, or HTML code.")
    ).toBeTruthy();
    expect(
      screen.queryByText("Video source is ready for course publishing.")
    ).toBeNull();
    expect(screen.queryByLabelText("Current availability: Available")).toBeNull();
  });

  it("requires learner consent before loading a third-party player", () => {
    const screen = render(
      <LessonMediaCard
        lesson={{
          title: "Provider lesson",
          videoUrl: "https://www.youtube.com/watch?v=QT7vv46368M",
          mediaSource: {
            sourceType: "youtube",
            originalUrl: "https://www.youtube.com/watch?v=QT7vv46368M",
            canonicalUrl: "https://www.youtube.com/watch?v=QT7vv46368M",
            availabilityStatus: "available",
            lastCheckedAt: "2026-07-22T13:00:00Z",
            creatorRightsConfirmed: true,
            captionsStatus: "provided",
            transcriptStatus: "not_provided",
            textSummary: "Learn the application sequence.",
            allowEmbed: true
          }
        }}
      />
    );

    expect(screen.getByText("Load video from YouTube?")).toBeTruthy();
    expect(screen.queryByLabelText("Provider lesson player")).toBeNull();
    fireEvent.press(screen.getByLabelText("Load YouTube lesson video"));
    expect(screen.getByLabelText("Provider lesson player")).toBeTruthy();
    expect(screen.getByText("Learn the application sequence.")).toBeTruthy();
    expect(
      screen.getByText(/progress changes only when you choose Mark Complete/)
    ).toBeTruthy();
  });

  it("keeps restricted sources usable through summary and fallback link", () => {
    const screen = render(
      <LessonMediaCard
        lesson={{
          title: "Restricted provider lesson",
          externalVideoUrl: "https://rumble.com/v6abcde-course.html",
          mediaSource: {
            sourceType: "rumble",
            originalUrl: "https://rumble.com/v6abcde-course.html",
            canonicalUrl: "https://rumble.com/v6abcde-course.html",
            availabilityStatus: "restricted",
            availabilityNote: "Provider login may be required.",
            captionsStatus: "not_provided",
            transcriptStatus: "provided",
            textSummary: "The written application steps remain available here."
          }
        }}
      />
    );

    expect(screen.getByText("Video may not be available")).toBeTruthy();
    expect(screen.getByText("Provider login may be required.")).toBeTruthy();
    expect(
      screen.getByText("The written application steps remain available here.")
    ).toBeTruthy();
    expect(screen.getByText("Open on Rumble")).toBeTruthy();
  });
});
