import React from "react";
import { render } from "@testing-library/react-native";

import SupportPage from "@/app/support";

describe("SupportPage", () => {
  it("routes support requests to the live GrowPath aliases", () => {
    const screen = render(<SupportPage />);

    expect(screen.getByText("Support")).toBeTruthy();
    expect(
      screen.getByText(
        /account, billing, orders, sales, technical, privacy, legal, security, commercial, courses, live events, partner, and facility support/
      )
    ).toBeTruthy();
    expect(screen.getAllByText(/support@growpathai\.com/).length).toBeGreaterThanOrEqual(
      2
    );
    expect(screen.getByText(/Email billing@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email orders@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email sales@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email commercial@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email courses@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email live@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email facility@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email partners@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email contact@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email privacy@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email legal@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email security@growpathai\.com/)).toBeTruthy();
    expect(screen.queryByText(/Email noreply@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email notifications@growpathai\.com/)).toBeNull();
  });
});
