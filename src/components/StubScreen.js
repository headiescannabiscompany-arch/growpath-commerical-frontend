import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function StubScreen({ title, subtitle, route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{title || "Stub Screen"}</Text>
      {subtitle ? <Text style={styles.p}>{subtitle}</Text> : null}

      <View style={styles.box}>
        <Text style={styles.mono}>route.name: {route?.name || "n/a"}</Text>
        <Text style={styles.mono}>
          route.params: {JSON.stringify(route?.params ?? {}, null, 2)}
        </Text>
      </View>

      <Text style={styles.note}>
        Replace this stub with your real implementation when ready.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: "700" },
  p: { fontSize: 14, opacity: 0.85 },
  box: { padding: 12, borderWidth: 1, borderRadius: 12, opacity: 0.85 },
  mono: { fontFamily: "monospace", fontSize: 12 },
  note: { fontSize: 12, opacity: 0.7 }
});
