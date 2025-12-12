import React, { useState, useEffect } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { createCustomTask } from "../api/tasks";
import { getPlants } from "../api/plants";

export default function CreateTaskScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await getPlants();
    setPlants(res.data || []);
  }

  async function save() {
    await createCustomTask({ plantId, title, description: desc, dueDate: date });
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>New Task</Text>

      <TextInput placeholder="Task title" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="Description" value={desc} onChangeText={setDesc} style={styles.input} />
      <TextInput placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} style={styles.input} />

      <Text style={styles.sub}>Assign to plant:</Text>
      {plants.map((p) => (
        <TouchableOpacity key={p._id} onPress={() => setPlantId(p._id)} style={[styles.plant, plantId === p._id && { backgroundColor: "#d1f7d6" }]}>
          <Text>{p.name}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Create Task</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700", marginBottom: 12 },
  input: { backgroundColor: "#eee", padding: 10, borderRadius: 8, marginBottom: 12 },
  sub: { marginTop: 10, marginBottom: 6, fontWeight: "700" },
  plant: { padding: 10, backgroundColor: "white", borderRadius: 8, marginBottom: 6 },
  saveBtn: { backgroundColor: "#2ecc71", padding: 12, borderRadius: 10, marginTop: 20 },
  saveText: { color: "white", fontWeight: "700", textAlign: "center" },
});
