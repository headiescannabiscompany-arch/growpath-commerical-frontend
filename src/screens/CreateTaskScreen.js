import React, { useState, useEffect } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, View, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import { createCustomTask } from "../api/tasks.js";
import { listGrows } from "../api/grows.js";
import { useAuth } from "@/auth/AuthContext";
import { useNavigation } from "@react-navigation/native";
import GrowPlantSelector from "../components/GrowPlantSelector.js";

export default function CreateTaskScreen({ route }) {
  const [grows, setGrows] = useState([]);
  const [selectedGrowId, setSelectedGrowId] = useState(null);
  const [selectedPlantIds, setSelectedPlantIds] = useState([]);
  const [growsLoading, setGrowsLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(route?.params?.dueDate || "");
  const { isPro } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setGrowsLoading(true);
      const res = await listGrows();
      const list = Array.isArray(res) ? res : [];
      setGrows(list);
    } catch (err) {
      console.log(err);
    } finally {
      setGrowsLoading(false);
    }
  }

  async function save() {
    let finalDate = date;
    // If date is YYYY-MM-DD, convert to local midnight ISO to avoid UTC shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split("-").map(Number);
      finalDate = new Date(y, m - 1, d).toISOString();
    }

    const payload = {
      title,
      description: desc,
      dueDate: finalDate
    };

    if (selectedGrowId) {
      payload.growId = selectedGrowId;
    }
    if (selectedPlantIds.length > 0) {
      payload.plants = selectedPlantIds;
    }

    await createCustomTask(payload);
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

      <GrowPlantSelector
        grows={grows}
        loading={growsLoading}
        selectedGrowId={selectedGrowId}
        onSelectGrow={setSelectedGrowId}
        selectedPlantIds={selectedPlantIds}
        onSelectPlants={setSelectedPlantIds}
        label="Assign to a Grow (optional)"
      />

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
