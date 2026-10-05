import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AppState, StyleSheet } from "react-native";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import PublicGrowDemo from "@/app/demo";
import demo from "@/components/marketing/syntheticGrowDemo.json";
import { getRoutePolicy } from "@/navigation/routeAccess";
import { sharePublicLink } from "@/utils/publicLinks";
import { getPublicTestimonials } from "@/api/testimonials";
import type { DemoStoryId } from "@/utils/demoStoryLink";

jest.mock("@/utils/publicLinks", () => ({ sharePublicLink: jest.fn() }));
jest.mock("@/api/testimonials", () => ({ getPublicTestimonials: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Link: ({ children }: { children: React.ReactNode }) => children
}));

const mockPush = jest.fn();
const stories: Array<[DemoStoryId, string, string]> = [
  ["free", "Free · around the house", "/demo"],
  ["pro", "Pro · more growing room", "/demo?story=pro"],
  ["seller", "Commercial · sellers", "/demo?story=seller"],
  ["creator", "Commercial · educators & hosts", "/demo?story=creator"],
  ["facility", "Facility · teams & rooms", "/demo?story=facility"]
];

async function renderDemo() {
  const screen = render(<PublicGrowDemo />);
  await act(async () => {});
  return screen;
}

describe("public synthetic grow demo", () => {
  beforeEach(() => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    jest
      .mocked(useRouter)
      .mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
    jest.spyOn(AppState, "addEventListener").mockReturnValue({ remove: jest.fn() });
    jest.mocked(getPublicTestimonials).mockResolvedValue([]);
  });
  it("leaves testimonial space hidden when no approved feedback is available", async () => {
    const screen = await renderDemo();
    await waitFor(() => expect(getPublicTestimonials).toHaveBeenCalled());
    expect(screen.queryByText("Feedback from growers")).toBeNull();
    expect(screen.queryByLabelText("Refresh public feedback")).toBeNull();
  });
  it("shows only the public feed and removes proof after a withdrawal refresh", async () => {
    jest.mocked(getPublicTestimonials).mockResolvedValueOnce([
      {
        publicId: "test-public-feedback",
        quote: "My notes are easier to revisit.",
        publicName: "Test reviewer",
        photo: null,
        publishedAt: "2026-10-05T00:00:00Z"
      }
    ]);
    const screen = await renderDemo();
    await waitFor(() =>
      expect(screen.getByText("My notes are easier to revisit.")).toBeTruthy()
    );
    expect(screen.getByText("Feedback from growers")).toBeTruthy();
    expect(screen.getByText(demo.disclosure)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Refresh public feedback"));
    await waitFor(() =>
      expect(screen.queryByText("My notes are easier to revisit.")).toBeNull()
    );
    expect(screen.queryByText("Test reviewer")).toBeNull();
  });
  it("is public with five selectable entries, synthetic disclosure and no account actions", async () => {
    expect(getRoutePolicy("/demo")).toBeFalsy();
    const screen = await renderDemo();
    expect(screen.getByText(demo.disclosure)).toBeTruthy();
    expect(screen.getByText("5 points")).toBeTruthy();
    expect(screen.getByText(demo.title).props["aria-level"]).toBe(1);
    demo.events.forEach((event, i) => {
      fireEvent.press(
        screen.getByLabelText(`Open timeline entry ${i + 1}: ${event.title}`)
      );
      expect(screen.getByText(event.summary)).toBeTruthy();
    });
    expect(screen.queryByText("Edit Entry")).toBeNull();
    expect(
      screen.UNSAFE_getAllByType(Link).some((link) => link.props.href === "/register")
    ).toBe(true);
  });
  it("provides a vertical reading alternative without losing entries", async () => {
    const screen = await renderDemo();
    const expectJournalView = (list: boolean) => {
      for (const [name, selected] of [
        ["Visual timeline", !list],
        ["Read all 5 entries", list]
      ] as const) {
        const button = screen.getByRole("button", { name });
        expect(button.props["aria-pressed"]).toBe(selected);
        expect(button.props.accessibilityState.selected).toBe(selected);
      }
    };
    expectJournalView(false);
    fireEvent.press(screen.getByText("Read all 5 entries"));
    expectJournalView(true);
    demo.events.forEach((event) => expect(screen.getByText(event.summary)).toBeTruthy());
    expect(screen.queryByLabelText("Visual grow timeline flowchart")).toBeNull();
    fireEvent.press(screen.getByText("Visual timeline"));
    expectJournalView(false);
    expect(screen.getByLabelText("Visual grow timeline flowchart")).toBeTruthy();
  });
  it("sizes standalone journal, entry and next-step cards to their content", async () => {
    const screen = await renderDemo();
    const expectContentSize = (testID: string) =>
      expect(StyleSheet.flatten(screen.getByTestId(testID).props.style)).toMatchObject({
        flexBasis: "auto",
        flexGrow: 0
      });
    expectContentSize("demo-journal-card");
    expectContentSize("demo-next-step-card");
    fireEvent.press(screen.getByRole("button", { name: "Read all 5 entries" }));
    demo.events.forEach((event) => expectContentSize(`demo-entry-${event.id}`));
  });
  it("shares the default public demo path without a current query or account", async () => {
    jest
      .mocked(sharePublicLink)
      .mockResolvedValue({ method: "web-clipboard", url: "https://growpathai.com/demo" });
    const screen = await renderDemo();
    fireEvent.press(screen.getByText("Share this demo"));
    await waitFor(() => expect(screen.getByText("Demo link copied.")).toBeTruthy());
    expect(sharePublicLink).toHaveBeenCalledWith(
      "GrowPathAI — synthetic grow journal demo",
      "/demo"
    );
  });
  it.each(stories)(
    "opens and shares only the allowlisted %s story",
    async (story, label, path) => {
      jest.mocked(useLocalSearchParams).mockReturnValue({
        story,
        growId: "private-grow",
        token: "private-token",
        name: "Private Person",
        referrer: "https://example.com/private",
        utm_source: "private-campaign"
      });
      jest.mocked(sharePublicLink).mockResolvedValue({
        method: "web-clipboard",
        url: `https://growpathai.com${path}`
      });
      const screen = await renderDemo();

      expect(
        screen.getByLabelText(`Explore ${label}`).props.accessibilityState.selected
      ).toBe(true);
      const address = screen
        .UNSAFE_getAllByType(Link)
        .find((link) => link.props.href === path);
      expect(address).toBeTruthy();
      expect(
        screen.queryByText(/private-grow|private-token|Private Person|private-campaign/)
      ).toBeNull();
      fireEvent.press(screen.getByText("Share this demo"));
      await waitFor(() => expect(screen.getByText("Demo link copied.")).toBeTruthy());
      expect(sharePublicLink).toHaveBeenCalledWith(
        "GrowPathAI — synthetic grow journal demo",
        path
      );
      expect(mockPush).not.toHaveBeenCalled();
    }
  );
  it.each([
    ["duplicate story", ["pro", "pro"]],
    ["conflicting stories", ["seller", "creator"]],
    ["single-value array", ["pro"]],
    ["empty story", ""],
    ["wrong case", "Pro"],
    ["unknown plan", "commercial"],
    ["encoded injection", "pro%26token%3Dprivate-token"],
    ["query injection", "seller&growId=private-grow"],
    ["external URL", "https://example.com/private"],
    ["prototype property", "__proto__"]
  ])("defaults %s to Free without reflecting supplied input", async (_, value) => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ story: value });
    jest
      .mocked(sharePublicLink)
      .mockResolvedValue({ method: "web-clipboard", url: "https://growpathai.com/demo" });
    const screen = await renderDemo();
    expect(
      screen.getByLabelText("Explore Free · around the house").props.accessibilityState
        .selected
    ).toBe(true);
    fireEvent.press(screen.getByText("Share this demo"));
    await waitFor(() =>
      expect(sharePublicLink).toHaveBeenCalledWith(
        "GrowPathAI — synthetic grow journal demo",
        "/demo"
      )
    );
  });
  it("pushes clean story paths and follows route changes for back/forward navigation", async () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ story: "pro", token: "private-token" });
    const screen = await renderDemo();
    fireEvent.press(screen.getByText("Read all 5 entries"));
    fireEvent.press(screen.getByLabelText("Explore Pro · more growing room"));
    expect(mockPush).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Explore Commercial · educators & hosts"));
    expect(mockPush).toHaveBeenLastCalledWith("/demo?story=creator");

    // The router, not an independent component state, selects direct/history links.
    for (const story of ["creator", "pro", "creator"]) {
      jest.mocked(useLocalSearchParams).mockReturnValue({ story });
      screen.rerender(<PublicGrowDemo />);
      const [, label] = stories.find(([id]) => id === story)!;
      expect(
        screen.getByLabelText(`Explore ${label}`).props.accessibilityState.selected
      ).toBe(true);
      demo.events.forEach((event) =>
        expect(screen.getByText(event.summary)).toBeTruthy()
      );
    }
    fireEvent.press(screen.getByLabelText("Explore Free · around the house"));
    expect(mockPush).toHaveBeenLastCalledWith("/demo");
    expect(mockPush).toHaveBeenCalledTimes(2);
  });
  it("does not show a late sharing result for a different story", async () => {
    let finishShare!: (result: Awaited<ReturnType<typeof sharePublicLink>>) => void;
    jest.mocked(sharePublicLink).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishShare = resolve;
        })
    );
    jest.mocked(useLocalSearchParams).mockReturnValue({ story: "pro" });
    const screen = await renderDemo();
    fireEvent.press(screen.getByText("Share this demo"));
    jest.mocked(useLocalSearchParams).mockReturnValue({ story: "creator" });
    screen.rerender(<PublicGrowDemo />);
    await act(async () =>
      finishShare({
        method: "web-clipboard",
        url: "https://growpathai.com/demo?story=pro"
      })
    );
    expect(screen.queryByText("Demo link copied.")).toBeNull();
  });
  it("does not claim a copy succeeded when sharing is canceled", async () => {
    jest.mocked(sharePublicLink).mockRejectedValue(new Error("canceled"));
    const screen = await renderDemo();
    fireEvent.press(screen.getByText("Share this demo"));
    await waitFor(() =>
      expect(screen.getByText(/Sharing was canceled or unavailable/)).toBeTruthy()
    );
  });
});
