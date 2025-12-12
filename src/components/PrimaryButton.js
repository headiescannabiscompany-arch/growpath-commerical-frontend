import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

export default function PrimaryButton({
  title,
  onPress,
  style,
  textStyle,
  disabled,
  children
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      {children || <Text style={[styles.label, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing(3),
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  disabled: {
    opacity: 0.6
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16
  }
});
