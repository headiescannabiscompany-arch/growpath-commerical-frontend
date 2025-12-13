import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(4),
    boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.04)",
    elevation: 2
  }
});
