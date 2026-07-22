import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilityGrowsTab from "@/app/home/facility/(tabs)/grows";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockClearError = jest.fn();
const mockHandleApiError = jest.fn();
const mockApiErrorHandler = {
  error: null,
  clearError: mockClearError,
  handleApiError: mockHandleApiError
};
const mockRouter = { push: mockPush, replace: mockReplace };
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    grows: (facilityId: string) => `/api/facility/${facilityId}/grows`
  }
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/hooks/useApiErrorHandler", () => ({
  useApiErrorHandler: () => mockApiErrorHandler
}));

describe("FacilityGrowsTab", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = { roomId: "room-1", roomName: "Flower Room" };
    mockApiRequest.mockResolvedValue({ grows: [] });
  });

  it("opens supported grow setup for the exact room from the empty state", async () => {
    const screen = render(<FacilityGrowsTab />);

    await waitFor(() =>
      expect(screen.getByText("No grows in this room yet")).toBeTruthy()
    );
    expect(
      screen.getByText(
        "Start a grow in Flower Room to connect its plants, tasks, logs, and AI context."
      )
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Start grow in Flower Room"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/onboarding/start-grow",
      params: { roomId: "room-1", roomName: "Flower Room" }
    });
  });
});
