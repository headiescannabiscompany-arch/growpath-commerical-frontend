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

import {
  requestCurrentCoordinates,
  type PublicCoordinates
} from "@/utils/locationSearch";

export type ThemeMode = "auto" | "day" | "night";
export type ResolvedThemeMode = "day" | "night";
export type ThemeAutoStrategy = "device" | "location";
export type ThemeLocationPreference = PublicCoordinates & {
  updatedAt: string;
};

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
  autoUsesLocation: boolean;
  themeLocation: ThemeLocationPreference | null;
  setThemeMode: (mode: ThemeMode) => void;
  enableLocationAuto: () => Promise<void>;
  disableLocationAuto: () => Promise<void>;
};

const STORAGE_KEY = "gp.theme.mode";
const AUTO_STRATEGY_STORAGE_KEY = "gp.theme.auto.strategy";
const AUTO_LOCATION_STORAGE_KEY = "gp.theme.auto.location";

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
  page: "#0E141B",
  surface: "#151D27",
  surfaceMuted: "#1A2330",
  surfaceStrong: "#202B39",
  card: "#151D27",
  border: "#283545",
  borderSoft: "#334355",
  text: "#F4F7FB",
  textMuted: "#C9D4DF",
  textSoft: "#DEE7F0",
  accent: "#78AAFF",
  accentSoft: "#16263A",
  accentText: "#FFFFFF",
  hero: "#101823",
  heroText: "#FFFFFF",
  heroMuted: "#E4ECF5",
  tabBar: "#0D131A",
  tabBarBorder: "#223042",
  tabActive: "#78AAFF",
  tabInactive: "#D6DEE8",
  link: "#78AAFF",
  success: "#8FA06E",
  warning: "#E3BE63",
  danger: "#E29B9B",
  info: "#78AAFF",
  shadow: "#00000088"
};

function normalizeSystemScheme(
  scheme: ColorSchemeName | ResolvedThemeMode | null | undefined
): ResolvedThemeMode {
  return scheme === "dark" || scheme === "night" ? "night" : "day";
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeAngle(value: number) {
  const remainder = value % 360;
  return remainder < 0 ? remainder + 360 : remainder;
}

function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current.getTime() - start.getTime()) / 86400000);
}

function computeSolarTimes(date: Date, latitude: number, longitude: number) {
  const lngHour = longitude / 15;
  const n = dayOfYear(date);
  const timezoneOffsetHours = -date.getTimezoneOffset() / 60;

  const computeEvent = (event: "sunrise" | "sunset") => {
    const t = n + ((event === "sunrise" ? 6 : 18) - lngHour) / 24;
    const meanAnomaly = 0.9856 * t - 3.289;
    let trueLongitude =
      meanAnomaly +
      1.916 * Math.sin(toRadians(meanAnomaly)) +
      0.02 * Math.sin(toRadians(2 * meanAnomaly)) +
      282.634;
    trueLongitude = normalizeAngle(trueLongitude);

    let rightAscension = toDegrees(
      Math.atan(0.91764 * Math.tan(toRadians(trueLongitude)))
    );
    rightAscension = normalizeAngle(rightAscension);
    const lQuadrant = Math.floor(trueLongitude / 90) * 90;
    const raQuadrant = Math.floor(rightAscension / 90) * 90;
    rightAscension = (rightAscension + (lQuadrant - raQuadrant)) / 15;

    const sinDeclination = 0.39782 * Math.sin(toRadians(trueLongitude));
    const cosDeclination = Math.cos(Math.asin(sinDeclination));
    const cosHourAngle =
      (Math.cos(toRadians(90.833)) - sinDeclination * Math.sin(toRadians(latitude))) /
      (cosDeclination * Math.cos(toRadians(latitude)));

    if (cosHourAngle > 1) {
      return { state: "night" as const, minutes: null };
    }
    if (cosHourAngle < -1) {
      return { state: "day" as const, minutes: null };
    }

    const hourAngle =
      event === "sunrise"
        ? 360 - toDegrees(Math.acos(cosHourAngle))
        : toDegrees(Math.acos(cosHourAngle));
    const localMeanTime = hourAngle / 15 + rightAscension - 0.06571 * t - 6.622;
    const universalTime = localMeanTime - lngHour;
    const localTimeHours = (universalTime + timezoneOffsetHours + 24) % 24;
    return {
      state: null as "day" | "night" | null,
      minutes: Math.round(localTimeHours * 60)
    };
  };

  return {
    sunrise: computeEvent("sunrise"),
    sunset: computeEvent("sunset")
  };
}

