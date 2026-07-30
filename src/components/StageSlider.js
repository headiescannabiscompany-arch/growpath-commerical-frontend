import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { radius, spacing } from "../theme/theme";
import { useAppTheme } from "@/theme/appTheme";

const DEFAULT_OPTIONS = ["Seedling", "Vegetative", "Flower", "Drying", "Curing"];

export default function StageSlider({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false
}) {
  const { palette } = useAppTheme();
  const currentIndex = Math.max(
    0,
    options.findIndex((opt) => opt === value)
  );

  return (
    <View style={styles.container}>
      {disabled ? (
        <View
          style={[
            styles.disabledOverlay,
            { backgroundColor: `${palette.surface}CC`, borderColor: palette.border }
          ]}
        />
      ) : null}
      <View style={styles.trackRow}>
        {options.map((option, index) => {
          const isActive = index === currentIndex;
          return (
            <React.Fragment key={option}>
              <TouchableOpacity
                style={[styles.notchWrap, { backgroundColor: palette.surfaceMuted }]}
                onPress={() => !disabled && onChange?.(option)}
                accessibilityRole="button"
                accessibilityLabel={`Set stage to ${option}`}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.notch,
                    { backgroundColor: palette.border },
                    isActive && { backgroundColor: palette.accent }
                  ]}
                />
              </TouchableOpacity>
              {index < options.length - 1 ? (
                <View
                  style={[styles.trackSegment, { backgroundColor: palette.border }]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {options.map((option, index) => {
          const isActiveLabel = index === currentIndex;
          return (
            <TouchableOpacity
              key={option}
              style={styles.labelWrap}
              onPress={() => !disabled && onChange?.(option)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.label,
                  { color: palette.textMuted },
                  isActiveLabel && { color: palette.text, fontWeight: "600" },
                  disabled && { color: palette.textMuted }
                ]}
                numberOfLines={1}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing(2)
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.card,
    zIndex: 1
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing(2)
  },
  notchWrap: {
    width: spacing(4),
    height: spacing(4),
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  notch: {
    width: 12,
    height: 12,
    borderRadius: radius.pill
  },
  trackSegment: {
    flex: 1,
    height: 2
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(2)
  },
  labelWrap: {
    flex: 1,
    alignItems: "center"
  },
  label: {
    fontSize: 12
  }
});
