import React from "react";
import { render } from "@testing-library/react-native";

import DeleteAccountPage from "@/app/account/delete";

describe("DeleteAccountPage", () => {
  it("uses the live support inbox for assisted deletion", () => {
    const screen = render(<DeleteAccountPage />);

    expect(screen.getByText("Delete Account")).toBeTruthy();
    expect(screen.getByText(/Email support@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/request account deletion/)).toBeTruthy();
  });
});
