import React from "react";
import { Text } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import ForumReadinessBoundary from "@/components/forum/ForumReadinessBoundary";

let mockHydrating = false;
let mockReady = true;
let mockError: string | null = null;
let mockId = "viewer-1";
const mockRetry = jest.fn();
const mockMount = jest.fn();
jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    isHydrating: mockHydrating,
    user: { id: mockId },
    token: "session",
    isAuthed: true,
    retryMe: mockRetry
  })
}));
jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    ready: mockReady,
    bootstrapError: mockError,
    mode: "personal"
  })
}));
jest.mock("@/components/ScreenBoundary", () => ({
  ScreenBoundary: ({ children }: any) => children
}));
function Reader() {
  React.useEffect(() => {
    mockMount();
  }, []);
  return <Text>Ready reader</Text>;
}
const ui = () => (
  <ForumReadinessBoundary>
    <Reader />
  </ForumReadinessBoundary>
);
beforeEach(() => {
  mockHydrating = false;
  mockReady = true;
  mockError = null;
  mockId = "viewer-1";
  jest.clearAllMocks();
});
it("does not mount readers or deny access during authentication hydration", () => {
  mockHydrating = true;
  const view = render(ui());
  expect(view.queryByText("Ready reader")).toBeNull();
  expect(mockMount).not.toHaveBeenCalled();
  expect(view.getByLabelText("Checking Forum access")).toBeTruthy();
  mockHydrating = false;
  view.rerender(ui());
  expect(view.getByText("Ready reader")).toBeTruthy();
});
it("waits for entitlements separately, then mounts the existing authorization flow", () => {
  mockReady = false;
  const view = render(ui());
  expect(mockMount).not.toHaveBeenCalled();
  mockReady = true;
  view.rerender(ui());
  expect(mockMount).toHaveBeenCalledTimes(1);
});
it("retries failed access reads once and contains rejection", async () => {
  mockReady = false;
  mockError = "offline";
  let reject!: (error: Error) => void;
  mockRetry.mockReturnValue(
    new Promise((_, fail) => {
      reject = fail;
    })
  );
  const view = render(ui());
  expect(view.getByText("Forum access check unavailable")).toBeTruthy();
  fireEvent.press(view.getByLabelText("Retry Forum access"));
  fireEvent.press(view.getByLabelText("Retry Forum access"));
  expect(mockRetry).toHaveBeenCalledTimes(1);
  await act(async () => {
    reject(new Error("offline"));
  });
  expect(view.getByText("The check failed. Please try again.")).toBeTruthy();
  expect(mockMount).not.toHaveBeenCalled();
});
it("clears mounted reader state on identity change but not equivalent rerenders", () => {
  const view = render(ui());
  view.rerender(ui());
  expect(mockMount).toHaveBeenCalledTimes(1);
  mockId = "viewer-2";
  view.rerender(ui());
  expect(mockMount).toHaveBeenCalledTimes(2);
  mockReady = false;
  view.rerender(ui());
  expect(view.queryByText("Ready reader")).toBeNull();
});
