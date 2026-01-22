import React from "react";
import { View, Text, FlatList, StyleSheet, Button } from "react-native";

const tasks = [
  { id: "1", title: "Update Storefront", completed: false },
  { id: "2", title: "Review Campaigns", completed: true },
  { id: "3", title: "Reply to Support", completed: false }
];

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tasks</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskRow}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskStatus}>{item.completed ? "Done" : "Pending"}</Text>
            <Button title="Edit" onPress={() => {}} />
          </View>
        )}
        ListEmptyComponent={<Text>No tasks available.</Text>}
      />
      <View style={styles.actions}>
        <Button title="Add Task" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  taskTitle: { fontSize: 18 },
  taskStatus: { fontSize: 16, color: "#888" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24
  }
});
