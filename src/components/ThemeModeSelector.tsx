import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { radius } from "@/theme/theme";
import { ThemeMode, useAppTheme } from "@/theme/appTheme";

const OPTIONS: Array<{
  key: ThemeMode;
  label: string;
  description: string;
}> = [
  {
    key: "auto",
    label: "Auto",
    description: "Uses saved location sunrise/sunset, otherwise local clock time."
  },
  {
    key: "day",
    label: "Day",
    description: "Uses the lighter green day UI."
  },
  {
    key: "night",
    label: "Night",
    description: "Uses the softer blue-gray night UI."
  }
];

export default function ThemeModeSelector() {
  const [locationStatus, setLocationStatus] = useState("");
  const [locationPending, setLocationPending] = useState(false);
  const {
    mode,
    resolvedMode,
    setThemeMode,
    palette,
    autoUsesLocation,
    themeLocation,
    enableLocationAuto,
    disableLocationAuto
  } = useAppTheme();

  const handleUseLocation = async () => {
    if (locationPending) return;
    setLocationPending(true);
    setLocationStatus("Requesting your location...");
    try {
      await enableLocationAuto();
      setLocationStatus("Location saved. Auto now follows sunrise and sunset.");
    } catch (error) {
      setLocationStatus(
        error instanceof Error
          ? error.message
          : "Location access failed. Auto will keep using local clock time."
      );
    } finally {
      setLocationPending(false);
    }
  };

  const handleUseDeviceTheme = async () => {
    if (locationPending) return;
    setLocationPending(true);
    try {
      await disableLocationAuto();
      setLocationStatus("Auto now follows local clock time.");
    } finally {
      setLocationPending(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ]}
    >
      <Text style={[styles.kicker, { color: palette.accent }]}>Appearance</Text>
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.title, { color: palette.text }]}
      >
        Day, night, or auto
      </Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>
        Auto now asks once for location, saves it, and then follows sunrise/sunset. Day
        uses the lighter green UI. Night uses the darker blue-gray UI with bright text and
        blue clickable links.
      </Text>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Appearance mode"
        style={styles.segmentRow}
      >
        {OPTIONS.map((option) => {
          const selected = mode === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityLabel={`Set appearance to ${option.label}`}
              accessibilityState={{ checked: selected }}
              onPress={() => setThemeMode(option.key)}
              style={({ pressed }) => [
                styles.segment,
                {
                  backgroundColor: selected ? palette.accent : palette.surfaceMuted,
                  borderColor: selected ? palette.accent : palette.border
                },
                pressed && styles.pressed
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: selected ? palette.accentText : palette.text }
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.segmentBody,
                  { color: selected ? palette.accentText : palette.textMuted }
                ]}
              >
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === "auto" ? (
        <View
          style={[
            styles.autoPanel,
            { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
          ]}
        >
          <Text
            accessibilityRole="header"
            aria-level={3}
            style={[styles.autoTitle, { color: palette.text }]}
          >
            Auto theme behavior
          </Text>
          <Text style={[styles.autoBody, { color: palette.textMuted }]}>
            {autoUsesLocation
              ? "Using your saved location to switch at sunrise and sunset."
              : "Using local clock time right now. Save a location once if you want exact sunrise/sunset behavior instead."}
          </Text>
          {themeLocation ? (
            <Text style={[styles.autoMeta, { color: palette.textSoft }]}>
              Location saved for theme timing.
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use my location for auto theme"
              accessibilityState={{ disabled: locationPending }}
              disabled={locationPending}
              onPress={() => void handleUseLocation()}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: palette.accent,
                  borderColor: palette.accent
                },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.actionButtonText, { color: palette.accentText }]}>
                Use my location
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use local clock time for auto theme"
              accessibilityState={{ disabled: locationPending }}
              disabled={locationPending}
              onPress={() => void handleUseDeviceTheme()}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border
                },
                pressed && styles.pressed
              ]}
            >
              <Text style={[styles.actionButtonText, { color: palette.text }]}>
                Use local time
              </Text>
            </Pressable>
          </View>
          {locationStatus ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.autoMeta, { color: palette.textSoft }]}
            >
              {locationStatus}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text
        accessibilityLiveRegion="polite"
        style={[styles.footer, { color: palette.textMuted }]}
      >
        Current: {mode.toUpperCase()} / Resolved: {resolvedMode.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4
  },
  body: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6
  },
  segmentRow: {
    gap: 10,
    marginTop: 12
  },
  autoPanel: {
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 12,
    padding: 12
  },
  autoTitle: {
    fontSize: 14,
    fontWeight: "900"
  },
  autoBody: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4
  },
  autoMeta: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  actionButton: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 132,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  segment: {
    borderRadius: radius.card,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    padding: 12
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "900"
  },
  segmentBody: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4
  },
  pressed: { opacity: 0.88 },
  footer: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10
  }
});
