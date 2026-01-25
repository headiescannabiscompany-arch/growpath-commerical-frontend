import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";

export default function AutomationRow({
  policy,
  onToggle
}: {
  policy: any;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.name}>{policy.name}</Text>
      <Switch value={policy.enabled} onValueChange={onToggle} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8
  },
  name: {
    fontWeight: "600",
    fontSize: 16
  }
});
