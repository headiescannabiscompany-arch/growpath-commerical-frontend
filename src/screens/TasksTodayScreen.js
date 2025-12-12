import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, FlatList, StyleSheet, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getTodayTasks, completeTask } from "../api/tasks";

export default function TasksTodayScreen() {
  const [tasks, setTasks] = useState([]);

  async function load() {
    const res = await getTodayTasks();
    setTasks(res.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function finish(id) {
    await completeTask(id);
    load();
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>Today's Tasks</Text>

      <FlatList
        data={tasks}
        keyExtractor={(t) => t._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            {item.plant && <Text style={styles.plant}>Plant: {item.plant.name} ({item.plant.strain})</Text>}
            <Text style={styles.desc}>{item.description}</Text>

            <TouchableOpacity style={styles.doneBtn} onPress={() => finish(item._id)}>
              <Text style={styles.doneText}>Complete</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "700" },
  plant: { fontSize: 12, color: "#555", marginVertical: 4 },
  desc: { marginBottom: 8 },
  doneBtn: { backgroundColor: "#2ecc71", padding: 8, borderRadius: 8, alignSelf: "flex-end" },
  doneText: { color: "white" },
});
