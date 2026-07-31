import React from "react";
import { render } from "@testing-library/react-native";

import PrivacyPage from "../../src/app/privacy";
import TermsPage from "../../src/app/terms";

describe("public policy contact aliases", () => {
  it("routes policy contact copy to the specialized live aliases", () => {
    const privacy = render(<PrivacyPage />);

    expect(privacy.getByRole("header", { name: "Privacy Policy" })).toBeTruthy();
    expect(privacy.getByText(/privacy questions.*privacy@growpathai\.com/i)).toBeTruthy();
    expect(privacy.getByText(/legal notices.*legal@growpathai\.com/i)).toBeTruthy();
    expect(privacy.getByText(/security reports.*security@growpathai\.com/i)).toBeTruthy();

    const terms = render(<TermsPage />);

    expect(terms.getByRole("header", { name: "Terms of Service" })).toBeTruthy();
    expect(
      terms.getByText(/terms, legal, or account notices.*legal@growpathai\.com/i)
    ).toBeTruthy();
    expect(terms.getByText(/support@growpathai\.com/)).toBeTruthy();
  });
});
