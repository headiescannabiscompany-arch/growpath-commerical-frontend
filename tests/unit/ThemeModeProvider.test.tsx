import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Appearance, Text, type ColorSchemeName } from "react-native";

import {
  ThemeModeProvider,
  useAppTheme,
  type ThemeLocationPreference
} from "@/theme/appTheme";

const mockRequestCurrentCoordinates = jest.fn();
const mockReadCurrentCoordinates = jest.fn();

jest.mock("@/utils/locationSearch", () => ({
  requestCurrentCoordinates: (...args: any[]) =>
    args[0]?.promptForPermission === false
      ? mockReadCurrentCoordinates(...args)
      : mockRequestCurrentCoordinates(...args)
}));

const STORAGE_KEY = "gp.theme.mode";
const STRATEGY_KEY = "gp.theme.auto.strategy";
const LOCATION_KEY = "gp.theme.auto.location";
const PROMPTED_KEY = "gp.theme.auto.location.prompted";

type ThemeContextSnapshot = ReturnType<typeof useAppTheme>;

let latestTheme: ThemeContextSnapshot | null = null;
let appearanceListener:
  | ((preferences: { colorScheme: ColorSchemeName }) => void)
  | undefined;
const removeAppearanceListener = jest.fn();
const storedValues = new Map<string, string>();

function ThemeProbe() {
  latestTheme = useAppTheme();
  return <Text testID="theme-probe">{latestTheme.resolvedMode}</Text>;
}

function renderProvider() {
  return render(
    <ThemeModeProvider>
      <ThemeProbe />
    </ThemeModeProvider>
  );
}

function theme() {
  if (!latestTheme) throw new Error("Theme context was not rendered.");
  return latestTheme;
}

function storeLocation(location: ThemeLocationPreference) {
  storedValues.set(LOCATION_KEY, JSON.stringify(location));
}

describe("ThemeModeProvider integration", () => {
  beforeEach(() => {
    latestTheme = null;
    appearanceListener = undefined;
    storedValues.clear();
    mockRequestCurrentCoordinates.mockReset();
    mockReadCurrentCoordinates.mockReset();
    removeAppearanceListener.mockReset();

    (AsyncStorage.getItem as jest.Mock)
      .mockReset()
      .mockImplementation(async (key: string) => storedValues.get(key) ?? null);
    (AsyncStorage.setItem as jest.Mock)
      .mockReset()
      .mockImplementation(async (key: string, value: string) => {
        storedValues.set(key, value);
      });
    (AsyncStorage.removeItem as jest.Mock)
      .mockReset()
      .mockImplementation(async (key: string) => {
        storedValues.delete(key);
      });

    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
    jest
      .spyOn(Appearance, "addChangeListener")
      .mockImplementation((listener: typeof appearanceListener) => {
        appearanceListener = listener;
        return { remove: removeAppearanceListener };
      });
  });

  it("hydrates persisted auto strategy and location before resolving the provider", async () => {
    const savedLocation: ThemeLocationPreference = {
      latitude: 39.2904,
      longitude: -76.6122,
      updatedAt: "2026-08-01T12:00:00.000Z"
    };
    storedValues.set(STORAGE_KEY, "auto");
    storedValues.set(STRATEGY_KEY, "location");
    storeLocation(savedLocation);
    storedValues.set(PROMPTED_KEY, "1");

    renderProvider();

    await waitFor(() => expect(theme().hydrated).toBe(true));
    expect(theme().mode).toBe("auto");
    expect(theme().autoUsesLocation).toBe(true);
    expect(theme().themeLocation).toEqual(savedLocation);
    expect(mockRequestCurrentCoordinates).not.toHaveBeenCalled();
    expect(mockReadCurrentCoordinates).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(storedValues.get(STORAGE_KEY)).toBe("auto");
      expect(storedValues.get(STRATEGY_KEY)).toBe("location");
      expect(storedValues.get(PROMPTED_KEY)).toBe("1");
      expect(JSON.parse(storedValues.get(LOCATION_KEY) || "null")).toEqual(savedLocation);
    });
  });

  it("uses device appearance without touching geolocation during startup", async () => {
    (Appearance.getColorScheme as jest.Mock).mockReturnValue("dark");

    renderProvider();

    await waitFor(() => expect(theme().hydrated).toBe(true));
    await waitFor(() => expect(storedValues.get(PROMPTED_KEY)).toBe("0"));
    expect(mockReadCurrentCoordinates).not.toHaveBeenCalled();
    expect(mockRequestCurrentCoordinates).not.toHaveBeenCalled();
    expect(theme().hydrated).toBe(true);
    expect(theme().mode).toBe("auto");
    expect(theme().resolvedMode).toBe("night");
    expect(theme().autoUsesLocation).toBe(false);
    expect(theme().themeLocation).toBeNull();
    expect(storedValues.get(STRATEGY_KEY)).toBe("device");
  });

  it("allows an explicit permission request after silent startup found no permission", async () => {
    renderProvider();

    await waitFor(() => expect(theme().hydrated).toBe(true));
    await waitFor(() => expect(storedValues.get(PROMPTED_KEY)).toBe("0"));
    expect(mockReadCurrentCoordinates).not.toHaveBeenCalled();
    expect(theme().autoUsesLocation).toBe(false);

    mockRequestCurrentCoordinates.mockResolvedValue({
      latitude: 39.2904,
      longitude: -76.6122
    });
    await act(async () => {
      await theme().enableLocationAuto();
    });

    await waitFor(() => expect(theme().autoUsesLocation).toBe(true));
    await waitFor(() => {
      expect(storedValues.get(STRATEGY_KEY)).toBe("location");
      expect(storedValues.get(PROMPTED_KEY)).toBe("1");
      expect(storedValues.has(LOCATION_KEY)).toBe(true);
    });
    expect(mockRequestCurrentCoordinates).toHaveBeenCalledTimes(1);
  });

  it("updates auto mode when the device appearance changes", async () => {
    storedValues.set(STORAGE_KEY, "auto");
    storedValues.set(STRATEGY_KEY, "device");
    storedValues.set(PROMPTED_KEY, "1");

    const screen = renderProvider();

    await waitFor(() => expect(theme().hydrated).toBe(true));
    expect(theme().resolvedMode).toBe("day");
    expect(appearanceListener).toBeDefined();
    expect(mockRequestCurrentCoordinates).not.toHaveBeenCalled();

    act(() => {
      appearanceListener?.({ colorScheme: "dark" });
    });
    await waitFor(() => expect(theme().resolvedMode).toBe("night"));

    screen.unmount();
    expect(removeAppearanceListener).toHaveBeenCalledTimes(1);
  });
});
