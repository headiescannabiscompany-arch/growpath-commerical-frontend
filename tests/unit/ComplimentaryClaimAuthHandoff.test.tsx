import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LoginScreen from "@/app/login";
import RegisterScreen from "@/app/register";

const mockLogin = jest.fn();
const mockSignup = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    login: (...args: any[]) => mockLogin(...args),
    signup: (...args: any[]) => mockSignup(...args)
  })
}));

jest.mock("@/api/auth", () => ({
  requestEmailVerification: jest.fn()
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush })
}));

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return function MockCalendarDateField({ accessibilityLabel, onChange, value }: any) {
    return (
      <TextInput
        accessibilityLabel={accessibilityLabel}
        onChangeText={onChange}
        value={value}
      />
    );
  };
});

describe("complimentary claim authentication handoff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { next: "/claim-complimentary-access" };
    mockLogin.mockResolvedValue({ ok: true });
    mockSignup.mockResolvedValue({ token: "new-account-token" });
  });

  it("returns a successful login to the tokenless complimentary claim route", async () => {
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Email"), "Recipient@Example.com");
    fireEvent.changeText(screen.getByPlaceholderText("Password"), "password123");
    fireEvent.press(screen.getByLabelText("Sign in"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("recipient@example.com", "password123");
      expect(mockReplace).toHaveBeenCalledWith("/claim-complimentary-access");
    });
  });

  it("passes only the tokenless claim route from login to registration", () => {
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByLabelText("Create account"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/register",
      params: { next: "/claim-complimentary-access" }
    });
    expect(JSON.stringify(mockPush.mock.calls)).not.toContain("token=");
  });

  it("creates a Free personal recipient account before returning to claim", async () => {
    const screen = render(<RegisterScreen />);

    expect(screen.getByText("Complimentary access recipient")).toBeTruthy();
    expect(
      screen.getByText(
        "Create a free personal account first. Complimentary access activates only after you verify and claim it with the recipient email."
      )
    ).toBeTruthy();
    expect(screen.queryByLabelText("Select Commercial account")).toBeNull();

    fireEvent.changeText(screen.getByLabelText("Register name"), "Recipient User");
    fireEvent.changeText(
      screen.getByLabelText("Register email"),
      " Recipient@Example.com "
    );
    fireEvent.changeText(screen.getByLabelText("Register password"), "password123");
    fireEvent.changeText(screen.getByLabelText("Register date of birth"), "1990-01-01");
    fireEvent.press(screen.getByLabelText("Create Free account"));

    await waitFor(() =>
      expect(mockSignup).toHaveBeenCalledWith({
        name: "Recipient User",
        displayName: "Recipient User",
        email: "recipient@example.com",
        password: "password123",
        plan: "free",
        mode: "personal",
        dateOfBirth: "1990-01-01",
        showCannabisContent: false
      })
    );
    expect(mockReplace).toHaveBeenCalledWith("/claim-complimentary-access");
  });

  it("keeps the tokenless claim continuation when returning to login", () => {
    const screen = render(<RegisterScreen />);
    fireEvent.changeText(
      screen.getByLabelText("Register email"),
      "Recipient@Example.com"
    );

    fireEvent.press(screen.getByLabelText("Back to login"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/login?email=recipient%40example.com&next=%2Fclaim-complimentary-access"
    );
  });
});
