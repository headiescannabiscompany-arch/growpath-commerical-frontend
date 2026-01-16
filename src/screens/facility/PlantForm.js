import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView } from "react-native";

const STAGES = ["Seedling", "Vegetative", "Flowering", "Harvest", "Cured"];

export default function PlantForm({ visible, onClose, onSave, initialData = {} }) {
  const [name, setName] = useState(initialData?.name || "");
  const [strain, setStrain] = useState(initialData?.strain || "");
  const [stage, setStage] = useState(initialData?.stage || STAGES[0]);
  const [growMedium, setGrowMedium] = useState(initialData?.growMedium || "Soil");
  const [notes, setNotes] = useState(initialData?.notes || "");

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name, strain, stage, growMedium, notes });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Plant Details</Text>
          <TouchableOpacity onPress={handleSave} disabled={!name.trim()}>
            <Text style={[styles.headerButton, !name.trim() && styles.disabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Plant Name"
        />
        <TextInput
          style={styles.input}
          value={strain}
          onChangeText={setStrain}
          placeholder="Strain"
        />
        <Text style={styles.label}>Stage</Text>
        {STAGES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.stageBtn, stage === s && styles.stageBtnActive]}
            onPress={() => setStage(s)}
          >
            <Text style={stage === s ? styles.stageTextActive : styles.stageText}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.input}
          value={growMedium}
          onChangeText={setGrowMedium}
          placeholder="Grow Medium"
        />
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes"
          multiline
        />

        <View style={{ height: 20 }} />
      </ScrollView>
    </Modal>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb"
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16
  },
  header: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937"
  },
  headerButton: {
    fontSize: 16,
    color: "#0ea5e9",
    fontWeight: "bold"
  },
  disabled: {
    color: "#d1d5db",
    opacity: 0.5
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    color: "#1f2937"
  },
  stageBtn: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    marginTop: 8,
    marginBottom: 4
  },
  stageBtnActive: {
    backgroundColor: "#0ea5e9"
  },
  stageText: {
    color: "#1f2937",
    fontWeight: "bold"
  },
  stageTextActive: {
    color: "#fff",
    fontWeight: "bold"
  }
};
