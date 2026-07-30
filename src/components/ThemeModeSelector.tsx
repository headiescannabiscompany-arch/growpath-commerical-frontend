import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
    description: "Follows your device appearance."
  },
  {
    key: "day",
    label: "Day",
    description: "Uses the main green UI."
  },
  {
    key: "night",
    label: "Night",
    description: "Uses the facility blue UI."
  }
];

export default function ThemeModeSelector() {
  const { mode, resolvedMode, setThemeMode, palette } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ]}
    >
      <Text style={[styles.kicker, { color: palette.accent }]}>Appearance</Text>
      <Text style={[styles.title, { color: palette.text }]}>Day, night, or auto</Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>
        Auto follows your device theme. Day uses the main UI color scheme. Night uses the
        facility blue palette.
      </Text>

      <View style={styles.segmentRow}>
        {OPTIONS.map((option) => {
          const selected = mode === option.key;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              accessibilityLabel={`Set appearance to ${option.label}`}
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

      <Text style={[styles.footer, { color: palette.textMuted }]}>
        Current: {mode.toUpperCase()} · Resolved: {resolvedMode.toUpperCase()}
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
  segment: {
    borderRadius: radius.card,
    borderWidth: 1,
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
