import React from "react";
import { AppState } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import AdminArchiveRetention from "../AdminArchiveRetention";
import {
  changeArchiveRetention,
  prepareRetentionConfirmation,
  retentionConfirmation
} from "@/api/adminArchiveRetention";
import { clearAdminStepUp } from "@/api/adminPasskeys";
jest.mock("@/api/adminArchiveRetention", () => ({
  ...jest.requireActual("@/api/adminArchiveRetention"),
  changeArchiveRetention: jest.fn(),
  prepareRetentionConfirmation: jest.fn()
}));
jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette: { text: "#111", link: "#070", warning: "#a00" } })
}));
jest.mock("@/components/forms/CalendarDateField", () => {
  const { TextInput } = require("react-native");
  return (props: any) => (
    <TextInput
      accessibilityLabel={props.accessibilityLabel}
      value={props.value}
      onChangeText={props.onChange}
    />
  );
});
const prepare = prepareRetentionConfirmation as jest.Mock;
const save = changeArchiveRetention as jest.Mock;
const archiveId = "64b000000000000000000006";
const requestId = "64b000000000000000000007";
type Screen = ReturnType<typeof render>;
function fill(screen: Screen, action = "apply", authority = "legal_hold") {
  fireEvent.press(screen.getByText("Archive retention / holds"));
  fireEvent.changeText(screen.getByLabelText("Retention archive ID"), archiveId);
  fireEvent.changeText(screen.getByLabelText("Retention evidence request ID"), requestId);
  fireEvent(screen.getByLabelText("Hold action"), "valueChange", action);
  fireEvent(screen.getByLabelText("Preservation authority"), "valueChange", authority);
  fireEvent.changeText(
    screen.getByLabelText("Retention change reason"),
    "Synthetic reviewed change"
  );
  fireEvent.changeText(
    screen.getByLabelText("Non-secret authority reference"),
    "MOCK-ONLY"
  );
}
async function prepared(screen: Screen, action = "apply", authority = "legal_hold") {
  fill(screen, action, authority);
  fireEvent.press(screen.getByText("Prepare hold confirmation"));
  await screen.findByLabelText("Exact hold confirmation");
}
function confirm(screen: Screen) {
  fireEvent.press(screen.getByLabelText("Reviewed preservation obligations"));
  fireEvent.changeText(
    screen.getByLabelText("Exact hold confirmation"),
    retentionConfirmation(prepare.mock.calls[0][0])
  );
  fireEvent.press(screen.getByText("Confirm hold change"));
}
beforeEach(() => {
  jest.clearAllMocks();
  prepare.mockImplementation(async (input) => retentionConfirmation(input));
  save.mockImplementation(async (input) => ({
    archiveId,
    evidenceRequestId: requestId,
    preservationHold: input.action !== "release",
    authority: input.action === "release" ? "none" : input.authority,
    expiresAt: null,
    renewalCount: 0,
    externalTransmissionPerformed: false
  }));
});
afterEach(() => jest.useRealTimers());

it("is hidden without independent approval permission, closed by default and inert", () => {
  const screen = render(<AdminArchiveRetention authorized={false} />);
  expect(screen.queryByText("Archive retention / holds")).toBeNull();
  screen.rerender(<AdminArchiveRetention authorized />);
  expect(screen.queryByLabelText("Retention archive ID")).toBeNull();
  fireEvent.press(screen.getByText("Archive retention / holds"));
  fireEvent.press(screen.getByText("Prepare hold confirmation"));
  expect(prepare).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});
