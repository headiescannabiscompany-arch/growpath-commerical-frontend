import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

export default function Card({ children, style, ...rest }) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
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
