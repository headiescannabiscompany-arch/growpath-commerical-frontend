import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import PublicGrowTimelineRoute from "@/app/grow-timeline/[token]";

const mockGetPublicCopy = jest.fn();
let reportProps: any = null;
let mockToken = "A".repeat(43);
const mockAuth = {
  token: "",
  isHydrating: false,
  user: { id: "", cannabisVisibility: "hide" }
};
const mockLink = jest.fn();
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (fn: () => void) => require("react").useEffect(fn, [fn])
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useLocalSearchParams: () => ({ token: mockToken }),
    Link: ({ children, href }: any) => {
      mockLink(href);
      return React.createElement(React.Fragment, null, children);
    }
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
  mockToken = "A".repeat(43);
  mockAuth.token = "";
  mockAuth.isHydrating = false;
  reportProps = null;
  mockGetPublicCopy.mockResolvedValue({
    id: "507f1f77bcf86cd799439012",
    token: "A".repeat(43),
    workspaceType: "personal",
    version: 1,
    status: "published",
    title: "Tomato season",
    description: "A reviewed public timeline.",
    presentation: "visual",
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
    expect(screen.getAllByText("Week one").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Timeline photo for Week one")).toBeTruthy();

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
    mockGetPublicCopy.mockRejectedValue(
      Object.assign(new Error("unavailable"), { status: 404 })
    );
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

  it("returns a visitor to the exact shared timeline after signing in", async () => {
    mockGetPublicCopy.mockRejectedValueOnce({ status: 404 });
    const screen = render(<PublicGrowTimelineRoute />);
    await screen.findByText("Sign in and return to this timeline");
    expect(mockLink).toHaveBeenCalledWith(
      "/login?next=" + encodeURIComponent("/grow-timeline/" + mockToken)
    );
  });

  it("recovers a temporary error without requiring sign-in", async () => {
    mockGetPublicCopy.mockRejectedValueOnce({ status: 503 });
    const screen = render(<PublicGrowTimelineRoute />);
    await screen.findByText("The shared timeline could not be loaded. Try again.");
    expect(screen.queryByText("Sign in and return to this timeline")).toBeNull();
    fireEvent.press(screen.getByText("Try again"));
    await screen.findByText("Tomato season");
  });

  it("does not prompt a signed-in reader to log in again for a restricted link", async () => {
    mockAuth.token = "test-session";
    mockGetPublicCopy.mockRejectedValueOnce({ status: 404 });
    const screen = render(<PublicGrowTimelineRoute />);
    await screen.findByText("Try again");
    expect(screen.queryByText("Sign in and return to this timeline")).toBeNull();
  });

  it("ignores a late result for a previous timeline", async () => {
    let resolveOld!: (copy: any) => void;
    mockGetPublicCopy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    );
    const screen = render(<PublicGrowTimelineRoute />);
    await waitFor(() => expect(mockGetPublicCopy).toHaveBeenCalledTimes(1));
    const old = mockToken;
    mockToken = "B".repeat(43);
    mockGetPublicCopy.mockRejectedValueOnce({ status: 404 });
    screen.rerender(<PublicGrowTimelineRoute />);
    await screen.findByText("Try again");
    await act(async () =>
      resolveOld({ token: old, status: "published", title: "Previous timeline" })
    );
    expect(screen.queryByText("Previous timeline")).toBeNull();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("renders a published list presentation without the visual flow", async () => {
    mockGetPublicCopy.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
      token: "A".repeat(43),
      workspaceType: "personal",
      version: 2,
      status: "published",
      title: "Tomato season list",
      description: "A reviewed public list.",
      presentation: "list",
      dateRange: {
        start: "2026-08-01T12:00:00.000Z",
        end: "2026-08-08T12:00:00.000Z"
      },
      events: [
        {
          id: "GrowLog:log-1",
          title: "Week one list entry",
          summary: "Healthy growth in list mode",
          timestamp: "2026-08-01T12:00:00.000Z",
          tags: ["journal"]
        }
      ],
      photos: [],
      cannabisSpecific: false,
      publishedAt: "2026-08-08T12:00:00.000Z"
    });

    const screen = render(<PublicGrowTimelineRoute />);
    await waitFor(() => expect(screen.getByText("Tomato season list")).toBeTruthy());

    expect(screen.getByText("Week one list entry")).toBeTruthy();
    expect(screen.getByText("Healthy growth in list mode")).toBeTruthy();
    expect(screen.queryByLabelText("Visual grow timeline flowchart")).toBeNull();
  });
});