function resolveLocationThemeMode(
  location: ThemeLocationPreference,
  nowMs: number
): ResolvedThemeMode {
  const now = new Date(nowMs);
  const { sunrise, sunset } = computeSolarTimes(
    now,
    location.latitude,
    location.longitude
  );
  if (sunrise.state === "night" || sunset.state === "night") return "night";
  if (sunrise.state === "day" || sunset.state === "day") return "day";
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sunriseMinutes = sunrise.minutes ?? 360;
  const sunsetMinutes = sunset.minutes ?? 1080;
  return currentMinutes >= sunriseMinutes && currentMinutes < sunsetMinutes
    ? "day"
    : "night";
}

function parseStoredLocation(raw: string | null): ThemeLocationPreference | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const latitude = Number(parsed?.latitude);
    const longitude = Number(parsed?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return {
      latitude,
      longitude,
      updatedAt:
        typeof parsed?.updatedAt === "string" && parsed.updatedAt
          ? parsed.updatedAt
          : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export function resolveThemeMode(
  mode: ThemeMode,
  systemScheme: ColorSchemeName | ResolvedThemeMode | null | undefined,
  autoStrategy: ThemeAutoStrategy = "device",
  location: ThemeLocationPreference | null = null,
  nowMs = Date.now()
): ResolvedThemeMode {
  if (mode === "day") return "day";
  if (mode === "night") return "night";
  if (autoStrategy === "location" && location) {
    return resolveLocationThemeMode(location, nowMs);
  }
  return normalizeSystemScheme(systemScheme);
}

export function getThemePalette(
  mode: ThemeMode,
  systemScheme: ColorSchemeName | ResolvedThemeMode | null | undefined,
  autoStrategy: ThemeAutoStrategy = "device",
  location: ThemeLocationPreference | null = null,
  nowMs = Date.now()
): ThemePalette {
  const resolvedMode = resolveThemeMode(
    mode,
    systemScheme,
    autoStrategy,
    location,
    nowMs
  );
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
  autoUsesLocation: false,
  themeLocation: null,
  setThemeMode: () => {},
  enableLocationAuto: async () => {},
  disableLocationAuto: async () => {}
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_VALUE);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("auto");
  const [autoStrategy, setAutoStrategy] = useState<ThemeAutoStrategy>("device");
  const [themeLocation, setThemeLocation] = useState<ThemeLocationPreference | null>(
    null
  );
  const [systemScheme, setSystemScheme] = useState<ResolvedThemeMode>(
    normalizeSystemScheme(Appearance.getColorScheme())
  );
  const [hydrated, setHydrated] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        const [storedMode, storedStrategy, storedLocation] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(AUTO_STRATEGY_STORAGE_KEY),
          AsyncStorage.getItem(AUTO_LOCATION_STORAGE_KEY)
        ]);
        if (!alive) return;
        if (storedMode === "auto" || storedMode === "day" || storedMode === "night") {
          setMode(storedMode);
        }
        if (storedStrategy === "device" || storedStrategy === "location") {
          setAutoStrategy(storedStrategy);
        }
        setThemeLocation(parseStoredLocation(storedLocation));
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
    void Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, mode),
      AsyncStorage.setItem(AUTO_STRATEGY_STORAGE_KEY, autoStrategy),
      themeLocation
        ? AsyncStorage.setItem(AUTO_LOCATION_STORAGE_KEY, JSON.stringify(themeLocation))
        : AsyncStorage.removeItem(AUTO_LOCATION_STORAGE_KEY)
    ]);
  }, [mode, autoStrategy, themeLocation, hydrated]);

  useEffect(() => {
    if (mode !== "auto" || autoStrategy !== "location" || !themeLocation) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [mode, autoStrategy, themeLocation]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
  }, []);

  const enableLocationAuto = useCallback(async () => {
    const coordinates = await requestCurrentCoordinates();
    const nextLocation: ThemeLocationPreference = {
      ...coordinates,
      updatedAt: new Date().toISOString()
    };
    setMode("auto");
    setAutoStrategy("location");
    setThemeLocation(nextLocation);
  }, []);

  const disableLocationAuto = useCallback(async () => {
    setMode("auto");
    setAutoStrategy("device");
    setThemeLocation(null);
  }, []);

  const resolvedMode = resolveThemeMode(
    mode,
    systemScheme,
    autoStrategy,
    themeLocation,
    nowMs
  );
  const palette = useMemo(
    () => getThemePalette(mode, systemScheme, autoStrategy, themeLocation, nowMs),
    [mode, systemScheme, autoStrategy, themeLocation, nowMs]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      palette,
      hydrated,
      systemScheme,
      autoUsesLocation: autoStrategy === "location" && !!themeLocation,
      themeLocation,
      setThemeMode,
      enableLocationAuto,
      disableLocationAuto
    }),
    [
      mode,
      resolvedMode,
      palette,
      hydrated,
      systemScheme,
      autoStrategy,
      themeLocation,
      setThemeMode,
      enableLocationAuto,
      disableLocationAuto
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
