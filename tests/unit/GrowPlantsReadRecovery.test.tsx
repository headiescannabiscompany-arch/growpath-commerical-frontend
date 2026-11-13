import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import GrowPlantsScreen from "@/app/home/personal/(tabs)/grows/[growId]/plants";

const mockListWorkspacePlants = jest.fn();
const mockCreateWorkspacePlant = jest.fn();
let mockFocused = true;

jest.mock("@/auth/AuthContext", () => ({
  ...jest.requireActual("@/auth/AuthContext"),
  useAuth: () => ({ user: { id: "account-1" } })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { PLANTS_PERSONAL_WRITE: "PLANTS_PERSONAL_WRITE" },
  useEntitlements: () => ({
    can: () => false,
    limits: { maxPlants: 1 }
  })
}));

jest.mock("@/features/grows/workspaceData", () => ({
  listWorkspacePlants: (...args: unknown[]) => mockListWorkspacePlants(...args),
  createWorkspacePlant: (...args: unknown[]) => mockCreateWorkspacePlant(...args),
  growWorkspaceBasePath: (workspace: string) => `/home/${workspace}`
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ growId: "grow-1" }),
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children
}));

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: () => (() => void) | undefined) => {
      const focused = mockFocused;
      React.useEffect(() => (focused ? callback() : undefined), [callback, focused]);
    }
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => () => null);
jest.mock("@/components/personal/GrowWorkspaceNav", () => () => null);

const savedPlant = { id: "plant-1", name: "Saved blueberry", stage: "vegetative" };

