import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import WalkthroughsScreen from "@/app/onboarding/walkthroughs";
const mockRead = jest.fn();
const mockConsume = jest.fn();
const mockReplace = jest.fn();
let mockParams: any;
let mockAuth: any;
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace })
}));
jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("@/entitlements", () => ({ useEntitlements: () => ({ mode: "personal" }) }));
jest.mock("@/api/shopperContinuation", () => ({
  readAccountShopperContinuation: (...args: any[]) => mockRead(...args),
  consumeAccountShopperContinuation: (...args: any[]) => mockConsume(...args)
}));
const product = "/store/qa-store/products/6aa5967eb77d250e5aecf795";
const course = "/courses?courseId=6aa2f5c5d339157652995f10";
function record(path = product) {
  return {
    path,
    revision: "a".repeat(32),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    plan: "pro",
    mode: "personal"
  };
}
function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { plan: "pro" };
  mockAuth = {
    token: "session-a",
    user: { id: "user-a", email: "qa@example.com", subscriptionStatus: "inactive" },
    isAuthed: true,
    meStatus: "ready",
    isHydrating: false
  };
  mockRead.mockReset().mockResolvedValue(record());
  mockConsume.mockReset().mockResolvedValue(record());
});
it.each([
  [product, "product"],
  [course, "course"]
])("offers an explicit return to %s without replacing checkout", async (path, kind) => {
  mockRead.mockResolvedValue(record(path));
  mockConsume.mockResolvedValue(record(path));
  const screen = render(<WalkthroughsScreen />);
  await screen.findByLabelText(`Return to ${kind}`);
  expect(screen.getByLabelText("Continue to Pro checkout")).toBeTruthy();
  expect(mockConsume).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText(`Return to ${kind}`));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(path));
  expect(mockConsume).toHaveBeenCalledTimes(1);
});
it("preserves the existing checkout action and does not consume on it", async () => {
  const screen = render(<WalkthroughsScreen />);
  await screen.findByLabelText("Return to product");
  fireEvent.press(screen.getByLabelText("Continue to Pro checkout"));
  expect(mockReplace).toHaveBeenCalledWith("/offers");
  expect(mockConsume).not.toHaveBeenCalled();
});
it("uses a strict immediate-session return without consuming unrelated account state", async () => {
  mockParams.shopperNext = course;
  const screen = render(<WalkthroughsScreen />);
  fireEvent.press(screen.getByLabelText("Return to course"));
  expect(mockReplace).toHaveBeenCalledWith(course);
  expect(mockRead).not.toHaveBeenCalled();
  expect(mockConsume).not.toHaveBeenCalled();
});
it.each(["https://evil.example", "/claim-gift", [course]])(
  "rejects unsupported immediate-session return %p",
  async (path) => {
    mockParams.shopperNext = path;
    mockRead.mockResolvedValue(null);
    const screen = render(<WalkthroughsScreen />);
    await waitFor(() => expect(mockRead).toHaveBeenCalled());
    expect(screen.queryByLabelText("Return to course")).toBeNull();
    expect(screen.queryByLabelText("Return to product")).toBeNull();
  }
);
it("does not read while authentication is unsettled", () => {
  mockAuth.meStatus = "loading";
  render(<WalkthroughsScreen />);
  expect(mockRead).not.toHaveBeenCalled();
});
it("keeps checkout working when optional read fails", async () => {
  mockRead.mockRejectedValue(new Error("Unavailable"));
  const screen = render(<WalkthroughsScreen />);
  await act(async () => {});
  expect(screen.getByLabelText("Continue to Pro checkout")).toBeTruthy();
  expect(screen.queryByLabelText("Return to product")).toBeNull();
});
it("does not show another selected plan's return", async () => {
  mockRead.mockResolvedValue({ ...record(), plan: "commercial", mode: "commercial" });
  const screen = render(<WalkthroughsScreen />);
  await act(async () => {});
  expect(screen.queryByLabelText("Return to product")).toBeNull();
});
it.each(["read", "consume"])(
  "discards a late %s after an account switch",
  async (stage) => {
    const pending = deferred();
    (stage === "read" ? mockRead : mockConsume).mockReturnValueOnce(pending.promise);
    const screen = render(<WalkthroughsScreen />);
    if (stage === "consume") {
      await screen.findByLabelText("Return to product");
      fireEvent.press(screen.getByLabelText("Return to product"));
    } else await waitFor(() => expect(mockRead).toHaveBeenCalled());
    mockRead.mockResolvedValue(null);
    mockAuth = { ...mockAuth, token: "session-b", user: { id: "user-b" } };
    screen.rerender(<WalkthroughsScreen />);
    await act(async () => pending.resolve(record()));
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Return to product")).toBeNull();
  }
);
it("does not double-submit or retry an uncertain consume", async () => {
  const pending = deferred();
  mockConsume.mockReturnValueOnce(pending.promise);
  const screen = render(<WalkthroughsScreen />);
  await screen.findByLabelText("Return to product");
  fireEvent.press(screen.getByLabelText("Return to product"));
  fireEvent.press(screen.getByLabelText("Return to product"));
  expect(mockConsume).toHaveBeenCalledTimes(1);
  await act(async () => pending.resolve(null));
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.getByText(/already used/)).toBeTruthy();
});
