import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import {
  createEntry,
  getEntry,
  updateEntry,
  autoTagEntry
} from "../api/growlog";

export default function GrowLogEntryScreen({ route, navigation }) {
  const entryId = route.params?.id || null;

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);

  const [strain, setStrain] = useState("");
  const [stage, setStage] = useState("veg");

  const [week, setWeek] = useState("");
  const [day, setDay] = useState("");

  const [tags, setTags] = useState([]);

  const tagOptions = [
    "stretch",
    "overwatered",
    "underwatered",
    "yellowing",
    "calmag",
    "nuteburn",
    "heatstress",
    "lowhumidity",
    "highhumidity",
    "deficiency"
  ];

  useEffect(() => {
    if (entryId) {
      loadEntry();
    }
  }, []);

  async function loadEntry() {
    setLoading(true);
    const res = await getEntry(entryId);
    const e = res.data;

    setTitle(e.title);
    setNotes(e.notes);
    setPhotos(e.photos || []);
    setStrain(e.strain || "");
    setStage(e.stage || "veg");

    setWeek(e.week ? String(e.week) : "");
    setDay(e.day ? String(e.day) : "");

    setTags(e.tags || []);
    setLoading(false);
  }

  // 📌 Add Photo
  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(a => a.uri);
      setPhotos([...photos, ...newPhotos]);
    }
  }

  // 📌 Toggle tags
  function toggleTag(tag) {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  }

  // 📌 Save Entry
  async function handleSave() {
    if (!title.trim()) {
      return Alert.alert("Missing Title", "Please add a title for this entry.");
    }

    const payload = {
      title,
      notes,
      photos,
      strain,
      stage,
      week: week ? Number(week) : null,
      day: day ? Number(day) : null,
      tags
    };

    try {
      setLoading(true);

      if (entryId) {
        await updateEntry(entryId, payload);
      } else {
        await createEntry(payload);
      }

      setLoading(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message);
      setLoading(false);
    }
  }

  // 📌 AI auto-tagging
  async function handleAutoTag() {
    if (!entryId) {
      return Alert.alert(
        "Save first",
        "Please save this entry before using AI auto-tagging."
      );
    }

    try {
      setLoading(true);
      const updated = await autoTagEntry(entryId);

      setTags(updated.tags || []);
      // If you want to see it right away in this screen:
      if (updated.aiInsights) {
        Alert.alert("AI Insights", updated.aiInsights);
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        <Text style={styles.header}>
          {entryId ? "Edit Grow Log Entry" : "New Grow Log Entry"}
        </Text>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Day 21 - Heavy stretch today…"
        />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: "top" }]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Details about your plants..."
        />

        {/* Photos */}
        <Text style={styles.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={styles.photo}
            />
          ))}

          <TouchableOpacity onPress={addPhoto} style={styles.addPhotoBox}>
            <Text style={{ fontSize: 30, color: "#888" }}>+</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Strain */}
        <Text style={styles.label}>Strain</Text>
        <TextInput
          style={styles.input}
          value={strain}
          onChangeText={setStrain}
          placeholder="Blueberry Muffin, Odo Wan Kenobi…"
        />

        {/* Stage Picker */}
        <Text style={styles.label}>Stage</Text>
        <View style={styles.stageRow}>
          {["seedling", "veg", "flower"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.stageButton,
                stage === s && styles.stageButtonActive
              ]}
              onPress={() => setStage(s)}
            >
              <Text style={stage === s ? styles.stageTextActive : styles.stageText}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Week & Day */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Week</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={week}
              onChangeText={setWeek}
              placeholder="5"
            />
          </View>
          <View style={{ width: 20 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Day</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={day}
              onChangeText={setDay}
              placeholder="3"
            />
          </View>
        </View>

        {/* Tags */}
        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsContainer}>
          {tagOptions.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.tag,
                tags.includes(t) && styles.tagSelected
              ]}
              onPress={() => toggleTag(t)}
            >
              <Text style={tags.includes(t) ? styles.tagTextSelected : styles.tagText}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Auto-tag Button (edit mode only) */}
        {entryId && (
          <TouchableOpacity
            onPress={handleAutoTag}
            style={styles.aiButton}
            disabled={loading}
          >
            <Text style={styles.aiButtonText}>
              {loading ? "Analyzing..." : "🤖 Auto-tag with AI"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Entry"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = {
  header: { fontSize: 24, fontWeight: "700", marginBottom: 15 },
  label: { marginTop: 15, marginBottom: 5, fontWeight: "600" },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10
  },
  addPhotoBox: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#eaeaea",
    justifyContent: "center",
    alignItems: "center"
  },
  stageRow: { flexDirection: "row", marginTop: 5 },
  stageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eaeaea",
    marginRight: 10
  },
  stageButtonActive: { backgroundColor: "#2ecc71" },
  stageText: { color: "#555" },
  stageTextActive: { color: "#fff" },
  row: { flexDirection: "row", marginTop: 10 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  tag: {
    backgroundColor: "#ddd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  tagSelected: { backgroundColor: "#2ecc71" },
  tagText: { color: "#333" },
  tagTextSelected: { color: "#fff" },
  aiButton: {
    marginTop: 10,
    backgroundColor: "#3498db",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  aiButtonText: {
    color: "white",
    fontWeight: "600"
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600"
  }
};
