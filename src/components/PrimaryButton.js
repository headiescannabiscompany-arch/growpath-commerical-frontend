import React, { useState } from "react";
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
  accessibilityLabel,
  accessibilityState,
  ...rest
}) {
  const { palette } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: palette.accent },
        disabled && styles.disabled,
        focused && {
          outlineColor: palette.link,
          outlineOffset: 2,
          outlineStyle: "solid",
          outlineWidth: 2
        },
        style
      ]}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{
        ...(accessibilityState || {}),
        disabled: Boolean(disabled)
      }}
      {...rest}
    >
      {children || <Text style={[styles.label, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    minWidth: 44,
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
