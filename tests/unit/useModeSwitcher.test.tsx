import React from "react";
import { Pressable, Text } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";

import { useModeSwitcher } from "@/features/mode/useModeSwitcher";
import { switchAccountMode } from "@/features/mode/switchAccountMode";

const mockReplace = jest.fn();
const mockSetMode = jest.fn();
const mockSetPreferredMode = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/state/useAccountMode", () => ({
  useAccountMode: () => ({ mode: "personal", setMode: mockSetMode })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: "commercial",
    setPreferredMode: mockSetPreferredMode
  })
}));

jest.mock("@/features/mode/switchAccountMode", () => ({
  switchAccountMode: jest.fn()
}));

function ModeProbe() {
  const { mode, switchTo } = useModeSwitcher();
  return (
    <Pressable
      accessibilityLabel="Switch probe to Personal"
      onPress={() => switchTo("personal")}
    >
      <Text>{mode}</Text>
    </Pressable>
  );
}

describe("useModeSwitcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses the authoritative entitlement mode instead of the default local store", () => {
    const screen = render(<ModeProbe />);

    expect(screen.getByText("commercial")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Switch probe to Personal"));

    expect(switchAccountMode).toHaveBeenCalledWith(
      "personal",
      expect.objectContaining({
        currentMode: "commercial",
        setMode: mockSetMode,
        setPreferredMode: mockSetPreferredMode
      })
    );
  });
});
