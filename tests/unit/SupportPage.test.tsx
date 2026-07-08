import React from "react";
import { render } from "@testing-library/react-native";

import SupportPage from "@/app/support";

describe("SupportPage", () => {
  it("routes support requests to the live GrowPath aliases", () => {
    const screen = render(<SupportPage />);

    expect(screen.getByText("Support")).toBeTruthy();
    expect(screen.getAllByText(/support@growpathai\.com/).length).toBeGreaterThanOrEqual(
      2
    );
    expect(screen.getByText(/Email billing@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email commercial@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email facility@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email privacy@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email legal@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email security@growpathai\.com/)).toBeTruthy();
  });
});
