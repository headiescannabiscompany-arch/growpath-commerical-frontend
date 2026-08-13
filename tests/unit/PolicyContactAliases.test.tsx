import React from "react";
import { render } from "@testing-library/react-native";

import PrivacyPage from "../../src/app/privacy";
import TermsPage from "../../src/app/terms";
import { createPublicInfoPageStyles } from "../../src/components/PublicInfoPage";
import { getThemePalette } from "../../src/theme/appTheme";

describe("public policy contact aliases", () => {
  it("routes policy contact copy to the specialized live aliases", () => {
    const privacy = render(<PrivacyPage />);

    expect(privacy.getByRole("header", { name: "Privacy Policy" })).toBeTruthy();
    expect(privacy.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(privacy.getByText(/privacy questions.*privacy@growpathai\.com/i)).toBeTruthy();
    expect(privacy.getByText(/legal notices.*legal@growpathai\.com/i)).toBeTruthy();
    expect(privacy.getByText(/security reports.*security@growpathai\.com/i)).toBeTruthy();

    const terms = render(<TermsPage />);

    expect(terms.getByRole("header", { name: "Terms of Service" })).toBeTruthy();
    expect(terms.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(
      terms.getByText(/terms, legal, or account notices.*legal@growpathai\.com/i)
    ).toBeTruthy();
    expect(terms.getByText(/support@growpathai\.com/)).toBeTruthy();
  });

  it("uses the active Night palette for every shared policy surface", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createPublicInfoPageStyles(palette);

    expect(styles.root.backgroundColor).toBe(palette.page);
    expect(styles.backRow.marginBottom).toBe(18);
    expect(styles.brand.color).toBe(palette.accent);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.updated.color).toBe(palette.textMuted);
    expect(styles.intro.color).toBe(palette.textSoft);
    expect(styles.section.borderTopColor).toBe(palette.border);
    expect(styles.sectionTitle.color).toBe(palette.text);
    expect(styles.body.color).toBe(palette.textSoft);
  });
});
