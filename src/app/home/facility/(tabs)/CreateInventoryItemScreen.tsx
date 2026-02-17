import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function CreateInventoryItemScreen() {
  return (
    <ScreenBoundary title="Create Inventory Item">
      <View style={styles.container}>
        <Text style={styles.h1}>Create Inventory Item</Text>
        <Text style={styles.muted}>
          Placeholder screen (lint-safe). Wire to your inventory create route when ready.
        </Text>
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  h1: { fontSize: 20, fontWeight: "900" },
  muted: { opacity: 0.7 }
});
