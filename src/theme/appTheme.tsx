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
  page: "#000000",
  surface: "#121212",
  surfaceMuted: "#181818",
  surfaceStrong: "#202020",
  card: "#121212",
  border: "#2B2B2B",
  borderSoft: "#343434",
  text: "#F4F4F4",
  textMuted: "#B8B8B8",
  textSoft: "#D3D3D3",
  accent: "#6FA8FF",
  accentSoft: "#12223D",
  accentText: "#FFFFFF",
  hero: "#0A0A0A",
  heroText: "#FFFFFF",
  heroMuted: "#D6D6D6",
  tabBar: "#090909",
  tabBarBorder: "#242424",
  tabActive: "#7BB2FF",
  tabInactive: "#B9B9B9",
  link: "#7BB2FF",
  success: "#7B8F61",
  warning: "#F8C44E",
  danger: "#F28B8B",
  info: "#7AB0FF",
  shadow: "#00000088"
};

function normalizeSystemScheme(
  scheme: ColorSchemeName | ResolvedThemeMode | null | undefined
): ResolvedThemeMode {
  return scheme === "dark" || scheme === "night" ? "night" : "day";
}

export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: ColorSchemeName | ResolvedThemeMode | null | undefined
): ResolvedThemeMode {
  if (mode === "day") return "day";
  if (mode === "night") return "night";
  return normalizeSystemScheme(systemScheme);
}

export function getThemePalette(
  mode: ThemeMode,
  systemScheme: ColorSchemeName | ResolvedThemeMode | null | undefined
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
  const [systemScheme, setSystemScheme] = useState<ResolvedThemeMode>(
    normalizeSystemScheme(Appearance.getColorScheme())
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
      systemScheme,
      setThemeMode
    }),
    [mode, resolvedMode, palette, hydrated, systemScheme, setThemeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
