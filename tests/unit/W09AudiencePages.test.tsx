import React from "react";
import { render } from "@testing-library/react-native";
import { AppState, StyleSheet } from "react-native";
import { Link } from "expo-router";
import PublicLandingPage from "@/components/marketing/PublicLandingPage";
import shots from "@/components/marketing/productScreenshots.json";
import { getPublicTestimonials } from "@/api/testimonials";

jest.mock("@/api/testimonials", () => ({
  getPublicTestimonials: jest.fn(() => new Promise(() => {}))
}));

describe("W09 audience destinations", () => {
  beforeEach(() => {
    jest.mocked(getPublicTestimonials).mockImplementation(() => new Promise(() => {}));
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation(() => ({ remove: jest.fn() }));
  });

  it("keeps the existing nursery propagation and selection features discoverable", () => {
    const screen = render(<PublicLandingPage page="nurseries-breeders" />);
    expect(screen.getByText("Propagation")).toBeTruthy();
    expect(screen.getByText("Selection")).toBeTruthy();
    expect(screen.getByText(/mother-plant, clone and tissue-culture/)).toBeTruthy();
    expect(
      screen.getByText(/genetics notes, phenotype scores, stress and recovery/)
    ).toBeTruthy();
  });

  it("does not require video or a Commercial subscription for every course", () => {
    const screen = render(<PublicLandingPage page="creators-educators" />);
    expect(
      screen.getByText(/All users can create and publish free or paid courses/)
    ).toBeTruthy();
    expect(
      screen.getByText(/Video is optional; text lessons are supported too/)
    ).toBeTruthy();
  });

  it("preserves recurring work and inventory usage in the Facility narrative", () => {
    const screen = render(<PublicLandingPage page="facility-management" />);
    expect(screen.getByText(/Assign recurring work/)).toBeTruthy();
    expect(screen.getByText(/record inventory usage/)).toBeTruthy();
  });

  it("preserves product organization and community paths in the store narrative", () => {
    const screen = render(<PublicLandingPage page="grow-stores" />);
    expect(screen.getByText(/product lines, product pages, links, inventory context/)).toBeTruthy();
    expect(screen.getByText(/Forum Q&A for customer questions and Feed campaigns/)).toBeTruthy();
  });

  it("preserves permitted course source material and viewer-controlled reminders", () => {
    const screen = render(<PublicLandingPage page="creators-educators" />);
    expect(screen.getByText(/grow timelines, logs, photos, recipes, tool results, and forum answers/)).toBeTruthy();
    expect(screen.getByText(/you own or have permission to share/)).toBeTruthy();
    expect(screen.getByText(/eligible viewers can RSVP and use in-app reminders/)).toBeTruthy();
  });

  it.each([
    ["personal-grower", "free", "See the Free plant journal"],
    ["grow-journal-app", "pro", "See the Pro grow-record workflow"],
    ["commercial-cultivation", "seller", "See the seller workflow"],
    ["grow-stores", "seller", "See the seller workflow"],
    ["creators-educators", "creator", "See the creator workflow"],
    ["facility-management", "facility", "See the Facility team workflow"],
    ["nurseries-breeders", "facility", "See shared team records"]
  ] as const)("opens the matching public story from %s", (page, story, label) => {
    const dimensions = jest
      .spyOn(require("react-native"), "useWindowDimensions")
      .mockReturnValue({ width: 375, height: 812, scale: 1, fontScale: 1 });
    try {
      const screen = render(<PublicLandingPage page={page} />);
      const storyLinks = screen
        .UNSAFE_getAllByType(Link)
        .filter((link) => link.props.children === label);

      expect(storyLinks).toHaveLength(1);
      expect(storyLinks[0].props.href).toBe(`/demo?story=${story}`);
      expect(StyleSheet.flatten(storyLinks[0].props.style)).toEqual(
        expect.objectContaining({ width: "100%", minHeight: 44 })
      );
      expect(screen.queryByText("Explore features")).toBeNull();
    } finally {
      dimensions.mockRestore();
    }
  });

  it.each(["commercial-cultivation", "grow-stores"] as const)(
    "shows Commercial evidence and its accurate full-size destination on %s",
    (page) => {
      const screen = render(<PublicLandingPage page={page} />);
      const commercial = shots.find((shot) => shot.id === "commercial")!;
      const facility = shots.find((shot) => shot.id === "facility")!;

      expect(screen.getByLabelText(commercial.alt)).toBeTruthy();
      expect(screen.getByText(commercial.caption)).toBeTruthy();
      expect(commercial.caption).toContain("synthetic QA fixtures");
      expect(commercial.caption).toContain("not real sales, customer reviews");
      expect(screen.queryByLabelText(facility.alt)).toBeNull();
      const fullSize = screen
        .UNSAFE_getAllByType(Link)
        .find((link) => link.props.href === commercial.image)!;
      expect(fullSize.props.children.flat().join("")).toBe(
        "Open full-size Commercial offers screenshot"
      );
      expect(fullSize.props.target).toBe("_blank");
    }
  );
});
