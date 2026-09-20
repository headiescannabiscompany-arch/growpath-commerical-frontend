import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import AdminPasskeySecurity from "@/features/admin/AdminPasskeySecurity";
import type { AdminPasskeyStatus } from "@/api/adminPasskeys";

const mockStatus = jest.fn();
const mockRegister = jest.fn();
const mockVerify = jest.fn();
const mockLock = jest.fn();
const mockRevoke = jest.fn();
const mockListeners = new Set<() => void>();
let mockIdentityEpoch = 0;
let mockExpiry: string | null = null;

jest.mock("@/api/adminPasskeys", () => ({
  adminPasskeysSupported: () => true,
  getAdminPasskeyStatus: (...args: any[]) => mockStatus(...args),
  getAdminSecurityIdentityEpoch: () => mockIdentityEpoch,
  getAdminStepUpExpiry: () => mockExpiry,
  lockAdminSecurity: (...args: any[]) => mockLock(...args),
  registerAdminPasskey: (...args: any[]) => mockRegister(...args),
  revokeAdminPasskey: (...args: any[]) => mockRevoke(...args),
  verifyAdminPasskey: (...args: any[]) => mockVerify(...args),
  subscribeAdminSecurity: (listener: () => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  }
}));

const VERIFIED_UNTIL = "2030-01-01T12:05:00.000Z";
const PASSWORD_LABEL = "Current Admin password for passkey changes";

function statusFor(account: string, count = 2): AdminPasskeyStatus {
  return {
    ok: true,
    configured: true,
    enrollmentEnabled: true,
    enforcementEnabled: true,
    enrolled: count > 0,
    passkeys: Array.from({ length: count }, (_, index) => ({
      id: `${account}-key-${index}`,
      label: `${account} device ${index}`,
      createdAt: "2026-09-20T12:00:00.000Z",
      lastUsedAt: null
    })),
    stepUpExpiresAt: mockExpiry
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function notifySecurity({ accountChanged = false, expiry = null as string | null } = {}) {
  if (accountChanged) mockIdentityEpoch += 1;
  mockExpiry = expiry;
  mockListeners.forEach((listener) => listener());
}

async function openPanel() {
  const screen = render(<AdminPasskeySecurity />);
  fireEvent.press(screen.getByText("Set up or verify a passkey"));
  await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(1));
  return screen;
}

function enterRegistration(screen: ReturnType<typeof render>, account: string) {
  fireEvent.changeText(
    screen.getByLabelText("Admin passkey label"),
    ` ${account} phone `
  );
  fireEvent.changeText(screen.getByLabelText(PASSWORD_LABEL), `${account}-password`);
  fireEvent.press(screen.getByText("Add a passkey"));
}

beforeEach(() => {
  jest.resetAllMocks();
  mockListeners.clear();
  mockIdentityEpoch = 0;
  mockExpiry = null;
  mockStatus.mockResolvedValue(statusFor("A", 0));
});

test("keeps the current registration flow, clears its password, and refreshes the device list", async () => {
  mockRegister.mockResolvedValue({ ok: true });
  const screen = await openPanel();
  await waitFor(() => expect(screen.getByLabelText(PASSWORD_LABEL)).toBeTruthy());
  mockStatus.mockResolvedValue(statusFor("A", 1));

  enterRegistration(screen, "A");

  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith("A-password", "A phone"));
  await waitFor(() => expect(screen.getByText(/A device 0 · added/)).toBeTruthy());
  expect(screen.getByLabelText(PASSWORD_LABEL).props.value).toBe("");
  expect(
    screen.getByText("Passkey added. Verify it before using restricted controls.")
  ).toBeTruthy();
});

test("labels enrollment preparation when server-side enforcement is disabled", async () => {
  mockStatus.mockResolvedValue({ ...statusFor("A", 0), enforcementEnabled: false });
  const screen = await openPanel();
  await waitFor(() =>
    expect(
      screen.getByText(
        "Passkey enforcement is not yet enabled in this environment. Enrollment is preparation only."
      )
    ).toBeTruthy()
  );
});

