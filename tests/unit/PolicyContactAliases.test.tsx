import React from "react";
import { render } from "@testing-library/react-native";

import PrivacyPage from "../../src/app/privacy";
import TermsPage from "../../src/app/terms";

describe("public policy contact aliases", () => {
  it("routes privacy, legal, security, and support contact copy to the support inbox", () => {
    const privacy = render(<PrivacyPage />);

    expect(privacy.getByText(/privacy questions.*support@growpathai\.com/i)).toBeTruthy();
    expect(privacy.getByText(/legal notices.*support@growpathai\.com/i)).toBeTruthy();
    expect(privacy.getByText(/security reports.*support@growpathai\.com/i)).toBeTruthy();

    const terms = render(<TermsPage />);

    expect(terms.getByText(/terms, legal, or account notices.*support@growpathai\.com/i)).toBeTruthy();
    expect(terms.getByText(/support@growpathai\.com/)).toBeTruthy();
  });
});
