import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import BackButton from "@/components/nav/BackButton";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack
  })
}));

describe("BackButton navigation policy", () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockReplace.mockReset();
    mockCanGoBack.mockReset();
  });

  it("uses browser history for ordinary nested navigation", () => {
    mockCanGoBack.mockReturnValue(true);
    const screen = render(<BackButton fallbackHref="/home/personal/grows" />);

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("uses the exact source fallback when the route prefers it", () => {
    mockCanGoBack.mockReturnValue(true);
    const screen = render(
      <BackButton fallbackHref="/home/personal/grows/grow-1/journal" preferFallback />
    );

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows/grow-1/journal");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("uses the fallback when no browser history exists", () => {
    mockCanGoBack.mockReturnValue(false);
    const screen = render(<BackButton fallbackHref="/home/personal/grows" />);

    fireEvent.press(screen.getByLabelText("Back"));

    expect(mockReplace).toHaveBeenCalledWith("/home/personal/grows");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
