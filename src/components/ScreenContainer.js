import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { colors } from "../theme/theme";

export default function ScreenContainer({ children, scroll = false }) {
  const Comp = scroll ? ScrollView : View;
  return (
    <Comp
      style={styles.container}
      contentContainerStyle={scroll && styles.scrollContent}
    >
      {children}
    </Comp>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 32
  },
  scrollContent: {
    paddingBottom: 40
  }
});
