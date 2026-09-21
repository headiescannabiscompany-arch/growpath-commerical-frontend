import React from "react";
import { AppState } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import AdminArchiveAccess from "../AdminArchiveAccess";
import { openArchiveAccess, reviewArchiveAccess } from "@/api/adminArchiveAccess";
import { clearAdminStepUp } from "@/api/adminPasskeys";

jest.mock("@/api/adminArchiveAccess", () => ({
  ...jest.requireActual("@/api/adminArchiveAccess"),
  reviewArchiveAccess: jest.fn(),
  openArchiveAccess: jest.fn()
}));
jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette: { text: "#111", link: "#070", warning: "#a00" } })
}));
const review = reviewArchiveAccess as jest.Mock;
const open = openArchiveAccess as jest.Mock;
const archiveId = "64b000000000000000000006";
const requestId = "64b000000000000000000007";
const phrase = `ACCESS ${archiveId} FOR ${requestId}`;
const reviewResult = () => ({
  reviewToken: "A".repeat(43),
  nextConfirmation: phrase,
  reviewExpiresAt: new Date(Date.now() + 60_000).toISOString()
});
const dataResult = {
  archiveId,
  evidenceRequestId: requestId,
  dateWindow: { from: null, to: null },
  itemCounts: { "account.identity": 1 },
  data: { "account.identity": { name: "PRIVATE SYNTHETIC RECORD" } },
  externalTransmissionPerformed: false
};
type Screen = ReturnType<typeof render>;
function fill(screen: Screen) {
  fireEvent.press(screen.getByText("Scoped archive access"));
  fireEvent.changeText(screen.getByLabelText("Archive ID"), archiveId);
  fireEvent.changeText(screen.getByLabelText("Approved evidence request ID"), requestId);
  fireEvent.changeText(
    screen.getByLabelText("Purpose of this access"),
    "Synthetic approved purpose"
  );
  fireEvent.press(screen.getByLabelText("account.identity"));
  fireEvent.press(screen.getByLabelText("Minimum necessary access only"));
  fireEvent.changeText(
    screen.getByLabelText("Exact archive review confirmation"),
    phrase
  );
}
async function reviewed(screen: Screen) {
  fill(screen);
  fireEvent.press(screen.getByText("Review scoped access"));
  await screen.findByLabelText("Second archive access confirmation");
}
beforeEach(() => {
  jest.clearAllMocks();
  review.mockImplementation(async () => reviewResult());
  open.mockResolvedValue(dataResult);
});
afterEach(() => jest.useRealTimers());

it("is capability gated, closed and inert by default", () => {
  const screen = render(<AdminArchiveAccess authorized={false} />);
  expect(screen.queryByText("Scoped archive access")).toBeNull();
  screen.rerender(<AdminArchiveAccess authorized />);
  expect(screen.queryByLabelText("Archive ID")).toBeNull();
  fireEvent.press(screen.getByText("Scoped archive access"));
  fireEvent.press(screen.getByText("Review scoped access"));
  expect(review).not.toHaveBeenCalled();
  expect(open).not.toHaveBeenCalled();
});

it("requires two separate confirmations and displays only the selected result", async () => {
  const screen = render(<AdminArchiveAccess authorized />);
  await reviewed(screen);
  expect(open).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Second archive access confirmation").props.value).toBe(
    ""
  );
  fireEvent.press(screen.getByText("Open selected archive data once"));
  expect(open).not.toHaveBeenCalled();
  fireEvent.changeText(
    screen.getByLabelText("Second archive access confirmation"),
    phrase
  );
  fireEvent.press(screen.getByText("Open selected archive data once"));
  await screen.findByText(/PRIVATE SYNTHETIC RECORD/);
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText("Second archive access confirmation")).toBeNull();
  expect(screen.queryByText("A".repeat(43))).toBeNull();
  fireEvent.press(screen.getByText("Clear private data"));
  expect(screen.queryByText(/PRIVATE SYNTHETIC RECORD/)).toBeNull();
});

it.each(["target", "purpose", "scope", "acknowledgement", "security", "close", "role"])(
  "invalidates reviews after %s changes",
  async (change) => {
    const screen = render(<AdminArchiveAccess authorized />);
    await reviewed(screen);
    if (change === "target")
      fireEvent.changeText(screen.getByLabelText("Archive ID"), requestId);
    if (change === "purpose")
      fireEvent.changeText(
        screen.getByLabelText("Purpose of this access"),
        "Changed purpose"
      );
    if (change === "scope") fireEvent.press(screen.getByLabelText("account.profile"));
    if (change === "acknowledgement")
      fireEvent.press(screen.getByLabelText("Minimum necessary access only"));
    if (change === "security") act(() => clearAdminStepUp());
    if (change === "close")
      fireEvent.press(screen.getByText("Close scoped archive access"));
    if (change === "role") screen.rerender(<AdminArchiveAccess authorized={false} />);
    expect(screen.queryByLabelText("Second archive access confirmation")).toBeNull();
    expect(open).not.toHaveBeenCalled();
  }
);

