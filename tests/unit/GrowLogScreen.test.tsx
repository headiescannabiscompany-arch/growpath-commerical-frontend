import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import GrowLogScreen from "@/screens/personal/GrowLogScreen";

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockListPersonalLogs = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void) => {
    const ReactActual = jest.requireActual("react");
    ReactActual.useEffect(effect, [effect]);
  },
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { growId: "grow-1" } })
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("@/api/logs", () => ({
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

describe("GrowLogScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads personal logs for the selected grow and opens the personal log route", async () => {
    mockListPersonalLogs.mockResolvedValue([]);

    const screen = render(<GrowLogScreen />);

    await waitFor(() =>
      expect(mockListPersonalLogs).toHaveBeenCalledWith({ growId: "grow-1" })
    );
    await waitFor(() => expect(screen.getByText("No log entries yet")).toBeTruthy());

    fireEvent.press(screen.getByText("Record Log"));

    expect(mockPush).toHaveBeenCalledWith("/home/personal/logs/new?growId=grow-1");
  });

  it("renders returned personal journal entries", async () => {
    mockListPersonalLogs.mockResolvedValue([
      {
        id: "log-1",
        growId: "grow-1",
        title: "Canopy check",
        notes: "Raised the light and checked airflow.",
        date: "2026-07-01"
      }
    ]);

    const screen = render(<GrowLogScreen />);

    await waitFor(() => expect(screen.getByText("Canopy check")).toBeTruthy());
    expect(screen.getByText("Raised the light and checked airflow.")).toBeTruthy();
    expect(screen.getByText("2026-07-01")).toBeTruthy();
  });
});