test("switching accounts clears prior device metadata, removal selection, drafts and feedback, then loads the new identity", async () => {
  mockExpiry = VERIFIED_UNTIL;
  mockStatus.mockResolvedValue(statusFor("A"));
  mockVerify.mockResolvedValue(VERIFIED_UNTIL);
  const screen = await openPanel();
  await waitFor(() => expect(screen.getByText(/A device 0 · added/)).toBeTruthy());
  fireEvent.press(screen.getByText("Verify passkey"));
  await waitFor(() =>
    expect(screen.getByText("Passkey verified for a short Admin session.")).toBeTruthy()
  );
  await waitFor(() => expect(screen.getByText("Verify passkey")).not.toBeDisabled());
  fireEvent.press(screen.getByText("Review removal of A device 0"));
  fireEvent.changeText(
    screen.getByLabelText("Confirm passkey removal"),
    "REVOKE PASSKEY A-key-0"
  );
  fireEvent.changeText(screen.getByLabelText(PASSWORD_LABEL), "A-password");
  fireEvent.changeText(
    screen.getByLabelText("Admin passkey label"),
    "A unfinished label"
  );
  const nextStatus = deferred<AdminPasskeyStatus>();
  mockStatus.mockReturnValueOnce(nextStatus.promise);

  act(() => notifySecurity({ accountChanged: true }));

  expect(screen.queryByText(/A device 0 · added/)).toBeNull();
  expect(screen.queryByLabelText("Confirm passkey removal")).toBeNull();
  expect(screen.queryByText("Passkey verified for a short Admin session.")).toBeNull();
  expect(screen.queryByText(/Verified until/)).toBeNull();
  await act(async () => nextStatus.resolve(statusFor("B")));
  await waitFor(() => expect(screen.getByText(/B device 0 · added/)).toBeTruthy());
  expect(screen.getByLabelText(PASSWORD_LABEL).props.value).toBe("");
  expect(screen.getByLabelText("Admin passkey label").props.value).toBe("");
  expect(screen.getByText("Hide Admin security")).toBeTruthy();
});

test.each(["success", "error"])(
  "ignores a previous identity's delayed initial status %s",
  async (outcome) => {
    const previousStatus = deferred<AdminPasskeyStatus>();
    mockStatus.mockReturnValueOnce(previousStatus.promise);
    const screen = await openPanel();
    mockStatus.mockResolvedValue(statusFor("B"));
    act(() => notifySecurity({ accountChanged: true }));
    await waitFor(() => expect(screen.getByText(/B device 0 · added/)).toBeTruthy());

    await act(async () => {
      if (outcome === "success") previousStatus.resolve(statusFor("A"));
      else previousStatus.reject(new Error("A status failed"));
    });

    expect(screen.queryByText(/A device 0 · added/)).toBeNull();
    expect(screen.getByText(/B device 0 · added/)).toBeTruthy();
    expect(screen.queryByText(/Admin passkey setup is not available yet/)).toBeNull();
  }
);

test.each(["success", "error"])(
  "ignores an old identity's action %s and finally while the new identity is busy",
  async (outcome) => {
    const previousAction = deferred<unknown>();
    const currentAction = deferred<unknown>();
    mockRegister
      .mockReturnValueOnce(previousAction.promise)
      .mockReturnValueOnce(currentAction.promise);
    const screen = await openPanel();
    await waitFor(() => expect(screen.getByLabelText(PASSWORD_LABEL)).toBeTruthy());
    enterRegistration(screen, "A");
    mockStatus.mockResolvedValue(statusFor("B", 0));
    act(() => notifySecurity({ accountChanged: true }));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText(PASSWORD_LABEL)).toBeTruthy());
    enterRegistration(screen, "B");
    expect(mockRegister).toHaveBeenCalledTimes(2);

    await act(async () => {
      if (outcome === "success") previousAction.resolve({ ok: true });
      else previousAction.reject(new Error("A action failed"));
    });

    expect(mockStatus).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Add a passkey")).toBeDisabled();
    expect(screen.queryByText("A action failed")).toBeNull();
    expect(
      screen.queryByText("Passkey added. Verify it before using restricted controls.")
    ).toBeNull();
    mockStatus.mockResolvedValue(statusFor("B", 1));
    await act(async () => currentAction.resolve({ ok: true }));
    await waitFor(() => expect(screen.getByText(/B device 0 · added/)).toBeTruthy());
    expect(
      screen.getByText("Passkey added. Verify it before using restricted controls.")
    ).toBeTruthy();
  }
);

