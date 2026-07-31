import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import PersonalFeaturedFeed, {
  isPublicTestContent
} from "@/components/home/PersonalFeaturedFeed";

const mockListCampaigns = jest.fn();
const mockListForumPosts = jest.fn();
const mockListCourses = jest.fn();

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
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
});
