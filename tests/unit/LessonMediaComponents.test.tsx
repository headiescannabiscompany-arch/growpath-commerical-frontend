import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import LessonMediaCard from "@/components/learning/LessonMediaCard";
import LessonMediaSourceEditor, {
  createStyles as createEditorStyles
} from "@/components/learning/LessonMediaSourceEditor";
import { emptyLessonMediaDraft } from "@/features/learning/lessonMedia";
import { getThemePalette } from "@/theme/appTheme";

const mockGetVideoPlayback = jest.fn();
let mockToken = "session-a";
let mockFacility: string | null = null;
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ token: mockToken, user: { id: "learner" } })
}));

jest.mock("@/api/videos", () => ({
  getVideoPlayback: (...args: any[]) => mockGetVideoPlayback(...args)
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: "personal",
    facilityId: mockFacility
  })
}));

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: (props: any) => React.createElement(View, props) };
});

describe("lesson media authoring and playback", () => {
  beforeEach(() => {
    mockGetVideoPlayback.mockReset();
    mockToken = "session-a";
    mockFacility = null;
  });

  const providerLesson = (id: string) => ({
    id,
    title: "Provider lesson",
    videoUrl: "https://youtu.be/QT7vv46368M",
    mediaSource: {
      sourceType: "youtube",
      originalUrl: "https://youtu.be/QT7vv46368M",
      availabilityStatus: "available",
      allowEmbed: true,
      textSummary: "Written summary"
    }
  });
  const protectedLesson = (id: string) => ({
    id,
    title: "Protected lesson",
    videoAssetId: id,
    mediaSource: {
      sourceType: "growpath_upload",
      originalUrl: `/api/videos/uploads/${id}/object`,
      availabilityStatus: "available",
      textSummary: "Written summary"
    }
  });

  it("requires fresh consent for another lesson, even with the same provider URL", () => {
    const screen = render(<LessonMediaCard lesson={providerLesson("one")} />);
    fireEvent.press(screen.getByLabelText("Load YouTube lesson video"));
    screen.rerender(<LessonMediaCard lesson={providerLesson("two")} />);
    expect(screen.queryByLabelText("Provider lesson player")).toBeNull();
    expect(screen.getByLabelText("Load YouTube lesson video")).toBeTruthy();
  });

  it.each(["asset", "session", "workspace"])(
    "clears protected playback on %s change",
    async (change) => {
      mockGetVideoPlayback.mockResolvedValueOnce({
        playbackUrl: "https://example.test/old"
      });
      mockGetVideoPlayback.mockImplementationOnce(() => new Promise(() => {}));
      const screen = render(<LessonMediaCard lesson={protectedLesson("one")} />);
      await screen.findByLabelText("Protected lesson player");
      if (change === "session") mockToken = "session-b";
      if (change === "workspace") mockFacility = "facility-b";
      screen.rerender(
        <LessonMediaCard lesson={protectedLesson(change === "asset" ? "two" : "one")} />
      );
      expect(screen.queryByLabelText("Protected lesson player")).toBeNull();
      expect(screen.getByLabelText("Preparing protected video playback")).toBeTruthy();
      await waitFor(() => expect(mockGetVideoPlayback).toHaveBeenCalledTimes(2));
    }
  );

  it("retries a failed protected read without changing the summary or lesson progress", async () => {
    mockGetVideoPlayback.mockRejectedValueOnce(new Error("temporary failure"));
    mockGetVideoPlayback.mockResolvedValueOnce({
      playbackUrl: "https://example.test/current"
    });
    const screen = render(<LessonMediaCard lesson={protectedLesson("one")} />);
    const retry = await screen.findByLabelText("Retry protected video playback");
    expect(screen.getByText("Written summary")).toBeTruthy();
    fireEvent.press(retry);
    await screen.findByLabelText("Protected lesson player");
    expect(mockGetVideoPlayback).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(/progress changes only when you choose Mark Complete/)
    ).toBeTruthy();
  });

  it("ignores a superseded protected response", async () => {
    let completeOld: (value: any) => void = () => {};
    mockGetVideoPlayback.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          completeOld = resolve;
        })
    );
    mockGetVideoPlayback.mockImplementationOnce(() => new Promise(() => {}));
    const screen = render(<LessonMediaCard lesson={protectedLesson("one")} />);
    await waitFor(() => expect(mockGetVideoPlayback).toHaveBeenCalledTimes(1));
    screen.rerender(<LessonMediaCard lesson={protectedLesson("two")} />);
    await waitFor(() => expect(mockGetVideoPlayback).toHaveBeenCalledTimes(2));
    await act(async () => completeOld({ playbackUrl: "https://example.test/old" }));
    expect(screen.queryByLabelText("Protected lesson player")).toBeNull();
  });

  it("retains consent on ordinary rerenders but resets it when the source changes", () => {
    const screen = render(<LessonMediaCard lesson={providerLesson("one")} />);
    fireEvent.press(screen.getByLabelText("Load YouTube lesson video"));
    screen.rerender(<LessonMediaCard lesson={providerLesson("one")} />);
    expect(screen.getByLabelText("Provider lesson player")).toBeTruthy();
    const next = providerLesson("one");
    next.mediaSource.originalUrl = "https://youtu.be/dQw4w9WgXcQ";
    screen.rerender(<LessonMediaCard lesson={next} />);
    expect(screen.queryByLabelText("Provider lesson player")).toBeNull();
  });

  it("treats an empty authorized response as recoverable instead of a blank player", async () => {
    mockGetVideoPlayback.mockResolvedValue({});
    const screen = render(<LessonMediaCard lesson={protectedLesson("one")} />);
    expect(await screen.findByLabelText("Retry protected video playback")).toBeTruthy();
    expect(screen.queryByLabelText("Protected lesson player")).toBeNull();
  });

  it("uses the active palette for authoring choices and fields", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createEditorStyles(palette);

    expect(styles.card.backgroundColor).toBe(palette.surface);
    expect(styles.choice.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.choice.borderColor).toBe(palette.border);
    expect(styles.input.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.choiceSelected.backgroundColor).toBe(palette.accentSoft);
  });

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
    const screen = render(<LessonMediaSourceEditor value={value} onChange={jest.fn()} />);

    expect(
      screen.getByText("Paste a video page URL, not iframe, embed, script, or HTML code.")
    ).toBeTruthy();
    expect(screen.queryByText("Video source is ready for course publishing.")).toBeNull();
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
    expect(screen.getByLabelText("Load YouTube lesson video").props.style).toEqual(
      expect.objectContaining({ minHeight: 44 })
    );
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
    expect(
      screen.getByLabelText("Open Rumble lesson video in provider").props.style
    ).toEqual(expect.objectContaining({ minHeight: 44 }));
  });

  it("uses authorized playback instead of exposing a private object path", async () => {
    mockGetVideoPlayback.mockResolvedValue({
      playbackUrl: "https://r2.example/signed-playback",
      expiresInSeconds: 3600
    });
    const screen = render(
      <LessonMediaCard
        lesson={{
          title: "Protected lesson",
          videoAssetId: "video-1",
          mediaSource: {
            sourceType: "growpath_upload",
            originalUrl: "/api/videos/uploads/asset-1/object",
            canonicalUrl: "/api/videos/uploads/asset-1/object",
            availabilityStatus: "available",
            lastCheckedAt: "2026-07-26T12:00:00Z",
            creatorRightsConfirmed: true,
            captionsStatus: "provided",
            transcriptStatus: "not_provided",
            textSummary: "A protected training video.",
            allowEmbed: false
          }
        }}
      />
    );

    expect(await screen.findByLabelText("Protected lesson player")).toBeTruthy();
    expect(mockGetVideoPlayback).toHaveBeenCalledWith("video-1", "personal", undefined);
  });
});
