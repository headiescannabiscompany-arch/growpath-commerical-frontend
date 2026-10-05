import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Image, Platform, StyleSheet } from "react-native";
import { Link } from "expo-router";

import DemoWalkthrough, {
  DEMO_WALKTHROUGH_IMAGES,
  MAX_DEMO_WALKTHROUGH_SCENES,
  type DemoWalkthroughStory
} from "@/components/marketing/DemoWalkthrough";
import { apiRequest } from "@/api/apiRequest";
import { getPublicTestimonials } from "@/api/testimonials";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
jest.mock("@/api/testimonials", () => ({ getPublicTestimonials: jest.fn() }));

const story: DemoWalkthroughStory = {
  id: "fixture-story",
  title: "A labeled sample record",
  description: "Inspect the existing example screens.",
  result: "This fixture shows recorded information and review controls.",
  limits: "Synthetic records do not establish customer outcomes.",
  scenes: [
    {
      id: "history",
      title: "Find the record",
      body: "Read a dated sample entry.",
      image: "/images/synthetic-timeline-ui.jpg",
      alt: "Synthetic grow timeline",
      caption: "Actual interface with synthetic records and AI-generated plant artwork.",
      width: 1280,
      height: 1000
    },
    {
      id: "review",
      title: "Review the observations",
      body: "Inspect the unsent intake fields.",
      image: "/images/synthetic-diagnosis-intake-ui.jpg",
      alt: "Synthetic unsent diagnosis intake",
      caption: "Synthetic intake only; no diagnosis was produced.",
      width: 836,
      height: 1100
    },
    {
      id: "offer",
      title: "Inspect publication controls",
      body: "Review a synthetic owner offer screen.",
      image: "/images/synthetic-commercial-offers-ui.png",
      alt: "Synthetic Commercial offers",
      caption: "Synthetic QA ratings and prices, not customer reviews or sales.",
      width: 944,
      height: 1245
    }
  ]
};

