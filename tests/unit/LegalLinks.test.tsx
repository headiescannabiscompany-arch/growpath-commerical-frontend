import React from "react";
import { render } from "@testing-library/react-native";

import LegalLinks from "@/components/LegalLinks";

describe("LegalLinks", () => {
  it("shows release-required legal, support, and account deletion links", () => {
    const screen = render(<LegalLinks />);

    expect(screen.getByText("Privacy")).toBeTruthy();
    expect(screen.getByText("Terms")).toBeTruthy();
    expect(screen.getByText("Support")).toBeTruthy();
    expect(screen.getByText("Delete account")).toBeTruthy();
  });
});
