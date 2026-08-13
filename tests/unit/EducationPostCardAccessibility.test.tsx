import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import EducationPostCard from "@/components/feed/EducationPostCard";

describe("EducationPostCard accessibility", () => {
  it("exposes a named link with a touch-sized target", () => {
    const onPress = jest.fn();
    const screen = render(
      <EducationPostCard
        title="Integrated pest management basics"
        cta="Read the guide"
        onPress={onPress}
      />
    );

    const link = screen.getByLabelText("Read the guide");
    expect(link.props.accessibilityRole).toBe("link");
    expect(link.props.style).toEqual(expect.objectContaining({ minHeight: 44 }));

    fireEvent.press(link);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("falls back to the education title for its accessible name", () => {
    const screen = render(
      <EducationPostCard title="Healthy roots" body="Learn the visual signals." />
    );

    expect(screen.getByLabelText("Healthy roots")).toBeTruthy();
  });
});
