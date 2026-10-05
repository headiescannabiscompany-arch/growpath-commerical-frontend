import React from "react";
import { render } from "@testing-library/react-native";
import { Link } from "expo-router";
import ProductScreenshots from "@/components/marketing/ProductScreenshots";
import shots from "@/components/marketing/productScreenshots.json";

describe("reviewed public product screenshots", () => {
  it.each([
    "features",
    "personal-grower",
    "facility-management",
    "commercial-cultivation",
    "demo",
    "about",
    "pricing"
  ])("shows only the reviewed images for %s", (page) => {
    const screen = render(<ProductScreenshots page={page} />);
    for (const shot of shots) {
      if (shot.pages.includes(page)) {
        expect(screen.getByLabelText(shot.alt)).toBeTruthy();
        expect(screen.getByText(shot.caption)).toBeTruthy();
      } else expect(screen.queryByText(shot.title)).toBeNull();
    }
  });
  it("opens only bundled public screenshots, never private app routes or supplied IDs", () => {
    const screen = render(<ProductScreenshots page="demo" />);
    const links = screen.UNSAFE_getAllByType(Link);
    expect(links.map((link) => link.props.href)).toEqual(shots.map((shot) => shot.image));
    expect(links.every((link) => link.props.target === "_blank")).toBe(true);
    expect(screen.queryByText("Run Diagnosis")).toBeNull();
    expect(screen.queryByText("Refresh")).toBeNull();
  });
});
