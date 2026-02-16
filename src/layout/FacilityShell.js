import React from "react";
import { View, StyleSheet } from "react-native";
import FacilityGuard from "../guards/FacilityGuard";

import { sanitizeViewChildren } from "../components/layout/sanitizeViewChildren";
export default function FacilityShell({ children }) {
  return (
    <FacilityGuard>
      <View style={styles.container}>
        {sanitizeViewChildren(children, "FacilityShell.container")}
      </View>
    </FacilityGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }
});
