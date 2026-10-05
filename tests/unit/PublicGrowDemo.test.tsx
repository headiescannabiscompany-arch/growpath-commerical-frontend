import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import { Link } from "expo-router";
import PublicGrowDemo from "@/app/demo";
import demo from "@/components/marketing/syntheticGrowDemo.json";
import { getRoutePolicy } from "@/navigation/routeAccess";
import { sharePublicLink } from "@/utils/publicLinks";
import { getPublicTestimonials } from "@/api/testimonials";

jest.mock("@/utils/publicLinks", () => ({ sharePublicLink: jest.fn() }));
jest.mock("@/api/testimonials", () => ({ getPublicTestimonials: jest.fn() }));

async function renderDemo() {
  const screen = render(<PublicGrowDemo />);
  await act(async () => {});
  return screen;
}

describe("public synthetic grow demo", () => {
  beforeEach(() => {
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
    jest
      .mocked(getPublicTestimonials)
      .mockResolvedValueOnce([
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
    fireEvent.press(screen.getByText("Read all 5 entries"));
    demo.events.forEach((event) => expect(screen.getByText(event.summary)).toBeTruthy());
    expect(screen.queryByLabelText("Visual grow timeline flowchart")).toBeNull();
    fireEvent.press(screen.getByText("Visual timeline"));
    expect(screen.getByLabelText("Visual grow timeline flowchart")).toBeTruthy();
  });
  it("shares only the fixed public demo path, never the current query or account", async () => {
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
  it("does not claim a copy succeeded when sharing is canceled", async () => {
    jest.mocked(sharePublicLink).mockRejectedValue(new Error("canceled"));
    const screen = await renderDemo();
    fireEvent.press(screen.getByText("Share this demo"));
    await waitFor(() =>
      expect(screen.getByText(/Sharing was canceled or unavailable/)).toBeTruthy()
    );
  });
});
