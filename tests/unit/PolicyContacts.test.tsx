import React from "react";
import { render } from "@testing-library/react-native";

import PrivacyPage from "@/app/privacy";
import TermsPage from "@/app/terms";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() })
}));

describe("owner-confirmed policy contacts", () => {
  it.each([
    ["Privacy Policy", PrivacyPage, "October 4, 2026"],
    ["Terms of Service", TermsPage, "September 21, 2026"]
  ] as const)("shows the monitored mailbox on %s", (title, Page, updated) => {
    const screen = render(<Page />);
    expect(screen.getByRole("header", { name: title })).toBeTruthy();
    expect(screen.getByText(/admin@growpathai\.com/)).toBeTruthy();
    expect(screen.queryByText(/privacy@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/legal@growpathai\.com/)).toBeNull();
    expect(screen.getByText(`Last updated: ${updated}`)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });
});
