import React from "react";
import { Image } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import LogDetailScreen from "@/app/home/personal/(tabs)/logs/[logId]";
import { API_URL } from "@/api/apiRequest";

const mockGetPersonalLog = jest.fn();
const mockUpdatePersonalLog = jest.fn();
const mockDeletePersonalLog = jest.fn();

jest.mock("@/api/logs", () => ({
  getPersonalLog: (...args: any[]) => mockGetPersonalLog(...args),
  updatePersonalLog: (...args: any[]) => mockUpdatePersonalLog(...args),
  deletePersonalLog: (...args: any[]) => mockDeletePersonalLog(...args)
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ logId: "log-1" }),
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() })
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/components/nav/BackButton", () => {
  const { View } = require("react-native");
  return () => <View testID="back-button" />;
});

describe("LogDetailScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGetPersonalLog.mockResolvedValue({
      id: "log-1",
      growId: "grow-1",
      plantId: "plant-1",
      type: "photo",
      date: "2026-06-30T12:00:00.000Z",
      title: "Leaf photo",
      notes: "Attached symptom photo.",
      photos: ["/uploads/log-photo.jpg"],
      photoMetadata: [
        {
          url: "/uploads/log-photo.jpg",
          mimeType: "image/jpeg",
          width: 1600,
          height: 1200
        }
      ],
      tags: ["yellowing"],
      createdAt: "2026-06-30T12:00:00.000Z",
      updatedAt: "2026-06-30T12:00:00.000Z"
    });
  });

  it("renders uploaded log photos with absolute API image URLs", async () => {
    const screen = render(<LogDetailScreen />);

    await waitFor(() => expect(mockGetPersonalLog).toHaveBeenCalledWith("log-1"));
    expect(screen.getByText("Leaf photo")).toBeTruthy();
    expect(screen.getByText("image/jpeg | 1600x1200")).toBeTruthy();

    const image = screen.UNSAFE_getAllByType(Image)[0];
    expect(image.props.source).toEqual({
      uri: `${API_URL}/uploads/log-photo.jpg`
    });
  });
});
