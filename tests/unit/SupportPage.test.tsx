import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import SupportPage from "@/app/support";
import { sendSupportContact } from "@/api/support";

jest.mock("@/api/support", () => ({
  sendSupportContact: jest.fn()
}));

const mockSendSupportContact = sendSupportContact as jest.Mock;

describe("SupportPage", () => {
  beforeEach(() => {
    mockSendSupportContact.mockReset();
    mockSendSupportContact.mockResolvedValue({
      ok: true,
      emailSent: true,
      providerMessageId: "email_123"
    });
  });

  it("routes support requests to the live GrowPath aliases", () => {
    const screen = render(<SupportPage />);

    expect(screen.getByText("Support")).toBeTruthy();
    expect(screen.getByText("Send a Support Email")).toBeTruthy();
    expect(
      screen.getByText(
        /account, billing, orders, sales, technical, privacy, legal, security,\s+commercial, courses, live events, partner, and facility support/
      )
    ).toBeTruthy();
    expect(screen.getAllByText(/support@growpathai\.com/).length).toBeGreaterThanOrEqual(
      2
    );
    expect(screen.getByText(/Email billing@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email orders@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email sales@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email commercial@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email courses@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email live@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email facility@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email partners@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email contact@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email privacy@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email legal@growpathai\.com/)).toBeTruthy();
    expect(screen.getByText(/Email security@growpathai\.com/)).toBeTruthy();
    expect(screen.queryByText(/Email noreply@growpathai\.com/)).toBeNull();
    expect(screen.queryByText(/Email notifications@growpathai\.com/)).toBeNull();
  });

  it("sends a support request through the backend email endpoint", async () => {
    const screen = render(<SupportPage />);

    fireEvent.changeText(screen.getByLabelText("Support name"), "Jane Grower");
    fireEvent.changeText(
      screen.getByLabelText("Support reply email"),
      "jane@example.com"
    );
    fireEvent.changeText(
      screen.getByLabelText("Support account email"),
      "account@example.com"
    );
    fireEvent.changeText(screen.getByLabelText("Support subject"), "Cannot log in");
    fireEvent.changeText(
      screen.getByLabelText("Support message"),
      "I verified my address but still cannot log in."
    );
    fireEvent.press(screen.getByLabelText("Send support request"));

    await waitFor(() => {
      expect(mockSendSupportContact).toHaveBeenCalledWith({
        topic: "account",
        name: "Jane Grower",
        email: "jane@example.com",
        accountEmail: "account@example.com",
        subject: "Cannot log in",
        message: "I verified my address but still cannot log in.",
        company: ""
      });
    });
    expect(
      screen.getByText("Support request sent. Reference: email_123.")
    ).toBeTruthy();
  });
});
