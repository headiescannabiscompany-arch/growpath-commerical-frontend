import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import { Link } from "expo-router";
import DemoExplorer from "@/components/marketing/DemoExplorer";
import audiences from "@/components/marketing/demoAudiences.json";
import type { DemoStoryId } from "@/utils/demoStoryLink";

const stories: Array<[DemoStoryId, string, number]> = [
  ["free", "Free · around the house", 0],
  ["pro", "Pro · more growing room", 1],
  ["seller", "Commercial · sellers", 2],
  ["creator", "Commercial · educators & hosts", 2],
  ["facility", "Facility · teams & rooms", 3]
];

describe("public role demo", () => {
  it("defaults to one tracked Free plant with bounded household care tools", () => {
    const screen = render(<DemoExplorer />);
    expect(screen.getByText(audiences[0].title)).toBeTruthy();
    expect(screen.getByText(audiences[0].limits)).toBeTruthy();
    expect(audiences[0].limits).toContain("5 AI credits per week");
    expect(audiences[0].description).toContain("around the house");
    expect(
      StyleSheet.flatten(screen.getByTestId("demo-audience-card").props.style)
    ).toMatchObject({ flexBasis: "auto", flexGrow: 0 });
  });
  it("switches five stories across four plans with their reviewed public highlights", () => {
    const screen = render(<DemoExplorer />);
    for (const [, label, audienceIndex] of stories) {
      const audience = audiences[audienceIndex];
      fireEvent.press(screen.getByLabelText(`Explore ${label}`));
      expect(
        screen.getByLabelText(`Explore ${label}`).props.accessibilityState.selected
      ).toBe(true);
      for (const [, choiceLabel] of stories) {
        expect(
          screen.getByLabelText(`Explore ${choiceLabel}`).props["aria-pressed"]
        ).toBe(choiceLabel === label);
      }
      expect(screen.getByText(audience.title)).toBeTruthy();
      for (const text of audience.highlights)
        expect(screen.getByText(`• ${text}`)).toBeTruthy();
      expect(screen.getByText(audience.caption)).toBeTruthy();
      expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
      expect(screen.getByLabelText(audience.alt)).toBeTruthy();
      expect(screen.UNSAFE_getAllByType(Link).map((link) => link.props.href)).toEqual([
        audience.image,
        audience.href
      ]);
    }
  });
  it.each(stories)(
    "opens the controlled %s story without choosing another plan",
    (story, label, audienceIndex) => {
      const onStoryChange = jest.fn();
      const screen = render(<DemoExplorer story={story} onStoryChange={onStoryChange} />);

      expect(
        screen.getByLabelText(`Explore ${label}`).props.accessibilityState.selected
      ).toBe(true);
      expect(screen.getByLabelText(`Explore ${label}`).props["aria-pressed"]).toBe(true);
      expect(screen.getByText(audiences[audienceIndex].title)).toBeTruthy();
      expect(onStoryChange).not.toHaveBeenCalled();
      fireEvent.press(screen.getByLabelText(`Explore ${label}`));
      expect(onStoryChange).not.toHaveBeenCalled();
    }
  );
  it("emits only the selected enum and follows the parent route after navigation", () => {
    const onStoryChange = jest.fn();
    const screen = render(<DemoExplorer story="seller" onStoryChange={onStoryChange} />);

    fireEvent.press(screen.getByLabelText("Explore Commercial · educators & hosts"));
    expect(onStoryChange).toHaveBeenCalledWith("creator");
    expect(onStoryChange).toHaveBeenCalledTimes(1);
    expect(
      screen.getByLabelText("Explore Commercial · sellers").props.accessibilityState
        .selected
    ).toBe(true);
    screen.rerender(<DemoExplorer story="creator" onStoryChange={onStoryChange} />);
    expect(
      screen.getByLabelText("Explore Commercial · educators & hosts").props
        .accessibilityState.selected
    ).toBe(true);
    expect(screen.getByText(audiences[2].limits)).toBeTruthy();
  });
  it("defaults invalid runtime story values to the Free highlight", () => {
    const screen = render(<DemoExplorer story={"seller&token=private" as DemoStoryId} />);
    expect(screen.getByText(audiences[0].title)).toBeTruthy();
    expect(screen.queryByText(/private/)).toBeNull();
  });
  it("keeps the intake-only qualifier with its screenshot, not the Pro plan limits", () => {
    const screen = render(<DemoExplorer story="pro" showScreenshot={false} />);
    expect(screen.getByText(audiences[1].limits)).toBeTruthy();
    expect(screen.queryByText(/This screenshot shows the intake form/)).toBeNull();
    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
    expect(screen.UNSAFE_getAllByType(Link).map((link) => link.props.href)).toEqual([
      audiences[1].href
    ]);

    screen.rerender(<DemoExplorer story="pro" showScreenshot />);
    expect(screen.getByText(audiences[1].caption)).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(screen.UNSAFE_getAllByType(Link).map((link) => link.props.href)).toEqual([
      audiences[1].image,
      audiences[1].href
    ]);
  });
  it("keeps synthetic examples and limits explicit without private destinations", () => {
    expect(audiences.map((entry) => entry.id)).toEqual([
      "free",
      "pro",
      "commercial",
      "facility"
    ]);
    for (const audience of audiences) {
      expect(audience.caption).toMatch(/synthetic/i);
      expect(audience.image).toMatch(/^\/images\/synthetic-/);
      expect(audience.highlights).toHaveLength(5);
      expect(audience.width).toBeGreaterThan(0);
      expect(audience.height).toBeGreaterThan(0);
    }
    expect(JSON.stringify(audiences)).not.toMatch(
      /@|qa\.invalid|token=|growId=|\/admin|\/home\//
    );
    expect(audiences[1].limits).not.toContain("not an AI result");
    expect(audiences[1].caption).toContain("not an AI result");
    expect(audiences[2].caption).toContain("not real sales");
  });
});
