import React from "react";
import { render } from "@testing-library/react-native";

import PrivacyPage from "@/app/privacy";
import TermsPage from "@/app/terms";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() })
}));

describe("owner-confirmed policy contacts", () => {
  it.each([
    ["Privacy Policy", PrivacyPage],
    ["Terms of Service", TermsPage]
  ] as const)("shows the monitored mailbox on %s", (title, Page) => {
    const screen = render(<Page />);
    expect(screen.getByRole("header", { name: title })).toBeTruthy();
    expect(screen.getByText(/admin@growpathai\.com/)).toBeTruthy();
    expect(screen.queryByText(/privacy@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/legal@growpathai\.com/)).toBeNull();
    expect(screen.getByText("Last updated: September 21, 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });
});
