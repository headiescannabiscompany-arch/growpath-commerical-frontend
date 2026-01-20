import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

// ContextBar for commercial/facility users
// Displays facility/commercial name, role, and quick actions
export default function ContextBar({ name, role, onAction, actions = [] }) {
  return (
    <View style={styles.bar}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.role}>{role}</Text>
      <View style={styles.actions}>
        {actions.map((action, idx) => (
          <TouchableOpacity key={idx} style={styles.actionBtn} onPress={action.onPress}>
            <Text style={styles.actionText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    backgroundColor: "#0ea5e9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 40
  },
  name: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginRight: 12
  },
  role: {
    color: "#e0f2fe",
    fontSize: 14,
    marginRight: 12
  },
  actions: {
    flexDirection: "row"
  },
  actionBtn: {
    backgroundColor: "#38bdf8",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 8
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  }
});
