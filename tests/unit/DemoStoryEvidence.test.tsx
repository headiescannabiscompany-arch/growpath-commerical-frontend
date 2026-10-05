import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { existsSync } from "node:fs";
import path from "node:path";
import stories from "@/components/marketing/demoStories.json";
import DemoWalkthrough, {
  DEMO_WALKTHROUGH_IMAGES,
  MAX_DEMO_WALKTHROUGH_SCENES,
  type DemoWalkthroughStory
} from "@/components/marketing/DemoWalkthrough";
import { demoStoryPath } from "@/utils/demoStoryLink";

describe("reviewed audience story evidence", () => {
  it("keeps five jobs within the existing public story allowlist", () => {
    expect(Object.keys(stories)).toEqual([
      "free",
      "pro",
      "seller",
      "creator",
      "facility"
    ]);
    expect(stories.seller.limits).toContain("Commercial");
    expect(stories.creator.limits).toContain("not a separate creator tier");
  });

  it.each(Object.values(stories))(
    "uses reviewed local evidence and a public CTA for $id",
    (story) => {
      expect(story.scenes.length).toBeGreaterThanOrEqual(2);
      expect(story.scenes.length).toBeLessThanOrEqual(MAX_DEMO_WALKTHROUGH_SCENES);
      expect(new Set(story.scenes.map((scene) => scene.id)).size).toBe(
        story.scenes.length
      );
      expect([
        "/register",
        "/pricing",
        "/grow-stores",
        "/creators-educators",
        "/facility-management"
      ]).toContain(story.ctaHref);
      expect(demoStoryPath(story.id)).not.toMatch(/(?:token|growId|facilityId|email)=/);
      for (const scene of story.scenes) {
        expect(DEMO_WALKTHROUGH_IMAGES).toContain(scene.image);
        expect(existsSync(path.join(process.cwd(), "public", scene.image))).toBe(true);
        expect(scene.width).toBeGreaterThan(0);
        expect(scene.height).toBeGreaterThan(0);
        expect(scene.caption).toMatch(/synthetic/i);
        expect(scene.caption).toMatch(/2026/);
        expect(scene.caption).toMatch(/cropped/i);
        expect(scene.alt.length).toBeGreaterThan(20);
      }
      expect(JSON.stringify(story)).not.toMatch(
        /[a-f0-9]{24}|@qa\.invalid|api\/|recordId|growId/i
      );
    }
  );

  it.each(Object.values(stories))(
    "reads every $id scene without live record access",
    (story) => {
      const screen = render(<DemoWalkthrough story={story as DemoWalkthroughStory} />);
      for (const [index, scene] of story.scenes.entries()) {
        fireEvent.press(screen.getByLabelText(`Show step ${index + 1}: ${scene.title}`));
        expect(screen.getByLabelText(scene.alt)).toBeTruthy();
        expect(screen.getByText(scene.caption)).toBeTruthy();
      }
      expect(global.fetch).not.toHaveBeenCalled();
    }
  );

  it("states the limits that could otherwise turn test fixtures into false proof", () => {
    expect(stories.pro.result).toMatch(/does not establish why/);
    expect(stories.pro.scenes[2].caption).toMatch(/not a picture of a downloaded file/);
    expect(stories.seller.limits).toMatch(/Purchase is disabled/);
    expect(stories.seller.scenes[2].caption).toMatch(/not an independent buyer purchase/);
    expect(stories.creator.scenes[2].body).toMatch(/does not start checkout or enroll/);
    expect(stories.creator.limits).toMatch(
      /Course publishing is available on every plan/
    );
    expect(stories.facility.limits).toMatch(/legacy\/unverified/);
    expect(stories.free.limits).toMatch(/1 grow and 1 plant/);
  });
});
