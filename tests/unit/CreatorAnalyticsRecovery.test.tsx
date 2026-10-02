import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import CreatorAnalyticsScreen from "@/screens/CreatorAnalyticsScreen";

const mockList = jest.fn();
const mockDetail = jest.fn();
jest.mock("@/api/creator", () => ({
  getCreatorCourses: (...args: any[]) => mockList(...args),
  getCourseAnalytics: (...args: any[]) => mockDetail(...args)
}));
jest.mock("@/components/ScreenContainer", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => React.createElement(View, null, children);
});
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const rows = [
  { id: "a", title: "Course A" },
  { _id: "b", title: "Course B" }
];
beforeEach(() => {
  mockList.mockReset().mockResolvedValue(rows);
  mockDetail.mockReset().mockResolvedValue([]);
});

it("uses the API's id and legacy _id without manufacturing summary totals", async () => {
  mockDetail.mockResolvedValue([
    { id: "lesson", title: "Saved lesson", views: 7, completionRate: 50 }
  ]);
  const ui = render(<CreatorAnalyticsScreen />);
  fireEvent.press(await ui.findByText("Course A"));
  await ui.findByText("Saved lesson");
  expect(mockDetail).toHaveBeenLastCalledWith("a");
  expect(ui.getByText(/Course totals are not provided/)).toBeTruthy();
  expect(ui.queryByText(/Sales:/)).toBeNull();
  expect(ui.getByText(/Drop-offs not reported/)).toBeTruthy();
  fireEvent.press(ui.getByText("Course B"));
  await waitFor(() => expect(mockDetail).toHaveBeenLastCalledWith("b"));
});

it.each([new Error("offline"), { data: {} }, [{ title: "Missing identity" }]])(
  "separates unavailable or invalid lists from confirmed empty and retries once",
  async (failure) => {
    if (failure instanceof Error) mockList.mockRejectedValueOnce(failure);
    else mockList.mockResolvedValueOnce(failure);
    const retry = deferred();
    mockList.mockImplementationOnce(() => retry.promise);
    const ui = render(<CreatorAnalyticsScreen />);
    const button = await ui.findByLabelText("Retry analytics course list");
    expect(ui.queryByText("No courses found.")).toBeNull();
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(mockList).toHaveBeenCalledTimes(2);
    await act(async () => retry.resolve([]));
    expect(ui.getByText("No courses found.")).toBeTruthy();
  }
);

it("clears earlier metrics on a failed selection and retries only that course", async () => {
  mockDetail
    .mockResolvedValueOnce({ summary: { views: 27 } })
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce([]);
  const ui = render(<CreatorAnalyticsScreen />);
  fireEvent.press(await ui.findByText("Course A"));
  await ui.findByText("Views: 27 (0 unique)");
  fireEvent.press(ui.getByText("Course B"));
  fireEvent.press(await ui.findByLabelText("Retry selected course analytics"));
  await ui.findByText("No lesson analytics recorded.");
  expect(mockDetail.mock.calls.map(([id]) => id)).toEqual(["a", "b", "b"]);
  expect(ui.queryByText("Views: 27 (0 unique)")).toBeNull();
});

it.each(["resolve", "reject"])(
  "discards a superseded %s without hiding newer results",
  async (outcome) => {
    const first = deferred();
    mockDetail
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce({ summary: { views: 42 } });
    const ui = render(<CreatorAnalyticsScreen />);
    fireEvent.press(await ui.findByText("Course A"));
    fireEvent.press(ui.getByText("Course A"));
    expect(mockDetail).toHaveBeenCalledTimes(1);
    fireEvent.press(ui.getByText("Course B"));
    await ui.findByText("Views: 42 (0 unique)");
    await act(async () => {
      if (outcome === "resolve") first.resolve({ summary: { views: 99 } });
      else first.reject(new Error("old failure"));
    });
    expect(ui.getByText("Views: 42 (0 unique)")).toBeTruthy();
    expect(ui.queryByLabelText("Retry selected course analytics")).toBeNull();
    expect(ui.queryByText("Views: 99 (0 unique)")).toBeNull();
  }
);

it.each([
  null,
  {},
  "bad",
  { summary: [] },
  [null],
  { summary: { views: 3 }, lessons: [null] }
])("rejects malformed analytics %p", async (value) => {
  mockDetail.mockResolvedValue(value);
  const ui = render(<CreatorAnalyticsScreen />);
  fireEvent.press(await ui.findByText("Course A"));
  await ui.findByLabelText("Retry selected course analytics");
  expect(ui.queryByText(/Sales:/)).toBeNull();
});

it("handles a pending detail rejection after leaving the screen", async () => {
  const pending = deferred();
  mockDetail.mockImplementationOnce(() => pending.promise);
  const ui = render(<CreatorAnalyticsScreen />);
  fireEvent.press(await ui.findByText("Course A"));
  ui.unmount();
  await act(async () => pending.reject(new Error("late failure")));
});
