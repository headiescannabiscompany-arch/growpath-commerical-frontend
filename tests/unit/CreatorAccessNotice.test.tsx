import React from "react";
import { Linking } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import CreatorAccessNotice from "@/components/courses/CreatorAccessNotice";

describe("CreatorAccessNotice", () => {
  it("explains universal course publishing and prepares a complete trial application", () => {
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(true as any);
    const screen = render(<CreatorAccessNotice accountEmail="creator@example.com" />);

    expect(
      screen.getByText(/All GrowPathAI users can create and publish free or paid courses/)
    ).toBeTruthy();
    expect(screen.getByText(/courses remain intact and available/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Apply for 30-day Creator access"));

    expect(openUrl).toHaveBeenCalledWith(
      expect.stringContaining("mailto:support@growpathai.com")
    );
    expect(decodeURIComponent(String(openUrl.mock.calls[0][0]))).toContain(
      "GrowPathAI account email: creator@example.com"
    );
    openUrl.mockRestore();
  });
});
