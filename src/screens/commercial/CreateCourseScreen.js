import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import { apiRequest } from "@/api/apiRequest";

function toPriceCents(input) {
  const n = Number(input);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function CreateCourseScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const priceCents = useMemo(() => toPriceCents(price.trim()), [price]);
  const canSubmit = title.trim().length >= 3 && !submitting;

  async function submitCourse() {
    if (!canSubmit) return;
    if (price.trim() && priceCents == null) {
      Alert.alert("Invalid price", "Price must be a number greater than or equal to 0.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("/api/courses", {
        method: "POST",
        body: {
          title: title.trim(),
          summary: summary.trim(),
          priceCents: priceCents ?? 0,
          isPublished: false,
          workspace: "commercial"
        }
      });

      Alert.alert("Course created", "Your course draft has been created.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Create failed", String(e?.message || e || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Create Course</Text>
        <Text style={styles.label}>Course title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a course title"
          style={styles.input}
        />
        <Text style={styles.label}>Summary</Text>
        <TextInput
          value={summary}
          onChangeText={setSummary}
          placeholder="What learners will get from this course"
          multiline
          style={[styles.input, styles.multiline]}
        />
        <Text style={styles.label}>Price (USD)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          style={styles.input}
        />

        <TouchableOpacity
          onPress={submitCourse}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{submitting ? "Creating..." : "Create Draft"}</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "800", marginBottom: 6 },
  label: { fontSize: 13, opacity: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  button: {
    marginTop: 8,
    backgroundColor: "#15803d",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#fff", fontWeight: "800" }
});
