import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";

// Mocks
const mockUseAuth = jest.fn();
const mockClient = jest.fn();

jest.mock("@/auth/AuthContext", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth()
}));

jest.mock("../src/api/client", () => ({
  __esModule: true,
  client: (...args) => mockClient(...args)
}));

// Avoid rendering the real embed in tests
jest.mock("../src/screens/LiveSessionTwitchEmbed", () => "LiveSessionTwitchEmbed");

import LiveSessionScreen from "../src/screens/LiveSessionScreen.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function renderWithNav(params = { sessionId: "session-1" }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <LiveSessionScreen route={{ params }} />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

describe("LiveSessionScreen QA", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockClient.mockReset();
  });

  it("renders moderation UI for admin", async () => {
    mockUseAuth.mockReturnValue({
      user: { _id: "admin" },
      capabilities: { canManageLiveSessions: true }
    });

    mockClient.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      title: "Session 1"
    });

    const { queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/Open Twitch Moderation/i)).toBeTruthy();
    });
  });

  it("hides moderation UI for non-admin", async () => {
    mockUseAuth.mockReturnValue({
      user: { _id: "user1" },
      capabilities: { canManageLiveSessions: false }
    });

    mockClient.mockResolvedValueOnce({
      twitchChannel: "mychannel",
      title: "Session 1"
    });

    const { queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/Open Twitch Moderation/i)).toBeNull();
    });
  });

  it("shows error if session not found", async () => {
    mockUseAuth.mockReturnValue({
      user: { _id: "user1" },
      capabilities: { canManageLiveSessions: false }
    });

    mockClient.mockRejectedValueOnce(new Error("No session found"));

    const { queryByText } = renderWithNav();

    await waitFor(() => {
      expect(queryByText(/No session found/i)).toBeTruthy();
    });
  });
});
