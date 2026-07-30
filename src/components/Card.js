import React from "react";
import { View, StyleSheet } from "react-native";
import { radius, spacing } from "../theme/theme";
import { useAppTheme } from "@/theme/appTheme";

export default function Card({ children, style, ...rest }) {
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border
        },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing(4),
    // boxShadow is not supported in React Native, use elevation or shadow* props for native shadow
    elevation: 2
  }
});
