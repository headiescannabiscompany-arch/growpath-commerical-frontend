import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import PersonalFeaturedFeed, {
  campaignHref,
  createPersonalFeaturedFeedStyles,
  isPublicTestContent
} from "@/components/home/PersonalFeaturedFeed";
import { getThemePalette } from "@/theme/appTheme";

const mockListCampaigns = jest.fn();
const mockListForumPosts = jest.fn();
const mockListCourses = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children, href }: any) => React.cloneElement(children, { href })
  };
});

jest.mock("@/api/commercialFeed", () => ({
  listCommercialFeedCampaigns: (...args: any[]) => mockListCampaigns(...args)
}));

jest.mock("@/api/communitySocial", () => ({
  listForumPosts: (...args: any[]) => mockListForumPosts(...args)
}));

jest.mock("@/api/courses", () => ({
  listCourses: (...args: any[]) => mockListCourses(...args)
}));

describe("PersonalFeaturedFeed", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockListCampaigns.mockResolvedValue({
      items: [
        { id: "qa-campaign", title: "QA ONLY campaign", body: "test" },
        {
          id: "live-campaign",
          title: "Summer soil workshop",
          body: "Learn practical soil-building methods."
        }
      ]
    });
    mockListForumPosts.mockResolvedValue([
      {
        id: "qa-post",
        title: "Popular forum discussion",
        body: "Testing post creation, navigation, and image storage.",
        likeCount: 100
      },
      {
        id: "live-post",
        title: "Improving seedling airflow",
        body: "Compare gentle airflow setups.",
        likeCount: 2
      }
    ]);
    mockListCourses.mockResolvedValue({
      courses: [
        {
          id: "qa-course",
          title: "QA ONLY — $1 Paid Course Lifecycle",
          description: "QA-only course used to verify checkout."
        },
        {
          id: "live-course",
          title: "Living Soil Fundamentals",
          description: "Build a practical soil system."
        }
      ]
    });
  });

  it("uses the active Night palette for feed cards and discovery controls", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createPersonalFeaturedFeedStyles(palette);

    expect(styles.kicker.color).toBe(palette.accent);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.subtitle.color).toBe(palette.textMuted);
    expect(styles.moreButton.backgroundColor).toBe(palette.accentSoft);
    expect(styles.moreButton.borderColor).toBe(palette.accent);
    expect(styles.moreButtonText.color).toBe(palette.link);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.card.borderColor).toBe(palette.border);
    expect(styles.image.backgroundColor).toBe(palette.surfaceStrong);
    expect(styles.label.color).toBe(palette.accent);
    expect(styles.cardTitle.color).toBe(palette.text);
    expect(styles.cardSummary.color).toBe(palette.textMuted);
    expect(styles.meta.color).toBe(palette.textMuted);
  });

  it("recognizes explicit QA and test-only records without blocking normal testing topics", () => {
    expect(isPublicTestContent({ title: "QA ONLY course" })).toBe(true);
    expect(isPublicTestContent({ title: "Testing post creation" })).toBe(true);
    expect(
      isPublicTestContent({
        title: "Popular forum discussion",
        body: "Testing post creation and navigation."
      })
    ).toBe(true);
    expect(isPublicTestContent({ isTest: true, title: "Hidden record" })).toBe(true);
    expect(isPublicTestContent({ title: "Soil testing fundamentals" })).toBe(false);
  });

  it("keeps Facility-authored home highlights on the shared feed", () => {
    expect(campaignHref({ id: "facility-education-1" }, true)).toBe(
      "/feed?campaignId=facility-education-1"
    );
    expect(campaignHref({}, true)).toBe("/feed");
  });

  it("keeps QA records out of the public home highlights", async () => {
    const screen = render(<PersonalFeaturedFeed />);

    await waitFor(() =>
      expect(screen.getByText("Living Soil Fundamentals")).toBeTruthy()
    );

    expect(screen.getByText("Summer soil workshop")).toBeTruthy();
    expect(screen.getByText("Improving seedling airflow")).toBeTruthy();
    expect(screen.queryByText(/QA ONLY/)).toBeNull();
    expect(screen.queryByText("Testing post creation")).toBeNull();
  });

  it("labels empty-state cards as GrowPath shortcuts instead of fabricated content", async () => {
    mockListCampaigns.mockRejectedValue(new Error("offline"));
    mockListForumPosts.mockRejectedValue(new Error("offline"));
    mockListCourses.mockRejectedValue(new Error("offline"));

    const screen = render(<PersonalFeaturedFeed />);

    await waitFor(() =>
      expect(screen.getByText("Browse grower storefronts")).toBeTruthy()
    );
    expect(screen.getAllByText("GrowPath shortcut").length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByText("Commercial ad")).toBeNull();
    expect(screen.queryByText("Facility post")).toBeNull();
    expect(screen.queryByText("Forum post")).toBeNull();
    expect(screen.getByText("Discover across GrowPath")).toBeTruthy();
  });
});
