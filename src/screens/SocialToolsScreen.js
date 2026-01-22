import React from "react";
import { View, Text, FlatList, StyleSheet, Button } from "react-native";

const tools = [
  { id: "1", name: "Social Composer", enabled: true },
  { id: "2", name: "Auto Scheduler", enabled: false }
];

export default function SocialToolsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Social Tools</Text>
      <FlatList
        data={tools}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.toolRow}>
            <Text style={styles.toolName}>{item.name}</Text>
            <Text style={styles.toolStatus}>{item.enabled ? "Enabled" : "Disabled"}</Text>
            <Button title="Configure" onPress={() => {}} />
          </View>
        )}
        ListEmptyComponent={<Text>No tools available.</Text>}
      />
      <View style={styles.actions}>
        <Button title="Add Tool" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  toolName: { fontSize: 18 },
  toolStatus: { fontSize: 16, color: "#888" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24
  }
});
