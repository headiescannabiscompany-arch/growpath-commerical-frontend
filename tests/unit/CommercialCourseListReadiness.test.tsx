import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import CommercialCoursesRoute from "@/app/home/commercial/courses";

const mockCourses = jest.fn();
const mockLines = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/api/commercialWorkflows", () => ({
  fetchCommercialCourses: () => mockCourses(),
  fetchProductLines: () => mockLines(),
  createCommercialCourse: (...args: any[]) => mockCreate(...args)
}));
jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children
}));
jest.mock("@/components/layout/AppPage", () => ({ children, header }: any) => (
  <>
    {header}
    {children}
  </>
));
jest.mock("@/components/InlineError", () => ({ InlineError: () => null }));

describe("Commercial course-list read readiness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCourses.mockReset().mockResolvedValue([]);
    mockLines.mockReset().mockResolvedValue([]);
  });

  it("does not claim zero or an empty list before the first read settles", async () => {
    let resolve!: (value: any[]) => void;
    mockCourses.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const view = render(<CommercialCoursesRoute />);
    expect(view.queryByText("No commercial courses yet.")).toBeNull();
    expect(view.queryAllByText("0")).toHaveLength(0);
    expect(view.getAllByText("—")).toHaveLength(3);
    fireEvent.changeText(view.getByLabelText("Commercial course title"), "Pending draft");
    fireEvent.press(view.getByLabelText("Create commercial course"));
    expect(mockCreate).not.toHaveBeenCalled();
    await act(async () => resolve([]));
    expect(view.getByText("No commercial courses yet.")).toBeTruthy();
    expect(view.getAllByText("0")).toHaveLength(3);
  });

  it("recovers a failed initial read without discarding an unfinished form", async () => {
    mockCourses.mockRejectedValueOnce(new Error("offline"));
    const view = render(<CommercialCoursesRoute />);
    await waitFor(() =>
      expect(
        view.getByText("Commercial courses are unavailable. Retry to load saved courses.")
      ).toBeTruthy()
    );
    expect(view.queryByText("No commercial courses yet.")).toBeNull();
    expect(view.queryAllByText("0")).toHaveLength(0);
    fireEvent.changeText(
      view.getByLabelText("Commercial course title"),
      "Unfinished draft"
    );
    fireEvent.press(view.getByLabelText("Retry commercial courses"));
    await waitFor(() =>
      expect(view.getByText("No commercial courses yet.")).toBeTruthy()
    );
    expect(view.getByLabelText("Commercial course title").props.value).toBe(
      "Unfinished draft"
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("retains and labels previously loaded records after refresh fails", async () => {
    mockCourses.mockResolvedValueOnce([
      {
        id: "course-1",
        title: "Saved synthetic course",
        status: "published",
        access: "free"
      }
    ]);
    const view = render(<CommercialCoursesRoute />);
    await waitFor(() => expect(view.getByText("Saved synthetic course")).toBeTruthy());
    mockCourses.mockRejectedValueOnce(new Error("offline"));
    fireEvent.press(view.getByLabelText("Refresh commercial courses"));
    await waitFor(() =>
      expect(
        view.getByText(
          "Showing previously loaded courses. Refresh failed; retry for current records."
        )
      ).toBeTruthy()
    );
    expect(view.getByText("Saved synthetic course")).toBeTruthy();
    expect(view.queryByText("No commercial courses yet.")).toBeNull();
  });

  it("does not hide available courses when optional Product Lines fail", async () => {
    mockLines.mockRejectedValue(new Error("lines offline"));
    const view = render(<CommercialCoursesRoute />);
    await waitFor(() =>
      expect(view.getByText("No commercial courses yet.")).toBeTruthy()
    );
    expect(
      view.getByText(
        "Product Line choices are unavailable. Retry to reload choices; your draft links are unchanged."
      )
    ).toBeTruthy();
    expect(view.getByLabelText("Retry commercial courses")).toBeTruthy();
  });

  it("does not present a previous empty result as current after a failed refresh", async () => {
    const view = render(<CommercialCoursesRoute />);
    await waitFor(() =>
      expect(view.getByText("No commercial courses yet.")).toBeTruthy()
    );
    mockCourses.mockRejectedValue(new Error("offline"));
    fireEvent.press(view.getByLabelText("Refresh commercial courses"));
    await waitFor(() =>
      expect(
        view.getByText(
          "Showing previously loaded courses. Refresh failed; retry for current records."
        )
      ).toBeTruthy()
    );
    expect(view.queryByText("No commercial courses yet.")).toBeNull();
    fireEvent.press(view.getByLabelText("Retry commercial courses"));
    await waitFor(() => expect(mockCourses).toHaveBeenCalledTimes(3));
    expect(view.queryByText("No commercial courses yet.")).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("coalesces repeated retry presses while a read is pending", async () => {
    mockCourses.mockRejectedValueOnce(new Error("offline"));
    const view = render(<CommercialCoursesRoute />);
    await waitFor(() =>
      expect(view.getByLabelText("Retry commercial courses")).toBeTruthy()
    );
    let resolve!: (value: any[]) => void;
    mockCourses.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const retry = view.getByLabelText("Retry commercial courses");
    act(() => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(mockCourses).toHaveBeenCalledTimes(2);
    await act(async () => resolve([]));
    expect(view.getByText("No commercial courses yet.")).toBeTruthy();
  });
});
