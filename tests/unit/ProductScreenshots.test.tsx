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
    "grow-stores",
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
  it.each(["features", "commercial-cultivation", "grow-stores"])(
    "opens only the bundled screenshots shown on %s, never private app routes or supplied IDs",
    (page) => {
      const screen = render(<ProductScreenshots page={page} />);
      const links = screen.UNSAFE_getAllByType(Link);
      expect(links.map((link) => link.props.href)).toEqual(
        shots.filter((shot) => shot.pages.includes(page)).map((shot) => shot.image)
      );
      expect(links.every((link) => link.props.target === "_blank")).toBe(true);
      expect(screen.queryByText("Run Diagnosis")).toBeNull();
      expect(screen.queryByText("Refresh")).toBeNull();
    }
  );
});
