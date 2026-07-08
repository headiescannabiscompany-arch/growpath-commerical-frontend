import React from "react";
import { render } from "@testing-library/react-native";

import PrivacyPage from "../../src/app/privacy";
import TermsPage from "../../src/app/terms";

describe("public policy contact aliases", () => {
  it("routes privacy, legal, security, and support contact copy to live aliases", () => {
    const privacy = render(<PrivacyPage />);

    expect(privacy.getByText(/privacy@growpathai\.com/)).toBeTruthy();
    expect(privacy.getByText(/legal@growpathai\.com/)).toBeTruthy();
    expect(privacy.getByText(/security@growpathai\.com/)).toBeTruthy();

    const terms = render(<TermsPage />);

    expect(terms.getByText(/legal@growpathai\.com/)).toBeTruthy();
    expect(terms.getByText(/support@growpathai\.com/)).toBeTruthy();
  });
});
