"use strict";

const { normalizeLessonMedia, lessonMediaPublishBlockers } = require("./lessonMedia");

describe("lesson media normalization", () => {
  test("detects YouTube and builds a privacy-enhanced canonical source", () => {
    const result = normalizeLessonMedia({
      originalUrl: "https://youtu.be/QT7vv46368M?feature=shared",
      availabilityStatus: "available",
      lastCheckedAt: "2026-07-22T13:00:00Z",
      allowEmbed: true,
      creatorRightsConfirmed: true,
      captionsStatus: "provided",
      textSummary: "A lesson summary for learners."
    });

    expect(result.errors).toEqual([]);
    expect(result.mediaSource).toMatchObject({
      sourceType: "youtube",
      providerVideoId: "QT7vv46368M",
      canonicalUrl: "https://www.youtube.com/watch?v=QT7vv46368M",
      embedUrl: "https://www.youtube-nocookie.com/embed/QT7vv46368M",
      privacyMode: "click_to_load",
      linkOnlyFallback: false
    });
  });

  test("detects Rumble but keeps it link-only", () => {
    const result = normalizeLessonMedia({
      sourceType: "other_url",
      originalUrl: "https://rumble.com/v6abcde-example.html?ref=course",
      availabilityStatus: "available",
      allowEmbed: true
    });

    expect(result.errors).toEqual([]);
    expect(result.mediaSource).toMatchObject({
      sourceType: "rumble",
      canonicalUrl: "https://rumble.com/v6abcde-example.html",
      embedCapability: "link_only",
      allowEmbed: false,
      linkOnlyFallback: true
    });
  });

  test("preserves Vimeo unlisted privacy hashes", () => {
    const result = normalizeLessonMedia({
      originalUrl: "https://vimeo.com/123456789/a1b2c3d4",
      availabilityStatus: "available",
      allowEmbed: true
    });

    expect(result.mediaSource).toMatchObject({
      sourceType: "vimeo",
      providerVideoId: "123456789",
      providerPrivacyHash: "a1b2c3d4",
      canonicalUrl: "https://vimeo.com/123456789/a1b2c3d4",
      embedUrl: "https://player.vimeo.com/video/123456789?h=a1b2c3d4"
    });
  });

  test("does not relabel an external source as a GrowPath upload", () => {
    const result = normalizeLessonMedia({
      sourceType: "growpath_upload",
      originalUrl: "https://youtu.be/QT7vv46368M"
    });

    expect(result.mediaSource).toMatchObject({
      sourceType: "youtube",
      provider: "youtube"
    });
  });

  test("rejects pasted iframe or script markup", () => {
    const result = normalizeLessonMedia({
      originalUrl: '<iframe src="https://www.youtube.com/embed/QT7vv46368M"></iframe>'
    });
    expect(result.mediaSource).toBeNull();
    expect(result.errors.join(" ")).toMatch(/not iframe/i);
  });

  test("requires rights, availability, summary, and accessibility status to publish", () => {
    expect(
      lessonMediaPublishBlockers(
        {
          title: "Video lesson",
          videoUrl: "https://vimeo.com/123456789"
        },
        0
      )
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/confirm creator rights/i),
        expect.stringMatching(/check and record/i),
        expect.stringMatching(/text summary/i),
        expect.stringMatching(/captions or transcript/i)
      ])
    );
  });
});
