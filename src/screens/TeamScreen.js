import React from "react";
import { View, Text, FlatList, StyleSheet, Button } from "react-native";

const teamMembers = [
  { id: "1", name: "Alice Smith", role: "Manager" },
  { id: "2", name: "Bob Lee", role: "Sales" },
  { id: "3", name: "Carol Jones", role: "Support" }
];

export default function TeamScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Team</Text>
      <FlatList
        data={teamMembers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberRole}>{item.role}</Text>
            <Button title="Edit" onPress={() => {}} />
          </View>
        )}
        ListEmptyComponent={<Text>No team members available.</Text>}
      />
      <View style={styles.actions}>
        <Button title="Add Member" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  memberName: { fontSize: 18 },
  memberRole: { fontSize: 16, color: "#888" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24
  }
});
