import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { radius, spacing } from "../theme/theme";
import { useAppTheme } from "@/theme/appTheme";

export default function PrimaryButton({
  title,
  onPress,
  style,
  textStyle = {},
  disabled,
  children,
  accessibilityRole = "button",
  ...rest
}) {
  const { palette } = useAppTheme();
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: palette.accent },
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      {...rest}
    >
      {children || <Text style={[styles.label, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
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
