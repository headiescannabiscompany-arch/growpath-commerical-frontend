import {
  emptyLessonMediaDraft,
  lessonMediaPublishIssues,
  normalizeLessonMediaDraft,
  prepareLessonMediaSubmission
} from "@/features/learning/lessonMedia";

describe("lesson media contract", () => {
  it("normalizes YouTube Shorts and preserves a privacy-aware external fallback", () => {
    const result = normalizeLessonMediaDraft({
      ...emptyLessonMediaDraft("youtube"),
      originalUrl: "https://www.youtube.com/shorts/CUIifOqeS1Q?feature=share",
      availabilityStatus: "available",
      lastCheckedAt: "2026-07-22T13:00:00Z",
      creatorRightsConfirmed: true,
      captionsStatus: "provided",
      textSummary: "A concise lesson summary.",
      allowEmbed: true
    });

    expect(result.errors).toEqual([]);
    expect(result.mediaSource).toMatchObject({
      sourceType: "youtube",
      providerVideoId: "CUIifOqeS1Q",
      canonicalUrl: "https://www.youtube.com/watch?v=CUIifOqeS1Q",
      embedUrl: "https://www.youtube-nocookie.com/embed/CUIifOqeS1Q",
      externalLinkFallback: "https://www.youtube.com/watch?v=CUIifOqeS1Q",
      privacyMode: "click_to_load"
    });
  });

  it("detects Rumble from a pasted URL and uses an honest link-only fallback", () => {
    const result = normalizeLessonMediaDraft({
      ...emptyLessonMediaDraft("other_url"),
      originalUrl: "https://rumble.com/v6abcde-course-video.html?ref=creator",
      availabilityStatus: "available",
      allowEmbed: true
    });

    expect(result.mediaSource).toMatchObject({
      sourceType: "rumble",
      providerLabel: "Rumble",
      canonicalUrl: "https://rumble.com/v6abcde-course-video.html",
      embedCapability: "link_only",
      allowEmbed: false,
      linkOnlyFallback: true
    });
  });

  it("preserves Vimeo unlisted privacy hashes in links and embeds", () => {
    const result = normalizeLessonMediaDraft({
      ...emptyLessonMediaDraft("vimeo"),
      originalUrl: "https://vimeo.com/123456789/a1b2c3d4",
      availabilityStatus: "available",
      allowEmbed: true
    });

    expect(result.mediaSource).toMatchObject({
      providerVideoId: "123456789",
      providerPrivacyHash: "a1b2c3d4",
      canonicalUrl: "https://vimeo.com/123456789/a1b2c3d4",
      embedUrl: "https://player.vimeo.com/video/123456789?h=a1b2c3d4"
    });
  });

  it("does not trust a claimed GrowPath source for an external URL", () => {
    const result = normalizeLessonMediaDraft({
      ...emptyLessonMediaDraft("growpath_upload"),
      originalUrl: "https://youtu.be/QT7vv46368M"
    });

    expect(result.mediaSource).toMatchObject({
      sourceType: "youtube",
      provider: "youtube"
    });
  });

  it("rejects embed HTML instead of storing executable markup", () => {
    const result = normalizeLessonMediaDraft({
      ...emptyLessonMediaDraft("youtube"),
      originalUrl: '<iframe src="https://youtube.com/embed/QT7vv46368M"></iframe>'
    });

    expect(result.mediaSource).toBeNull();
    expect(result.errors.join(" ")).toMatch(/not iframe/i);
  });

  it("builds first-party upload metadata and reports missing publication evidence", () => {
    const prepared = prepareLessonMediaSubmission(
      {
        ...emptyLessonMediaDraft("growpath_upload"),
        availabilityStatus: "available",
        lastCheckedAt: "2026-07-22T13:00:00Z"
      },
      "/uploads/lesson.mp4"
    );

    expect(prepared.mediaSource).toMatchObject({
      sourceType: "growpath_upload",
      provider: "growpath",
      embedCapability: "native",
      canonicalUrl: "/uploads/lesson.mp4"
    });
    expect(lessonMediaPublishIssues(prepared.mediaSource)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/rights/i),
        expect.stringMatching(/summary/i),
        expect.stringMatching(/captions or transcript/i)
      ])
    );
  });
});
