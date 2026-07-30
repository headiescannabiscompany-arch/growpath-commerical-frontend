import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Appearance, type ColorSchemeName } from "react-native";

export type ThemeMode = "auto" | "day" | "night";
export type ResolvedThemeMode = "day" | "night";

export type ThemePalette = {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  page: string;
  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;
  card: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  textSoft: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  hero: string;
  heroText: string;
  heroMuted: string;
  tabBar: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  link: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  shadow: string;
};

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  palette: ThemePalette;
  hydrated: boolean;
  systemScheme: ResolvedThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "gp.theme.mode";

const DAY_PALETTE: Omit<ThemePalette, "mode" | "resolvedMode"> = {
  page: "#F1F7F2",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  surfaceStrong: "#E6F3EA",
  card: "#FFFFFF",
  border: "#DDE6D8",
  borderSoft: "#E2E8F0",
  text: "#172317",
  textMuted: "#5F6F5F",
  textSoft: "#4B5A4B",
  accent: "#1C8F4A",
  accentSoft: "#E0F4E7",
  accentText: "#FFFFFF",
  hero: "#172317",
  heroText: "#FFFFFF",
  heroMuted: "#D1FAE5",
  tabBar: "#FFFFFF",
  tabBarBorder: "#D7DDD2",
  tabActive: "#1C8F4A",
  tabInactive: "#5F6F5F",
  link: "#1D4ED8",
  success: "#1C8F4A",
  warning: "#B45309",
  danger: "#DC2626",
  info: "#2563EB",
  shadow: "#0F172A1A"
};

const NIGHT_PALETTE: Omit<ThemePalette, "mode" | "resolvedMode"> = {
  page: "#08101D",
  surface: "#0F172A",
  surfaceMuted: "#111C32",
  surfaceStrong: "#12213B",
  card: "#0F172A",
  border: "#1F2A44",
  borderSoft: "#22314E",
  text: "#F8FAFC",
  textMuted: "#A9B4C6",
  textSoft: "#C7D8FF",
  accent: "#7AA2FF",
  accentSoft: "#18345C",
  accentText: "#08101D",
  hero: "#0B1B31",
  heroText: "#FFFFFF",
  heroMuted: "#C7D8FF",
  tabBar: "#0B1220",
  tabBarBorder: "#1F2A44",
  tabActive: "#9BC1FF",
  tabInactive: "#A9B4C6",
  link: "#9BC1FF",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  info: "#7AA2FF",
  shadow: "#00000066"
};

function normalizeSystemScheme(scheme: ColorSchemeName): ResolvedThemeMode {
  return scheme === "dark" ? "night" : "day";
}

export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: ColorSchemeName
): ResolvedThemeMode {
  if (mode === "day") return "day";
  if (mode === "night") return "night";
  return normalizeSystemScheme(systemScheme);
}

export function getThemePalette(
  mode: ThemeMode,
  systemScheme: ColorSchemeName
): ThemePalette {
  const resolvedMode = resolveThemeMode(mode, systemScheme);
  const base = resolvedMode === "night" ? NIGHT_PALETTE : DAY_PALETTE;
  return {
    mode,
    resolvedMode,
    ...base
  };
}

const DEFAULT_THEME_PALETTE = getThemePalette("auto", Appearance.getColorScheme());
const DEFAULT_THEME_VALUE: ThemeContextValue = {
  mode: "auto",
  resolvedMode: DEFAULT_THEME_PALETTE.resolvedMode,
  palette: DEFAULT_THEME_PALETTE,
  hydrated: false,
  systemScheme: normalizeSystemScheme(Appearance.getColorScheme()),
  setThemeMode: () => {}
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_VALUE);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("auto");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!alive) return;
        if (stored === "auto" || stored === "day" || stored === "night") {
          setMode(stored);
        }
      } finally {
        if (alive) setHydrated(true);
      }
    })();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(normalizeSystemScheme(colorScheme));
    });

    return () => {
      alive = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_KEY, mode);
  }, [mode, hydrated]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
  }, []);

  const resolvedMode = resolveThemeMode(mode, systemScheme);
  const palette = useMemo(
    () => getThemePalette(mode, systemScheme),
    [mode, systemScheme]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      palette,
      hydrated,
      systemScheme: normalizeSystemScheme(systemScheme),
      setThemeMode
    }),
    [mode, resolvedMode, palette, hydrated, systemScheme, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
