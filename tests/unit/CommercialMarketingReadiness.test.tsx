import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import CommercialMarketingRoute from "@/app/home/commercial/marketing";

const mockFetch = jest.fn();
const mockLines = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/api/campaigns", () => ({
  fetchCampaigns: () => mockFetch(),
  createCampaign: (...args: any[]) => mockCreate(...args)
}));
jest.mock("@/api/commercialWorkflows", () => ({ fetchProductLines: () => mockLines() }));
jest.mock("expo-router", () => {
  const React = require("react");
  return { Link: ({ children, href }: any) => React.cloneElement(children, { href }) };
});
jest.mock("@/components/layout/AppPage", () => {
  const { View } = require("react-native");
  return function MockAppPage({ children, header }: any) {
    return (
      <View>
        {header}
        {children}
      </View>
    );
  };
});
jest.mock("@/components/layout/AppCard", () => {
  const { View } = require("react-native");
  return function MockAppCard({ children }: any) {
    return <View>{children}</View>;
  };
});
jest.mock("@/components/schedule/SchedulePicker", () => () => null);
jest.mock("@/components/InlineError", () => {
  const { Text } = require("react-native");
  return { InlineError: ({ error }: any) => <Text>{error.message}</Text> };
});
jest.mock("@/utils/photoUploads", () => ({
  persistImageUri: async (value: string) => value,
  resolveImageUri: (value: string) => value
}));
jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn()
}));

describe("Marketing Planner read readiness", () => {
  beforeEach(() => {
    mockFetch.mockReset().mockResolvedValue([]);
    mockLines.mockReset().mockResolvedValue([]);
    mockCreate.mockReset().mockResolvedValue({});
  });

  it("does not invent zeros or an empty plan list while the initial read is pending", async () => {
    let resolve!: (value: any[]) => void;
    mockFetch.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const screen = render(<CommercialMarketingRoute />);
    expect(screen.getByText("Loading marketing plans...")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.queryByText(/No marketing plans yet/)).toBeNull();
    expect(screen.queryAllByText("0")).toHaveLength(0);
    await act(async () => resolve([]));
    expect(screen.getByText(/No marketing plans yet/)).toBeTruthy();
    expect(screen.getAllByText("0")).toHaveLength(4);
  });

  it("retries an initial failure without clearing the form or creating a plan", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));
    const screen = render(<CommercialMarketingRoute />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load marketing plans")).toBeTruthy()
    );
    expect(screen.queryByText(/No marketing plans yet/)).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(4);
    fireEvent.changeText(screen.getByLabelText("Marketing plan name"), "Unsaved draft");
    fireEvent.press(screen.getByRole("button", { name: "Retry marketing plans" }));
    await waitFor(() => expect(screen.getByText(/No marketing plans yet/)).toBeTruthy());
    expect(screen.getByLabelText("Marketing plan name").props.value).toBe(
      "Unsaved draft"
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("does not turn a related product-line failure into a successful empty plan list", async () => {
    mockLines.mockRejectedValueOnce(new Error("Lines unavailable"));
    const screen = render(<CommercialMarketingRoute />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load marketing plans")).toBeTruthy()
    );
    expect(screen.queryByText(/No marketing plans yet/)).toBeNull();
    expect(screen.getAllByText("—")).toHaveLength(4);
    fireEvent.press(screen.getByRole("button", { name: "Retry marketing plans" }));
    await waitFor(() => expect(screen.getByText(/No marketing plans yet/)).toBeTruthy());
  });

  it("retains and labels saved plans and metrics after refresh failure", async () => {
    mockFetch.mockResolvedValueOnce([
      { id: "plan-1", name: "Saved plan", clicks: 7, status: "active" }
    ]);
    const screen = render(<CommercialMarketingRoute />);
    await waitFor(() => expect(screen.getByText("Saved plan")).toBeTruthy());
    mockFetch.mockRejectedValueOnce(new Error("Refresh failed"));
    fireEvent.press(screen.getByRole("button", { name: "Refresh marketing plans" }));
    await waitFor(() =>
      expect(screen.getByText(/Showing previously loaded plans and totals/)).toBeTruthy()
    );
    expect(screen.getByText("Saved plan")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.queryByText(/No marketing plans yet/)).toBeNull();
  });

  it("does not present a previous empty result as current after refresh failure", async () => {
    const screen = render(<CommercialMarketingRoute />);
    await waitFor(() => expect(screen.getByText(/No marketing plans yet/)).toBeTruthy());
    mockFetch.mockRejectedValueOnce(new Error("Refresh failed"));
    fireEvent.press(screen.getByRole("button", { name: "Refresh marketing plans" }));
    await waitFor(() =>
      expect(screen.getByText("Unable to load marketing plans")).toBeTruthy()
    );
    expect(screen.queryByText(/No marketing plans yet/)).toBeNull();
    expect(screen.getByText(/Showing previously loaded plans and totals/)).toBeTruthy();
  });

  it("coalesces repeated retry actions into one read", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Failed"));
    const screen = render(<CommercialMarketingRoute />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load marketing plans")).toBeTruthy()
    );
    let resolve!: (value: any[]) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    const retry = screen.getByRole("button", { name: "Retry marketing plans" });
    act(() => {
      fireEvent.press(retry);
      fireEvent.press(retry);
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await act(async () => resolve([]));
    expect(screen.getByText(/No marketing plans yet/)).toBeTruthy();
  });

  it("reloads after creation and preserves the original payload semantics", async () => {
    const screen = render(<CommercialMarketingRoute />);
    await waitFor(() => expect(screen.getByText(/No marketing plans yet/)).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("Marketing plan name"), "Draft plan");
    mockFetch.mockResolvedValueOnce([{ id: "created", name: "Draft plan" }]);
    fireEvent.press(screen.getByRole("button", { name: "Create marketing plan" }));
    await waitFor(() => expect(screen.getByText("Draft plan")).toBeTruthy());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Draft plan",
        status: "draft",
        budget: { totalBudget: 0 }
      })
    );
    expect(screen.getByLabelText("Marketing plan name").props.value).toBe("");
  });

  it("ignores an older read when the post-create refresh finishes first", async () => {
    let resolveOld!: (value: any[]) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((done) => {
        resolveOld = done;
      })
    );
    const screen = render(<CommercialMarketingRoute />);
    fireEvent.changeText(screen.getByLabelText("Marketing plan name"), "New plan");
    mockFetch.mockResolvedValueOnce([{ id: "new", name: "New plan" }]);
    fireEvent.press(screen.getByRole("button", { name: "Create marketing plan" }));
    await waitFor(() => expect(screen.getByText("New plan")).toBeTruthy());
    await act(async () => resolveOld([{ id: "old", name: "Stale plan" }]));
    expect(screen.queryByText("Stale plan")).toBeNull();
    expect(screen.getByText("New plan")).toBeTruthy();
  });
});
