import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import LegacyAgeCompletion from "@/components/account/LegacyAgeCompletion";
import CannabisContentControls from "@/components/account/CannabisContentControls";

const mockCompleteAgeAssurance = jest.fn();
const mockUpdateContentControls = jest.fn();
const mockRetryMe = jest.fn();
const mockCalendarProps = jest.fn();
let mockUser: any;
let mockToken: string | null;

jest.mock("@/api/auth", () => ({
  completeAgeAssurance: (...args: any[]) => mockCompleteAgeAssurance(...args),
  updateContentControls: (...args: any[]) => mockUpdateContentControls(...args)
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, token: mockToken, retryMe: mockRetryMe })
}));
jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return function CalendarDateMock(props: any) {
    mockCalendarProps(props);
    return React.createElement(TextInput, {
      accessibilityLabel: props.accessibilityLabel,
      value: props.value,
      onChangeText: props.onChange,
      editable: !props.disabled
    });
  };
});

function fill(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByLabelText("Profile date of birth"), "1990-02-14");
  fireEvent.press(screen.getByLabelText("I confirm this is my date of birth"));
}

describe("Legacy Profile age completion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: "legacy-1",
      ageBand: "unknown",
      ageConfirmationRequired: true,
      cannabisEligible: false,
      cannabisVisibility: "hide",
      parentalLockEnabled: true
    };
    mockToken = "existing-session";
    mockCompleteAgeAssurance.mockReset().mockResolvedValue({
      ok: true,
      ageAssurance: {
        ageBand: "21_plus",
        cannabisEligible: true,
        method: "self_declared"
      }
    });
    mockRetryMe.mockReset().mockResolvedValue(undefined);
  });

  it.each(["13_17", "18_20", "21_plus"])(
    "does not offer a replacement DOB for a known %s age band",
    (ageBand) => {
      mockUser.ageBand = ageBand;
      const screen = render(<LegacyAgeCompletion />);
      expect(screen.queryByLabelText("Complete age eligibility")).toBeNull();
    }
  );

  it.each([false, undefined])("requires the server eligibility flag (%s)", (flag) => {
    mockUser.ageConfirmationRequired = flag;
    const screen = render(<LegacyAgeCompletion />);
    expect(screen.queryByLabelText("Complete age eligibility")).toBeNull();
  });

  it("does not render for an eligible or signed-out account", () => {
    mockUser.cannabisEligible = true;
    const screen = render(<LegacyAgeCompletion />);
    expect(screen.queryByLabelText("Complete age eligibility")).toBeNull();
    mockUser.cannabisEligible = false;
    mockToken = null;
    screen.rerender(<LegacyAgeCompletion />);
    expect(screen.queryByLabelText("Complete age eligibility")).toBeNull();
  });

  it("starts blank, uses the shared year-selectable date field, and requires confirmation", () => {
    const screen = render(<LegacyAgeCompletion />);
    const today = new Date();
    expect(mockCalendarProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        value: "",
        minYear: today.getFullYear() - 125,
        maxYear: today.getFullYear(),
        maximumDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
        optional: false
      })
    );
    expect(screen.getByLabelText("Save date of birth")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("Save date of birth"));
    expect(mockCompleteAgeAssurance).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText("Profile date of birth"), "1990-02-14");
    expect(screen.getByLabelText("Save date of birth")).toBeDisabled();
    fireEvent.press(screen.getByLabelText("I confirm this is my date of birth"));
    expect(screen.getByLabelText("Save date of birth")).toBeEnabled();
    fireEvent.changeText(screen.getByLabelText("Profile date of birth"), "1991-03-15");
    expect(screen.getByLabelText("Save date of birth")).toBeDisabled();
  });

  it("saves only the declaration, refreshes auth, and does not opt in or unlock", async () => {
    const screen = render(<CannabisContentControls />);
    fill(screen);
    fireEvent.press(screen.getByLabelText("Save date of birth"));
    await waitFor(() => expect(mockRetryMe).toHaveBeenCalledTimes(1));
    expect(mockCompleteAgeAssurance).toHaveBeenCalledWith(
      { dateOfBirth: "1990-02-14", confirmed: true },
      "existing-session"
    );
    expect(mockUpdateContentControls).not.toHaveBeenCalled();
    expect(screen.getByText("Cannabis content: Hidden")).toBeTruthy();
    expect(screen.getByLabelText("Show cannabis content")).toBeDisabled();
    expect(screen.getByText(/self-declared age\. This does not turn on/)).toBeTruthy();
    expect(screen.queryByLabelText("Profile date of birth")).toBeNull();
    mockUser = {
      ...mockUser,
      ageBand: "21_plus",
      cannabisEligible: true,
      ageConfirmationRequired: false
    };
    screen.rerender(<CannabisContentControls />);
    expect(screen.queryByLabelText("Complete age eligibility")).toBeNull();
    expect(screen.getByLabelText("Show cannabis content")).toBeEnabled();
    expect(screen.getByText("Cannabis content: Hidden")).toBeTruthy();
    expect(screen.getByText(/Parental lock: On/)).toBeTruthy();
  });

  it("prevents repeated submissions and freezes the draft while pending", async () => {
    let finish!: (result: any) => void;
    mockCompleteAgeAssurance.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<LegacyAgeCompletion />);
    fill(screen);
    const button = screen.getByLabelText("Save date of birth");
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(mockCompleteAgeAssurance).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Save date of birth")).toBeDisabled();
    expect(screen.getByLabelText("I confirm this is my date of birth")).toBeDisabled();
    expect(screen.getByLabelText("Profile date of birth").props.editable).toBe(false);
    await act(async () => {
      finish({ ok: true });
    });
  });

  it.each([
    ["AGE_ASSURANCE_ALREADY_RECORDED", "This account already has an age declaration"],
    ["AGE_NOT_ELIGIBLE", "This age does not meet the account age requirement"],
    ["EMAIL_NOT_VERIFIED", "Verify your account email"],
    ["ACCOUNT_AUTHORITY_MUTATION_BLOCKED", "Age changes are unavailable"],
    ["DATE_OF_BIRTH_REQUIRED", "Choose a valid date of birth"],
    ["AGE_ASSURANCE_FAILED", "Unable to save your age declaration"]
  ])(
    "retains the form on %s without exposing raw server messages",
    async (code, message) => {
      mockCompleteAgeAssurance.mockRejectedValue({ code, message: "raw-private-DOB" });
      const screen = render(<LegacyAgeCompletion />);
      fill(screen);
      fireEvent.press(screen.getByLabelText("Save date of birth"));
      await waitFor(() => expect(screen.getByText(new RegExp(message))).toBeTruthy());
      expect(screen.getByLabelText("Profile date of birth").props.value).toBe(
        "1990-02-14"
      );
      expect(screen.getByLabelText("Save date of birth")).toBeEnabled();
      expect(screen.queryByText("raw-private-DOB")).toBeNull();
      expect(mockRetryMe).not.toHaveBeenCalled();
    }
  );

  it("does not resubmit a saved declaration when auth refresh fails", async () => {
    mockRetryMe.mockRejectedValue(new Error("offline"));
    const screen = render(<LegacyAgeCompletion />);
    fill(screen);
    fireEvent.press(screen.getByLabelText("Save date of birth"));
    await waitFor(() =>
      expect(screen.getByText(/Date of birth saved\. Refresh Profile/)).toBeTruthy()
    );
    expect(screen.queryByLabelText("Save date of birth")).toBeNull();
    expect(screen.queryByLabelText("Profile date of birth")).toBeNull();
  });

  it("clears drafts on account switch and ignores the former account's result", async () => {
    let finish!: (result: any) => void;
    mockCompleteAgeAssurance.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const screen = render(<LegacyAgeCompletion />);
    fill(screen);
    fireEvent.press(screen.getByLabelText("Save date of birth"));
    mockUser = { ...mockUser, id: "legacy-2" };
    mockToken = "second-session";
    screen.rerender(<LegacyAgeCompletion />);
    expect(screen.getByLabelText("Profile date of birth").props.value).toBe("");
    expect(screen.getByLabelText("Save date of birth")).toBeDisabled();
    await act(async () => {
      finish({ ok: true });
    });
    expect(mockRetryMe).not.toHaveBeenCalled();
    expect(screen.queryByText(/Date of birth saved/)).toBeNull();
  });

  it("discards an open draft when its session changes before submission", () => {
    const screen = render(<LegacyAgeCompletion />);
    fill(screen);
    mockToken = "replacement-session";
    screen.rerender(<LegacyAgeCompletion />);
    expect(screen.queryByLabelText("Profile date of birth")).toBeNull();
    expect(screen.queryByLabelText("Save date of birth")).toBeNull();
    expect(screen.getByText(/Your session changed/)).toBeTruthy();
    expect(mockCompleteAgeAssurance).not.toHaveBeenCalled();
  });
});
