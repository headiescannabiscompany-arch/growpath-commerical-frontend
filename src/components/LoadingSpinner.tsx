import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAppTheme } from "@/theme/appTheme";

export default function LoadingSpinner() {
  const { palette } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.page }]}>
      <ActivityIndicator size="large" color={palette.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});
