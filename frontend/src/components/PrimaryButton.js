import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

export default function PrimaryButton({ title, onPress, style, textStyle }) {
  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={onPress}>
      <Text style={[styles.label, textStyle]}>{title}</Text>
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
  label: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16
  }
});
