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
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 2
  }
});
