import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Image } from "react-native";
import { Link } from "expo-router";
import DemoExplorer from "@/components/marketing/DemoExplorer";
import audiences from "@/components/marketing/demoAudiences.json";

describe("public role demo", () => {
  it("defaults to one tracked Free plant with bounded household care tools", () => {
    const screen = render(<DemoExplorer />);
    expect(screen.getByText(audiences[0].title)).toBeTruthy();
    expect(screen.getByText(audiences[0].limits)).toBeTruthy();
    expect(audiences[0].limits).toContain("5 AI credits per week");
    expect(audiences[0].description).toContain("around the house");
  });
  it("switches every role's highlights, reviewed screenshot and public destinations", () => {
    const screen = render(<DemoExplorer />);
    for (const audience of audiences) {
      fireEvent.press(screen.getByLabelText(`Explore ${audience.label}`));
      expect(
        screen.getByLabelText(`Explore ${audience.label}`).props.accessibilityState
          .selected
      ).toBe(true);
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
    expect(audiences[1].limits).toContain("not an AI result");
    expect(audiences[2].caption).toContain("not real sales");
  });
});
