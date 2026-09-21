import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import AdminArchiveAudit from "../AdminArchiveAudit";
import { verifyArchiveAudit } from "@/api/adminEvidenceVault";
import { clearAdminStepUp } from "@/api/adminPasskeys";

jest.mock("@/api/adminEvidenceVault", () => ({ verifyArchiveAudit: jest.fn() }));
jest.mock("@/theme/appTheme", () => ({
  useAppTheme: () => ({ palette: { textMuted: "#aaa", link: "#7b7", danger: "#f66" } })
}));
const verify = verifyArchiveAudit as jest.Mock;
const archiveId = "64b000000000000000000006";

beforeEach(() => jest.clearAllMocks());

it("requests only access/retention metadata on explicit action and distinguishes empty chains", async () => {
  verify.mockImplementation(async (_id, kind) => ({
    valid: true,
    eventCount: kind === "access" ? 0 : 3
  }));
  const screen = render(<AdminArchiveAudit archiveId={archiveId} />);
  expect(verify).not.toHaveBeenCalled();
  fireEvent.press(
    screen.getByLabelText(`Verify access and retention audit for ${archiveId}`)
  );
  await screen.findByText("Access: No audit events recorded — not an integrity proof.");
  expect(screen.getByText("Retention: 3 events; recorded chain verified.")).toBeTruthy();
  expect(verify.mock.calls).toEqual([
    [archiveId, "access"],
    [archiveId, "retention"]
  ]);
});

it("shows a broken chain as a failure, not success", async () => {
  verify.mockResolvedValue({ valid: false, eventCount: 3, brokenSequence: 2 });
  const screen = render(<AdminArchiveAudit archiveId={archiveId} />);
  fireEvent.press(
    screen.getByLabelText(`Verify access and retention audit for ${archiveId}`)
  );
  await screen.findByText(
    "Access: Audit chain failed at event 2. Requires investigation."
  );
});

it("clears completed verification on security change and ignores rapid duplicate clicks", async () => {
  let resolve!: (value: unknown) => void;
  verify.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const screen = render(<AdminArchiveAudit archiveId={archiveId} />);
  const button = screen.getByLabelText(
    `Verify access and retention audit for ${archiveId}`
  );
  fireEvent.press(button);
  fireEvent.press(button);
  expect(verify).toHaveBeenCalledTimes(2);
  await act(async () => resolve({ valid: true, eventCount: 9 }));
  await screen.findByText("Access: 9 events; recorded chain verified.");
  act(() => clearAdminStepUp());
  expect(screen.queryByText(/9 events/)).toBeNull();
});

it.each(["selection", "security"])(
  "discards delayed audit results after %s changes",
  async (change) => {
    let resolve!: (value: unknown) => void;
    verify.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const screen = render(<AdminArchiveAudit archiveId={archiveId} />);
    fireEvent.press(
      screen.getByLabelText(`Verify access and retention audit for ${archiveId}`)
    );
    if (change === "selection")
      screen.rerender(<AdminArchiveAudit archiveId="64b000000000000000000007" />);
    else act(() => clearAdminStepUp());
    await act(async () => resolve({ valid: true, eventCount: 9 }));
    expect(screen.queryByText(/9 events/)).toBeNull();
  }
);

it("shows request failure without printing server details or a green result", async () => {
  verify.mockRejectedValue(new Error("private server payload"));
  const screen = render(<AdminArchiveAudit archiveId={archiveId} />);
  fireEvent.press(
    screen.getByLabelText(`Verify access and retention audit for ${archiveId}`)
  );
  await screen.findByText(
    "Audit verification unavailable. No archive or retention changes were made."
  );
  expect(screen.queryByText(/private server payload/)).toBeNull();
});
