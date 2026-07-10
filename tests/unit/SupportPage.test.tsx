import React from "react";
import { render } from "@testing-library/react-native";

import SupportPage from "@/app/support";

describe("SupportPage", () => {
  it("routes support request topics to the support inbox", () => {
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
    expect(screen.getByText("Billing")).toBeTruthy();
    expect(screen.getByText("Orders")).toBeTruthy();
    expect(screen.getByText("Commercial / Storefront")).toBeTruthy();
    expect(screen.getByText("Privacy Requests")).toBeTruthy();
    expect(screen.getByText("Legal Notices")).toBeTruthy();
    expect(screen.getByText("Security Reports")).toBeTruthy();
    expect(screen.queryByText(/Email billing@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email privacy@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email legal@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email security@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email noreply@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email notifications@growpathai\.com/)).toBeNull();
  });
});