test.each(["success", "error"])(
  "ignores an old identity's post-action status %s",
  async (outcome) => {
    const previousRefresh = deferred<AdminPasskeyStatus>();
    mockRegister.mockResolvedValue({ ok: true });
    const screen = await openPanel();
    await waitFor(() => expect(screen.getByLabelText(PASSWORD_LABEL)).toBeTruthy());
    mockStatus.mockReturnValueOnce(previousRefresh.promise);
    enterRegistration(screen, "A");
    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(2));
    mockStatus.mockResolvedValue(statusFor("B"));
    act(() => notifySecurity({ accountChanged: true }));
    await waitFor(() => expect(screen.getByText(/B device 0 · added/)).toBeTruthy());

    await act(async () => {
      if (outcome === "success") previousRefresh.resolve(statusFor("A"));
      else previousRefresh.reject(new Error("A refresh failed"));
    });

    expect(screen.queryByText(/A device 0 · added/)).toBeNull();
    expect(screen.queryByText("A refresh failed")).toBeNull();
    expect(
      screen.queryByText("Passkey added. Verify it before using restricted controls.")
    ).toBeNull();
    expect(screen.getByText(/B device 0 · added/)).toBeTruthy();
  }
);

test("ordinary proof changes do not reset metadata or interrupt the current device ceremony", async () => {
  const authentication = deferred<unknown>();
  mockStatus.mockResolvedValue(statusFor("A"));
  mockVerify.mockReturnValue(authentication.promise);
  const screen = await openPanel();
  await waitFor(() => expect(screen.getByText(/A device 0 · added/)).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText("Admin passkey label"), "My backup device");
  fireEvent.press(screen.getByText("Verify passkey"));

  act(() => notifySecurity());

  expect(screen.getByText("Verify passkey")).toBeDisabled();
  expect(screen.getByText(/A device 0 · added/)).toBeTruthy();
  expect(screen.getByLabelText("Admin passkey label").props.value).toBe(
    "My backup device"
  );
  expect(mockStatus).toHaveBeenCalledTimes(1);
  await act(async () => {
    notifySecurity({ expiry: VERIFIED_UNTIL });
    authentication.resolve(VERIFIED_UNTIL);
  });
  await waitFor(() =>
    expect(screen.getByText("Passkey verified for a short Admin session.")).toBeTruthy()
  );
  expect(screen.getByText(/Verified until/)).toBeTruthy();
  expect(screen.getByText(/A device 0 · added/)).toBeTruthy();
  expect(mockStatus).toHaveBeenCalledTimes(2);
});

test("a current registration failure remains visible and retry succeeds", async () => {
  mockRegister
    .mockRejectedValueOnce(new Error("Current password was not accepted"))
    .mockResolvedValueOnce({ ok: true });
  const screen = await openPanel();
  await waitFor(() => expect(screen.getByLabelText(PASSWORD_LABEL)).toBeTruthy());
  enterRegistration(screen, "A");
  await waitFor(() =>
    expect(screen.getByText("Current password was not accepted")).toBeTruthy()
  );
  expect(screen.getByLabelText("Admin passkey label").props.value).toBe(" A phone ");
  mockStatus.mockResolvedValue(statusFor("A", 1));
  enterRegistration(screen, "A");
  await waitFor(() => expect(screen.getByText(/A device 0 · added/)).toBeTruthy());
  expect(mockRegister).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Current password was not accepted")).toBeNull();
});
