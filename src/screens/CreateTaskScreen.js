import React, { useState, useEffect } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import { createCustomTask } from "../api/tasks.js";
import { getPlants } from "../api/plants.js";
import { useAuth } from "../context/AuthContext.js";
import { useNavigation } from "@react-navigation/native";

export default function CreateTaskScreen({ route }) {
  const [plants, setPlants] = useState([]);
  const [plantId, setPlantId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(route?.params?.dueDate || "");
  const { isPro } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await getPlants();
    const payload = res?.data ?? res ?? [];
    setPlants(Array.isArray(payload) ? payload : []);
  }

  async function save() {
    await createCustomTask({ plantId, title, description: desc, dueDate: date });
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>New Task</Text>

      <TextInput
        placeholder="Task title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="Description"
        value={desc}
        onChangeText={setDesc}
        style={styles.input}
      />
      <TextInput
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
        style={styles.input}
      />

      <Text style={styles.sub}>Assign to plant:</Text>
      {plants.map((p) => (
        <TouchableOpacity
          key={p._id}
          onPress={() => setPlantId(p._id)}
          style={[styles.plant, plantId === p._id && { backgroundColor: "#d1f7d6" }]}
        >
          <Text>{p.name}</Text>
        </TouchableOpacity>
      ))}

      {!isPro && (
        <View
          style={{
            marginTop: 10,
            backgroundColor: "#FEF3C7",
            borderRadius: 8,
            padding: 10
          }}
        >
          <Text style={{ color: "#92400E", textAlign: "center", fontSize: 14 }}>
            Task creation is a Pro feature. Upgrade to Pro to add and schedule custom
            tasks for your grow.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 8,
              backgroundColor: "#10B981",
              padding: 8,
              borderRadius: 8
            }}
            onPress={() => navigation.navigate("Subscription")}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
              Upgrade to Pro
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[styles.saveBtn, !isPro && { backgroundColor: "#ccc" }]}
        onPress={isPro ? save : undefined}
        disabled={!isPro}
      >
        <Text style={[styles.saveText, !isPro && { color: "#888" }]}>Create Task</Text>
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
  saveText: { color: "white", fontWeight: "700", textAlign: "center" }
});
