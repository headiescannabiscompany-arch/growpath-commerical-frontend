import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/theme";

const DEFAULT_OPTIONS = ["Seedling", "Vegetative", "Flower", "Drying", "Curing"];

export default function StageSlider({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false
}) {
  const currentIndex = Math.max(
    0,
    options.findIndex((opt) => opt === value)
  );

  return (
    <View style={styles.container}>
      {disabled && <View style={styles.disabledOverlay} />}
      <View style={styles.trackRow}>
        {options.map((option, index) => {
          const isActive = index === currentIndex;
          return (
            <React.Fragment key={option}>
              <TouchableOpacity
                style={[styles.notchWrap, disabled && styles.notchWrapDisabled]}
                onPress={() => !disabled && onChange?.(option)}
                accessibilityRole="button"
                accessibilityLabel={`Set stage to ${option}`}
                disabled={disabled}
              >
                <View
                  style={[
                    styles.notch,
                    isActive && styles.notchActive,
                    disabled && styles.notchDisabled
                  ]}
                />
              </TouchableOpacity>
              {index < options.length - 1 ? <View style={styles.trackSegment} /> : null}
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.labelRow}>
        {options.map((option, index) => {
          const isActive = index === currentIndex;
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
                  isActive && styles.labelActive,
                  disabled && styles.labelDisabled
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
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: radius.card,
    zIndex: 1
    // pointerEvents is deprecated as a prop, use style.pointerEvents if needed
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing(2)
  },
  notchWrap: {
    width: spacing(4),
    height: spacing(4),
    borderRadius: spacing(2),
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center"
  },
  notch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border
  },
  notchDisabled: {
    backgroundColor: colors.border
  },
  notchActive: {
    backgroundColor: colors.accent
  },
  trackSegment: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border
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
    fontSize: 12,
    color: colors.textSoft
  },
  labelActive: {
    color: colors.text,
    fontWeight: "600"
  },
  labelDisabled: {
    color: colors.textSoft
  }
});