describe("bundled demo walkthrough", () => {
  it("shows one labeled screenshot, result, limits and the standalone card containment fix", () => {
    const screen = render(<DemoWalkthrough story={story} />);

    expect(screen.getByText("Step 1 of 3: Find the record")).toBeTruthy();
    expect(screen.getByText(story.result)).toBeTruthy();
    expect(screen.getByText(story.limits)).toBeTruthy();
    expect(screen.getByText(story.scenes[0].caption)).toBeTruthy();
    expect(screen.getByText(/Screenshot controls are not interactive/)).toBeTruthy();
    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(screen.getByLabelText(story.scenes[0].alt)).toBeTruthy();
    expect(screen.queryByText(story.scenes[1].caption)).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId("demo-walkthrough-card").props.style)
    ).toMatchObject({ flexBasis: "auto", flexGrow: 0 });
  });

  it("offers named steps and Previous/Next controls with disabled ends", () => {
    const screen = render(<DemoWalkthrough story={story} />);
    const previous = () => screen.getByRole("button", { name: "Previous step" });
    const next = () => screen.getByRole("button", { name: "Next step" });

    expect(previous().props.accessibilityState.disabled).toBe(true);
    fireEvent.press(previous());
    expect(screen.getByText("Step 1 of 3: Find the record")).toBeTruthy();
    fireEvent.press(next());
    expect(screen.getByText("Step 2 of 3: Review the observations")).toBeTruthy();
    expect(previous().props.accessibilityState.disabled).toBe(false);
    fireEvent.press(next());
    expect(screen.getByText("Step 3 of 3: Inspect publication controls")).toBeTruthy();
    expect(next().props.accessibilityState.disabled).toBe(true);
    fireEvent.press(next());
    expect(screen.getByText("Step 3 of 3: Inspect publication controls")).toBeTruthy();
    fireEvent.press(previous());
    expect(screen.getByText("Step 2 of 3: Review the observations")).toBeTruthy();

    fireEvent.press(screen.getByRole("button", { name: "Show step 1: Find the record" }));
    expect(
      screen.getByLabelText("Show step 1: Find the record").props.accessibilityState
    ).toEqual({ selected: true });
    expect(screen.UNSAFE_getAllByType(Image)).toHaveLength(1);
    expect(StyleSheet.flatten(next().props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it("resets to step one when story identity changes", () => {
    const screen = render(<DemoWalkthrough story={story} />);
    fireEvent.press(screen.getByLabelText("Show step 3: Inspect publication controls"));

    screen.rerender(<DemoWalkthrough story={{ ...story, id: "second-story" }} />);

    expect(screen.getByText("Step 1 of 3: Find the record")).toBeTruthy();
    expect(screen.getByLabelText("Previous step").props.accessibilityState.disabled).toBe(
      true
    );
  });

  it("keeps web pressed state and native selection in sync for every step", () => {
    const screen = render(<DemoWalkthrough story={story} />);
    const expectSelectedStep = (selected: number) => {
      story.scenes.forEach((scene, index) => {
        const button = screen.getByLabelText(`Show step ${index + 1}: ${scene.title}`);
        expect(button.props["aria-pressed"]).toBe(index === selected);
        expect(button.props.accessibilityState.selected).toBe(index === selected);
      });
    };

    expectSelectedStep(0);
    fireEvent.press(screen.getByLabelText("Next step"));
    expectSelectedStep(1);
    fireEvent.press(screen.getByLabelText("Show step 3: Inspect publication controls"));
    expectSelectedStep(2);
    fireEvent.press(screen.getByLabelText("Previous step"));
    expectSelectedStep(1);
    screen.rerender(<DemoWalkthrough story={{ ...story, id: "second-story" }} />);
    expectSelectedStep(0);
  });

  it.each(["web", "ios"] as const)(
    "uses only the bundled image and public full-size destination on %s",
    (platform) => {
      const override = jest.replaceProperty(Platform, "OS", platform);
      try {
        const screen = render(<DemoWalkthrough story={story} />);
        const image = screen.getByLabelText(story.scenes[0].alt);
        expect(image.props.source.uri).toBe(
          `${platform === "web" ? "" : "https://growpathai.com"}${story.scenes[0].image}`
        );
        const links = screen.UNSAFE_getAllByType(Link);
        expect(links).toHaveLength(1);
        expect(links[0].props).toMatchObject({
          href: story.scenes[0].image,
          target: "_blank",
          rel: "noopener noreferrer"
        });
      } finally {
        override.restore();
      }
    }
  );

  it.each([
    "https://example.com/private.png",
    "/api/evidence/private.png",
    "/images/unreviewed.png",
    "/images/../private.png",
    `${DEMO_WALKTHROUGH_IMAGES[0]}?token=private`
  ])("withholds an unreviewed image and full-size link: %s", (image) => {
    const screen = render(
      <DemoWalkthrough
        story={{
          ...story,
          scenes: [{ ...story.scenes[0], image: image as never }]
        }}
      />
    );
    expect(screen.queryAllByRole("image")).toHaveLength(0);
    expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
    expect(screen.UNSAFE_queryAllByType(Link)).toHaveLength(0);
    expect(screen.getByText("Screenshot unavailable for this step.")).toBeTruthy();
  });

  it.each([0, MAX_DEMO_WALKTHROUGH_SCENES + 1])(
    "handles an unavailable %s-scene collection without navigation or an image",
    (length) => {
      const screen = render(
        <DemoWalkthrough
          story={{
            ...story,
            scenes: Array.from({ length }, (_, index) => ({
              ...story.scenes[0],
              id: String(index)
            }))
          }}
        />
      );
      expect(screen.getByText("No walkthrough steps are available yet.")).toBeTruthy();
      expect(screen.queryAllByRole("button")).toHaveLength(0);
      expect(screen.UNSAFE_queryAllByType(Image)).toHaveLength(0);
      expect(screen.UNSAFE_queryAllByType(Link)).toHaveLength(0);
      expect(screen.getByText(story.limits)).toBeTruthy();
    }
  );

  it("handles one step and a shorter replacement collection safely", () => {
    const screen = render(<DemoWalkthrough story={story} />);
    fireEvent.press(screen.getByLabelText("Show step 3: Inspect publication controls"));
    screen.rerender(
      <DemoWalkthrough story={{ ...story, scenes: story.scenes.slice(0, 1) }} />
    );
    expect(screen.getByText("Step 1 of 1: Find the record")).toBeTruthy();
    expect(screen.getByLabelText("Previous step").props.accessibilityState.disabled).toBe(
      true
    );
    expect(screen.getByLabelText("Next step").props.accessibilityState.disabled).toBe(
      true
    );
  });

  it("does not call account, record, or testimonial APIs while reading steps", () => {
    const screen = render(<DemoWalkthrough story={story} />);
    fireEvent.press(screen.getByLabelText("Next step"));
    fireEvent.press(screen.getByLabelText("Previous step"));
    expect(apiRequest).not.toHaveBeenCalled();
    expect(getPublicTestimonials).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
