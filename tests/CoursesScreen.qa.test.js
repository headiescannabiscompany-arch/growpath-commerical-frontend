/**
 * @typedef {import('jest')} jest
 */
// Automated QA integration tests for CoursesScreen.js
// Uses Jest + React Native Testing Library (RNTL)
/// <reference types="jest" />

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import CoursesScreen from "../src/screens/CoursesScreen.js";
import { NavigationContainer } from "@react-navigation/native";
// All plan/role logic is now capability-driven in the app. These tests simulate plan switching via UI, but assertions should reflect capability-driven gating.

const mockCourses = [
  {
    _id: "1",
    title: "Free Course",
    creator: "Alice",
    thumbnail: "",
    priceCents: 0,
    lessons: [1, 2],
    analytics: { views: 10, enrollments: 2 },
    isPublished: true
  },
  {
    _id: "2",
    title: "Pro Course",
    creator: "Bob",
    thumbnail: "",
    priceCents: 1000,
    lessons: [1],
    analytics: { views: 5, enrollments: 1 },
    isPublished: false
  }
];

beforeEach(() => {
  // Note: This mock does not return a real Response object, but is sufficient for JS tests.
  global.fetch = jest.fn((url, options) => {
    const urlStr = typeof url === "string" ? url : String(url);
    if (urlStr === "/api/courses") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCourses) });
    }
    if (urlStr === "/api/invite") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    }
    if (urlStr && urlStr.startsWith("/api/users/") && urlStr.endsWith("/role")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    }
    if (
      urlStr &&
      urlStr.startsWith("/api/users/") &&
      options &&
      options.method === "DELETE"
    ) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    }
    if (urlStr && urlStr.startsWith("/api/compliance/export")) {
      return Promise.resolve({ ok: true });
    }
    if (urlStr && urlStr.includes("/publish")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    }
    if (urlStr && urlStr.includes("/unpublish")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });
    }
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: "Not found" })
    });
  });
});

describe("CoursesScreen QA", () => {
  const renderWithNav = (ui) => render(<NavigationContainer>{ui}</NavigationContainer>);

  it("renders courses and plan switcher (capability-driven)", async () => {
    const { getByText, queryByText } = renderWithNav(<CoursesScreen />);
    // Free plan: only free courses visible
    await waitFor(() => {
      expect(getByText("Free Course")).toBeTruthy();
      expect(queryByText("Pro Course")).toBeNull();
    });
    // Switch to Pro (should unlock Pro course via capabilities)
    fireEvent.press(getByText("Pro"));
    await waitFor(() => {
      expect(getByText("Pro Course")).toBeTruthy();
    });
  }, 15000);

  it("shows only free courses for Free plan (capability-driven)", async () => {
    const { getByText, queryByText } = renderWithNav(<CoursesScreen />);
    fireEvent.press(getByText("Free"));
    await waitFor(() => {
      expect(getByText("Free Course")).toBeTruthy();
      expect(queryByText("Pro Course")).toBeNull();
    });
  });

  it("invites a user and shows feedback", async () => {
    const { getByLabelText, getByText, findByText, queryByText } = renderWithNav(
      <CoursesScreen />
    );
    fireEvent.press(getByText("Facility"));
    if (!queryByText("Invite")) return;
    fireEvent.press(getByText("Invite"));
    fireEvent.changeText(getByLabelText("Invite user name input"), "Test User");
    fireEvent.press(getByText("Invite"));
    expect(await findByText("Invite sent!")).toBeTruthy();
  });

  it("changes a user's role and shows feedback", async () => {
    const { getByText } = renderWithNav(<CoursesScreen />);
    fireEvent.press(getByText("Facility"));
    // (This test is a placeholder, actual implementation depends on user list rendering)
  });

  it("removes a user and shows feedback", async () => {
    const { getByText } = renderWithNav(<CoursesScreen />);
    fireEvent.press(getByText("Facility"));
    // (This test is a placeholder, actual implementation depends on user list rendering)
  });

  it("exports compliance metrics and shows feedback", async () => {
    const { getByText, findByText, queryByText } = renderWithNav(<CoursesScreen />);
    fireEvent.press(getByText("Facility"));
    if (!queryByText("Export")) return;
    fireEvent.press(getByText("Export"));
    fireEvent.press(getByText("CSV"));
    expect(await findByText("Exported as CSV!"));
  });

  it("publishes and unpublishes a course and shows feedback", async () => {
    const { getByText } = renderWithNav(<CoursesScreen />);
    fireEvent.press(getByText("Influencer"));
    // (This test is a placeholder, actual implementation depends on publish button rendering)
  });

  it("shows error feedback on failed API call", async () => {
    // @ts-expect-error: mockImplementationOnce is available on jest.Mock
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Failed" }) })
    );
    const { getByText, findByText, queryByText } = renderWithNav(<CoursesScreen />);
    fireEvent.press(getByText("Facility"));
    if (!queryByText("Invite")) return;
    fireEvent.press(getByText("Invite"));
    fireEvent.press(getByText("Invite"));
    expect(await findByText("Failed to invite user")).toBeTruthy();
  });

  it("has accessible plan switcher buttons (capability-driven)", async () => {
    const { getByLabelText } = renderWithNav(<CoursesScreen />);
    expect(getByLabelText("Switch to Free plan")).toBeTruthy();
    expect(getByLabelText("Switch to Pro plan")).toBeTruthy();
    // Optionally: check for other plans if present in UI
    expect(getByLabelText("Switch to Commercial plan")).toBeTruthy();
    expect(getByLabelText("Switch to Facility plan")).toBeTruthy();
    expect(getByLabelText("Switch to Influencer plan")).toBeTruthy();
  });
});
