import React from "react";
import { View, StyleSheet } from "react-native";
import FacilityGuard from "../guards/FacilityGuard";

export default function FacilityShell({ children }) {
  return (
    <FacilityGuard>
      <View style={styles.container}>{children}</View>
    </FacilityGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }
});
