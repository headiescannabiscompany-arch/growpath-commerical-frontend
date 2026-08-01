import React from "react";
import { render } from "@testing-library/react-native";

import SupportPage, { createSupportStyles } from "@/app/support";
import { getThemePalette } from "@/theme/appTheme";

let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams
}));

describe("SupportPage", () => {
  beforeEach(() => {
    mockParams = {};
  });

  it("routes support request topics to the confirmed specialized inboxes", () => {
    const screen = render(<SupportPage />);

    expect(screen.getByText("Support")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Support" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Send a Support Email" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Direct Inboxes" })).toBeTruthy();
    expect(
      screen.getByText(
        /account, billing, orders, sales, technical, privacy, legal, security, commercial, courses, live events, partner, and facility support/
      )
    ).toBeTruthy();
    expect(screen.getAllByText(/support@growpathai\.com/).length).toBeGreaterThanOrEqual(
      2
    );
    expect(screen.getAllByText("Billing").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Orders").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Commercial / Storefront")).toBeTruthy();
    expect(screen.getByText("Privacy Requests")).toBeTruthy();
    expect(screen.getByText("Legal Notices")).toBeTruthy();
    expect(screen.getByText("Security Reports")).toBeTruthy();
    expect(screen.getByText(/Email billing@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email privacy@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email legal@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email security@growpathai\.com/)).toBeTruthy();
    expect(screen.queryByText(/Email noreply@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email notifications@growpathai\.com/)).toBeNull();
  });

  it("uses the active Night palette across the complete support surface", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createSupportStyles(palette);

    expect(styles.root.backgroundColor).toBe(palette.page);
    expect(styles.title.color).toBe(palette.text);
    expect(styles.intro.color).toBe(palette.textSoft);
    expect(styles.form.backgroundColor).toBe(palette.surface);
    expect(styles.form.borderColor).toBe(palette.border);
    expect(styles.topicButton.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.topicButtonActive.backgroundColor).toBe(palette.accent);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.borderColor).toBe(palette.border);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.sectionTitle.color).toBe(palette.text);
    expect(styles.body.color).toBe(palette.textSoft);
  });

  it("prefills structured bug report details from query params", () => {
    mockParams = {
      topic: "technical",
      name: "Grower",
      email: "grower@example.com",
      accountEmail: "account@example.com",
      subject: "Bug report - personal - Personal profile",
      message:
        "Bug report\n\nWho:\n- Account email: account@example.com\n\nWhat is wrong:\n- "
    };

    const screen = render(<SupportPage />);

    expect(screen.getByDisplayValue("Grower")).toBeTruthy();
    expect(screen.getByDisplayValue("grower@example.com")).toBeTruthy();
    expect(screen.getByDisplayValue("account@example.com")).toBeTruthy();
    expect(
      screen.getByDisplayValue("Bug report - personal - Personal profile")
    ).toBeTruthy();
    expect(screen.getByDisplayValue(/What is wrong/)).toBeTruthy();
    expect(screen.getByText("Technical")).toBeTruthy();
  });
});
