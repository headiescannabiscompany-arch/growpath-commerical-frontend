import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import PublicGrowTimelineRoute from "@/app/grow-timeline/[token]";

const mockGetPublicCopy = jest.fn();
let reportProps: any = null;

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useLocalSearchParams: () => ({ token: "A".repeat(43) }),
    Link: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

jest.mock("@/api/growTimelineCopies", () => ({
  getPublicGrowTimelineCopy: (...args: any[]) => mockGetPublicCopy(...args)
}));

jest.mock("@/components/ReportModal", () => ({
  __esModule: true,
  default: (props: any) => {
    if (props.visible) reportProps = props;
    return null;
  }
}));

jest.mock("@/utils/publicLinks", () => ({
  currentPublicUrl: (path: string) => `https://growpathai.com${path}`,
  sharePublicLink: jest.fn(),
  buildPublicShareTargets: () => []
}));

beforeEach(() => {
  jest.clearAllMocks();
  reportProps = null;
  mockGetPublicCopy.mockResolvedValue({
    id: "507f1f77bcf86cd799439012",
    token: "A".repeat(43),
    workspaceType: "personal",
    version: 1,
    status: "published",
    title: "Tomato season",
    description: "A reviewed public timeline.",
    dateRange: {
      start: "2026-08-01T12:00:00.000Z",
      end: "2026-08-08T12:00:00.000Z"
    },
    events: [
      {
        title: "Week one",
        summary: "Healthy growth",
        timestamp: "2026-08-01T12:00:00.000Z",
        tags: ["journal"]
      }
    ],
    photos: [
      {
        url: "/uploads/public-field-observations/safe.jpg",
        label: "Grow timeline photo"
      }
    ],
    cannabisSpecific: false,
    publishedAt: "2026-08-08T12:00:00.000Z"
  });
});

describe("PublicGrowTimelineRoute", () => {
  it("renders only the frozen viewer fields and provides the unified report workflow", async () => {
    const screen = render(<PublicGrowTimelineRoute />);
    await waitFor(() => expect(screen.getByText("Tomato season")).toBeTruthy());
    expect(screen.getByText("A reviewed public timeline.")).toBeTruthy();
    expect(screen.getByText("Week one")).toBeTruthy();
    expect(screen.getByLabelText("Grow timeline photo")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Report shared grow timeline"));
    expect(reportProps).toEqual(
      expect.objectContaining({
        contentType: "growTimelinePublicCopy",
        contentId: "507f1f77bcf86cd799439012",
        targetUrl: `https://growpathai.com/grow-timeline/${"A".repeat(43)}`
      })
    );
  });

  it("does not expose whether an unavailable link was withdrawn or restricted", async () => {
    mockGetPublicCopy.mockRejectedValue(new Error("not found"));
    const screen = render(<PublicGrowTimelineRoute />);
    await waitFor(() =>
      expect(
        screen.getByText(
          "This grow timeline is unavailable, withdrawn, or restricted by your content settings."
        )
      ).toBeTruthy()
    );
    expect(screen.queryByText("Tomato season")).toBeNull();
  });
});
