import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import CreateCourseRoute from "@/app/courses/create";

const mockParams = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams(),
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: mockCanGoBack })
}));
jest.mock("@/screens/commercial/CreateCourseScreen", () => () => null);

describe("Full Course Builder source return", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({});
    mockCanGoBack.mockReturnValue(true);
  });

  it.each([
    "/home/commercial/courses",
    "/home/commercial/storefront",
    "/home/personal/courses"
  ])(
    "returns to the explicit supported source %s instead of unrelated history",
    (from) => {
      mockParams.mockReturnValue({ from });
      const view = render(<CreateCourseRoute />);
      expect(view.getAllByLabelText("Back")).toHaveLength(1);
      fireEvent.press(view.getByLabelText("Back"));
      expect(mockReplace).toHaveBeenCalledWith(from);
      expect(mockBack).not.toHaveBeenCalled();
    }
  );

  it("retains its Commercial source after a direct load without router history", () => {
    mockParams.mockReturnValue({ from: "/home/commercial/courses" });
    mockCanGoBack.mockReturnValue(false);
    const view = render(<CreateCourseRoute />);
    fireEvent.press(view.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/commercial/courses");
  });

  it("uses only the first source parameter", () => {
    mockParams.mockReturnValue({
      from: ["/home/commercial/storefront", "https://example.com"]
    });
    const view = render(<CreateCourseRoute />);
    fireEvent.press(view.getByLabelText("Back"));
    expect(mockReplace).toHaveBeenCalledWith("/home/commercial/storefront");
  });

  it.each([
    undefined,
    "",
    "https://example.com",
    "//example.com",
    "/admin",
    "/home/commercial/courses?unexpected=1",
    ["/admin", "/home/commercial/courses"]
  ])("keeps ordinary history for an absent or unsupported source %j", (from) => {
    mockParams.mockReturnValue({ from });
    const view = render(<CreateCourseRoute />);
    fireEvent.press(view.getByLabelText("Back"));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it.each([undefined, "https://example.com", "/admin", []])(
    "uses the existing safe default without history for %j",
    (from) => {
      mockParams.mockReturnValue({ from });
      mockCanGoBack.mockReturnValue(false);
      const view = render(<CreateCourseRoute />);
      fireEvent.press(view.getByLabelText("Back"));
      expect(mockReplace).toHaveBeenCalledWith("/home/personal/courses");
      expect(mockBack).not.toHaveBeenCalled();
    }
  );
});