it.each(["apply", "renew", "release"])(
  "requires deliberate preparation and exact confirmation for %s",
  async (action) => {
    const screen = render(<AdminArchiveRetention authorized />);
    await prepared(screen, action, action === "renew" ? "2703f" : "legal_hold");
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Eligibility and current hold state have NOT been verified/)
    ).toBeTruthy();
    if (action === "release")
      expect(screen.getByText(/can allow scheduled deletion/)).toBeTruthy();
    fireEvent.press(screen.getByText("Confirm hold change"));
    expect(save).not.toHaveBeenCalled();
    confirm(screen);
    await screen.findByText(/Saved for archive/);
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText("Exact hold confirmation")).toBeNull();
  }
);
it.each(["draft", "close", "security", "role", "background"])(
  "invalidates a prepared change on %s",
  async (change) => {
    const screen = render(<AdminArchiveRetention authorized />);
    await prepared(screen);
    if (change === "draft")
      fireEvent.changeText(
        screen.getByLabelText("Retention change reason"),
        "Different reason"
      );
    if (change === "close")
      fireEvent.press(screen.getByText("Close archive retention controls"));
    if (change === "security") act(() => clearAdminStepUp());
    if (change === "role") screen.rerender(<AdminArchiveRetention authorized={false} />);
    if (change === "background")
      act(() =>
        (AppState.addEventListener as jest.Mock).mock.calls.find(
          ([event]) => event === "change"
        )![1]("background")
      );
    expect(screen.queryByLabelText("Exact hold confirmation")).toBeNull();
    expect(save).not.toHaveBeenCalled();
  }
);
it("requires agency and completed report date for covered-report preservation", async () => {
  const screen = render(<AdminArchiveRetention authorized />);
  fill(screen, "apply", "2258a");
  fireEvent.press(screen.getByText("Prepare hold confirmation"));
  expect(prepare).not.toHaveBeenCalled();
  fireEvent.changeText(
    screen.getByLabelText("Agency or incident reference"),
    "MOCK-AGENCY"
  );
  fireEvent.changeText(
    screen.getByLabelText("Completed report submission time"),
    "2026-09-20T12:00"
  );
  fireEvent.press(screen.getByText("Prepare hold confirmation"));
  await screen.findByLabelText("Exact hold confirmation");
  expect(prepare.mock.calls[0][0].reportSubmittedAt).toBe(
    new Date("2026-09-20T12:00").toISOString()
  );
});
it("discards delayed preparation after target changes", async () => {
  let resolve!: (value: unknown) => void;
  prepare.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const screen = render(<AdminArchiveRetention authorized />);
  fill(screen);
  fireEvent.press(screen.getByText("Prepare hold confirmation"));
  fireEvent.press(screen.getByText("Close archive retention controls"));
  await act(async () => resolve("old phrase"));
  fireEvent.press(screen.getByText("Archive retention / holds"));
  expect(screen.queryByLabelText("Exact hold confirmation")).toBeNull();
});
it("never retries an uncertain mutation and hides server payloads", async () => {
  save.mockRejectedValue(new Error("PRIVATE ERROR PAYLOAD"));
  const screen = render(<AdminArchiveRetention authorized />);
  await prepared(screen);
  confirm(screen);
  await screen.findByText(/It may have been saved/);
  fireEvent.press(screen.getByText("Prepare hold confirmation"));
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/PRIVATE ERROR PAYLOAD/)).toBeNull();
  fireEvent.press(screen.getByText("Clear form for a new reviewed change"));
  expect(screen.getByLabelText("Retention archive ID").props.value).toBe("");
});
it("locks duplicate submissions and ignores a late result after close", async () => {
  let resolve!: (value: unknown) => void;
  save.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const screen = render(<AdminArchiveRetention authorized />);
  await prepared(screen);
  fireEvent.press(screen.getByLabelText("Reviewed preservation obligations"));
  fireEvent.changeText(
    screen.getByLabelText("Exact hold confirmation"),
    retentionConfirmation(prepare.mock.calls[0][0])
  );
  const button = screen.getByText("Confirm hold change");
  fireEvent.press(button);
  fireEvent.press(button);
  expect(save).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText("Close archive retention controls"));
  await act(async () =>
    resolve({ archiveId, preservationHold: true, expiresAt: null, renewalCount: 0 })
  );
  fireEvent.press(screen.getByText("Archive retention / holds"));
  expect(screen.queryByText(/Saved for archive/)).toBeNull();
  expect(screen.getByText(/Check the saved request and retention audit/)).toBeTruthy();
});
it("expires a prepared confirmation without submitting a mutation", async () => {
  jest.useFakeTimers();
  const screen = render(<AdminArchiveRetention authorized />);
  await prepared(screen);
  act(() => jest.advanceTimersByTime(300_001));
  expect(screen.queryByLabelText("Exact hold confirmation")).toBeNull();
  expect(save).not.toHaveBeenCalled();
});