describe("Grow Plants read recovery", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFocused = true;
  });

  it("keeps plant actions and empty copy out of a failed read and retries the same grow", async () => {
    let rejectRead!: (error: Error) => void;
    mockListWorkspacePlants.mockReturnValueOnce(new Promise((_, reject) => {
      rejectRead = reject;
    }));
    mockListWorkspacePlants.mockResolvedValueOnce([savedPlant]);

    const screen = render(<GrowPlantsScreen />);
    expect(screen.queryByText("No plants yet")).toBeNull();
    expect(screen.queryByText("Plant tracking writes are Pro")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add plant" })).toBeNull();

    await act(async () => {
      rejectRead(new Error("Simulated plant read failure"));
    });
    expect(screen.getByText("Could not load plants")).toBeTruthy();
    expect(screen.queryByText("No plants yet")).toBeNull();
    expect(screen.queryByText("Plant tracking writes are Pro")).toBeNull();
    expect(screen.queryByRole("button", { name: "Add plant" })).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    });
    expect(screen.getByText("Saved blueberry")).toBeTruthy();
    expect(screen.queryByText("Could not load plants")).toBeNull();
    expect(mockListWorkspacePlants.mock.calls).toEqual([
      ["personal", "grow-1", { verifyRecords: true }],
      ["personal", "grow-1", { verifyRecords: true }]
    ]);
    expect(mockCreateWorkspacePlant).not.toHaveBeenCalled();
  });

  it("offers the Free first-plant form after a verified empty read", async () => {
    mockListWorkspacePlants.mockResolvedValue([]);
    const screen = render(<GrowPlantsScreen />);

    expect(await screen.findByText("No plants yet")).toBeTruthy();
    expect(screen.queryByText("Plant tracking writes are Pro")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Add plant" }));
    expect(screen.getByLabelText("Plant name")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add plant to grow" })).toBeTruthy();
    expect(mockListWorkspacePlants).toHaveBeenCalledWith("personal", "grow-1", {
      verifyRecords: true
    });
  });

  it("keeps an open plant draft while a focus read fails and recovers", async () => {
    mockListWorkspacePlants.mockResolvedValue([]);
    const screen = render(<GrowPlantsScreen />);
    await screen.findByText("No plants yet");
    fireEvent.press(screen.getByRole("button", { name: "Add plant" }));
    fireEvent.changeText(screen.getByLabelText("Plant name"), "Unsaved blueberry");
    expect(screen.getByRole("button", { name: "Add plant to grow", disabled: false })).toBeTruthy();

    let rejectRead!: (error: Error) => void;
    mockListWorkspacePlants.mockReturnValueOnce(new Promise((_, reject) => {
      rejectRead = reject;
    }));
    mockFocused = false;
    screen.rerender(<GrowPlantsScreen />);
    mockFocused = true;
    screen.rerender(<GrowPlantsScreen />);
    await act(async () => {
      rejectRead(new Error("Simulated refresh failure"));
    });

    expect(screen.getByText("Could not load plants")).toBeTruthy();
    expect(screen.getByLabelText("Plant name").props.value).toBe("Unsaved blueberry");
    expect(screen.getByRole("button", { name: "Add plant to grow", disabled: true })).toBeTruthy();
    expect(screen.queryByText("Plant tracking writes are Pro")).toBeNull();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    });
    expect(screen.getByLabelText("Plant name").props.value).toBe("Unsaved blueberry");
    expect(screen.getByRole("button", { name: "Add plant to grow", disabled: false })).toBeTruthy();
    expect(mockCreateWorkspacePlant).not.toHaveBeenCalled();
  });

  it("keeps a Commercial plant draft after a rejected save and clears it on confirmed success", async () => {
    mockListWorkspacePlants
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([savedPlant]);
    mockCreateWorkspacePlant
      .mockRejectedValueOnce(new ApiError("INVALID_PLANT", 400))
      .mockResolvedValueOnce({ ...savedPlant, growId: "grow-1" });

    const screen = render(<GrowPlantsScreen workspace="commercial" />);
    await screen.findByText("No plants yet");
    fireEvent.press(screen.getByRole("button", { name: "Add plant" }));
    fireEvent.changeText(screen.getByLabelText("Plant name"), savedPlant.name);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Add plant to grow" }));
    });
    expect(screen.getByLabelText("Plant name").props.value).toBe(savedPlant.name);
    expect(screen.getByText("Could not save the plant. Check the plant details and try again.")).toBeTruthy();
    expect(screen.queryByText("Plant added to this grow.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Check plants" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add plant to grow", disabled: false })).toBeTruthy();
    expect(mockCreateWorkspacePlant).toHaveBeenCalledTimes(1);
    expect(mockListWorkspacePlants).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Add plant to grow" }));
    });
    expect(await screen.findByText(savedPlant.name)).toBeTruthy();
    expect(screen.getByText("Plant added to this grow.")).toBeTruthy();
    expect(screen.queryByLabelText("Plant name")).toBeNull();
    expect(mockCreateWorkspacePlant.mock.calls).toEqual([
      ["commercial", expect.objectContaining({ growId: "grow-1", name: savedPlant.name })],
      ["commercial", expect.objectContaining({ growId: "grow-1", name: savedPlant.name })]
    ]);
    expect(mockListWorkspacePlants.mock.calls).toEqual([
      ["commercial", "grow-1", { verifyRecords: true }],
      ["commercial", "grow-1", { verifyRecords: true }]
    ]);
  });

  it.each([
    ["a 503 response", new ApiError("SERVICE_UNAVAILABLE", 503), null],
    ["a null result", null, null],
    ["an incomplete response", null, { growId: "grow-1" }],
    ["a response for another grow", null, { id: "plant-2", growId: "grow-2" }]
  ])("checks the same plants before allowing another save after %s", async (_label, failure, response) => {
    mockListWorkspacePlants.mockResolvedValue([]);
    if (failure) mockCreateWorkspacePlant.mockRejectedValueOnce(failure);
    else mockCreateWorkspacePlant.mockResolvedValueOnce(response);

    const screen = render(<GrowPlantsScreen workspace="commercial" />);
    await screen.findByText("No plants yet");
    fireEvent.press(screen.getByRole("button", { name: "Add plant" }));
    fireEvent.changeText(screen.getByLabelText("Plant name"), "Unsaved blueberry");

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Add plant to grow" }));
    });
    expect(screen.getByText(/Could not confirm the plant was saved/)).toBeTruthy();
    expect(screen.getByLabelText("Plant name").props.value).toBe("Unsaved blueberry");
    expect(screen.getByRole("button", { name: "Add plant to grow", disabled: true })).toBeTruthy();
    expect(mockCreateWorkspacePlant).toHaveBeenCalledTimes(1);
    expect(mockListWorkspacePlants).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Check plants" }));
    });
    expect(mockListWorkspacePlants.mock.calls).toEqual([
      ["commercial", "grow-1", { verifyRecords: true }],
      ["commercial", "grow-1", { verifyRecords: true }]
    ]);
    expect(mockCreateWorkspacePlant).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Plant name").props.value).toBe("Unsaved blueberry");
    expect(screen.getByRole("button", { name: "Add plant to grow", disabled: false })).toBeTruthy();
  });
});