it("discards a delayed review after the target is edited and blocks double clicks", async () => {
  let resolve!: (value: unknown) => void;
  review.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const screen = render(<AdminArchiveAccess authorized />);
  fill(screen);
  const button = screen.getByText("Review scoped access");
  fireEvent.press(button);
  fireEvent.press(button);
  expect(review).toHaveBeenCalledTimes(1);
  fireEvent.changeText(screen.getByLabelText("Archive ID"), requestId);
  await act(async () => resolve(reviewResult()));
  expect(screen.queryByLabelText("Second archive access confirmation")).toBeNull();
});

it.each(["close", "security", "target"])(
  "discards a delayed private result after %s",
  async (change) => {
    let resolve!: (value: unknown) => void;
    open.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const screen = render(<AdminArchiveAccess authorized />);
    await reviewed(screen);
    fireEvent.changeText(
      screen.getByLabelText("Second archive access confirmation"),
      phrase
    );
    fireEvent.press(screen.getByText("Open selected archive data once"));
    if (change === "close")
      fireEvent.press(screen.getByText("Close scoped archive access"));
    if (change === "security") act(() => clearAdminStepUp());
    if (change === "target")
      fireEvent.changeText(screen.getByLabelText("Archive ID"), requestId);
    await act(async () => resolve(dataResult));
    expect(screen.queryByText(/PRIVATE SYNTHETIC RECORD/)).toBeNull();
  }
);

it("consumes a failed read token without retrying or displaying server payload", async () => {
  open.mockRejectedValue(new Error("SECRET SERVER PAYLOAD"));
  const screen = render(<AdminArchiveAccess authorized />);
  await reviewed(screen);
  fireEvent.changeText(
    screen.getByLabelText("Second archive access confirmation"),
    phrase
  );
  const button = screen.getByText("Open selected archive data once");
  fireEvent.press(button);
  fireEvent.press(button);
  await screen.findByText(/Archive access was not confirmed/);
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText("Second archive access confirmation")).toBeNull();
  expect(screen.queryByText(/SECRET SERVER PAYLOAD/)).toBeNull();
});

it("clears expired review tokens and private data on the timed boundary", async () => {
  jest.useFakeTimers();
  const screen = render(<AdminArchiveAccess authorized />);
  await reviewed(screen);
  act(() => jest.advanceTimersByTime(60_001));
  expect(screen.queryByLabelText("Second archive access confirmation")).toBeNull();
  fireEvent.press(screen.getByText("Review scoped access"));
  await screen.findByLabelText("Second archive access confirmation");
  fireEvent.changeText(
    screen.getByLabelText("Second archive access confirmation"),
    phrase
  );
  fireEvent.press(screen.getByText("Open selected archive data once"));
  await screen.findByText(/PRIVATE SYNTHETIC RECORD/);
  act(() => jest.advanceTimersByTime(300_001));
  expect(screen.queryByText(/PRIVATE SYNTHETIC RECORD/)).toBeNull();
});

it("clears private data and closes the form when the app backgrounds", async () => {
  const screen = render(<AdminArchiveAccess authorized />);
  await reviewed(screen);
  fireEvent.changeText(
    screen.getByLabelText("Second archive access confirmation"),
    phrase
  );
  fireEvent.press(screen.getByText("Open selected archive data once"));
  await screen.findByText(/PRIVATE SYNTHETIC RECORD/);
  const onChange = (AppState.addEventListener as jest.Mock).mock.calls.find(
    ([event]) => event === "change"
  )![1];
  act(() => onChange("background"));
  expect(screen.queryByText(/PRIVATE SYNTHETIC RECORD/)).toBeNull();
  expect(screen.queryByLabelText("Archive ID")).toBeNull();
});

it("paginates large private text without rendering links or media", async () => {
  open.mockResolvedValue({
    ...dataResult,
    data: { "account.identity": { name: "x".repeat(5500), note: "LAST PAGE SYNTHETIC" } }
  });
  const screen = render(<AdminArchiveAccess authorized />);
  await reviewed(screen);
  fireEvent.changeText(
    screen.getByLabelText("Second archive access confirmation"),
    phrase
  );
  fireEvent.press(screen.getByText("Open selected archive data once"));
  await screen.findByText("Private data page 1 of 2");
  expect(screen.queryByText(/LAST PAGE SYNTHETIC/)).toBeNull();
  fireEvent.press(screen.getByText("Next private data page"));
  expect(screen.getByText(/LAST PAGE SYNTHETIC/)).toBeTruthy();
  expect(screen.queryAllByRole("link")).toHaveLength(0);
  expect(screen.queryAllByRole("image")).toHaveLength(0);
});
