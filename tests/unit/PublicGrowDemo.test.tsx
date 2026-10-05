import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Link } from "expo-router";
import PublicGrowDemo from "@/app/demo";
import demo from "@/components/marketing/syntheticGrowDemo.json";
import { getRoutePolicy } from "@/navigation/routeAccess";
import { sharePublicLink } from "@/utils/publicLinks";

jest.mock("@/utils/publicLinks", () => ({ sharePublicLink: jest.fn() }));

describe("public synthetic grow demo", () => {
  it("is public with five selectable entries, synthetic disclosure and no account actions", () => {
    expect(getRoutePolicy("/demo")).toBeFalsy();
    const screen = render(<PublicGrowDemo />);
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
  it("provides a vertical reading alternative without losing entries", () => {
    const screen = render(<PublicGrowDemo />);
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
    const screen = render(<PublicGrowDemo />);
    fireEvent.press(screen.getByText("Share this demo"));
    await waitFor(() => expect(screen.getByText("Demo link copied.")).toBeTruthy());
    expect(sharePublicLink).toHaveBeenCalledWith(
      "GrowPathAI — synthetic grow journal demo",
      "/demo"
    );
  });
  it("does not claim a copy succeeded when sharing is canceled", async () => {
    jest.mocked(sharePublicLink).mockRejectedValue(new Error("canceled"));
    const screen = render(<PublicGrowDemo />);
    fireEvent.press(screen.getByText("Share this demo"));
    await waitFor(() =>
      expect(screen.getByText(/Sharing was canceled or unavailable/)).toBeTruthy()
    );
  });
});
