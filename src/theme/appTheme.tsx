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
  surfaceMuted: "#ECFDF5",
  surfaceStrong: "#E3F4E9",
  card: "#FFFFFF",
  border: "#D7E3D5",
  borderSoft: "#E3EBDD",
  text: "#122012",
  textMuted: "#5F6F5F",
  textSoft: "#4B5A4B",
  accent: "#166534",
  accentSoft: "#DCFCE7",
  accentText: "#FFFFFF",
  hero: "#ECFDF5",
  heroText: "#052E16",
  heroMuted: "#166534",
  tabBar: "#FFFFFF",
  tabBarBorder: "#D7DDD2",
  tabActive: "#166534",
  tabInactive: "#5F6F5F",
  link: "#166534",
  success: "#166534",
  warning: "#B45309",
  danger: "#DC2626",
  info: "#2563EB",
  shadow: "#0F172A1A"
};

const NIGHT_PALETTE: Omit<ThemePalette, "mode" | "resolvedMode"> = {
  page: "#050805",
  surface: "#101711",
  surfaceMuted: "#141C15",
  surfaceStrong: "#182019",
  card: "#101711",
  border: "#273227",
  borderSoft: "#2E3930",
  text: "#F2F4F0",
  textMuted: "#BBC1B7",
  textSoft: "#D2D6CE",
  accent: "#6EA8FF",
  accentSoft: "#11243E",
  accentText: "#FFFFFF",
  hero: "#0D1E14",
  heroText: "#FFFFFF",
  heroMuted: "#D0D8CF",
  tabBar: "#0B110D",
  tabBarBorder: "#243025",
  tabActive: "#7AB0FF",
  tabInactive: "#B6BDB4",
  link: "#7AB0FF",
  success: "#5DD67D",
  warning: "#F8C44E",
  danger: "#F28B8B",
  info: "#7AB0FF",
  shadow: "#00000088"
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
