import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { createCourse } from "@/api/courses";
import { useEntitlements } from "@/entitlements";
import { getLearningAccess } from "@/features/learning/learningAccess";
import { radius } from "@/theme/theme";

function priceToCents(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function CreateVendorGuide({ navigation, route }) {
  const entitlements = useEntitlements();
  const access = getLearningAccess(entitlements);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [vendorType, setVendorType] = useState(route?.params?.vendorType || "");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const priceCents = useMemo(() => priceToCents(price), [price]);
  const canCreate = access.canCreateCourses;
  const canSave = canCreate && title.trim().length >= 3 && !saving;

  async function saveGuide() {
    if (!canSave) return;
    if (priceCents == null) {
      Alert.alert("Invalid price", "Price must be a number greater than or equal to 0.");
      return;
    }
    if (priceCents > 0 && !access.canSellPaidCourses) {
      Alert.alert(
        "Paid guide unavailable",
        "Paid pricing should be available on every GrowPathAI plan. Refresh your account or contact support@growpathai.com."
      );
      return;
    }

    setSaving(true);
    try {
      const guide = await createCourse({
        title: title.trim(),
        summary: summary.trim(),
        description: summary.trim(),
        priceCents,
        isPublished: false,
        workspace: "commercial",
        contentType: "vendor-guide",
        vendorType: vendorType.trim() || undefined,
        tags: ["vendor-guide", vendorType.trim()].filter(Boolean)
      });

      Alert.alert("Guide created", "Your vendor guide draft has been saved.");
      if (navigation?.replace) {
        navigation.replace("CourseDetail", {
          course: guide,
          id: guide?._id || guide?.id
        });
      } else if (navigation?.goBack) {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Save failed", String(e?.message || e || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Vendor Guide</Text>
      {!canCreate ? (
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>Guide creation unavailable</Text>
          <Text style={styles.help}>This account does not have COURSES_CREATE.</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Guide title</Text>
      <TextInput
        placeholder="Guide title"
        value={title}
        onChangeText={setTitle}
        editable={canCreate && !saving}
        style={styles.input}
      />

      <Text style={styles.label}>Summary</Text>
      <TextInput
        placeholder="What growers will learn"
        value={summary}
        onChangeText={setSummary}
        editable={canCreate && !saving}
        multiline
        style={[styles.input, styles.multiline]}
      />

      <Text style={styles.label}>Vendor type</Text>
      <TextInput
        placeholder="soil, nutrients, genetics, equipment"
        value={vendorType}
        onChangeText={setVendorType}
        editable={canCreate && !saving}
        autoCapitalize="none"
        style={styles.input}
      />

      <Text style={styles.label}>Price (USD)</Text>
      {!access.canSellPaidCourses ? (
        <Text style={styles.help}>
          Paid pricing should be available on every plan. Contact support@growpathai.com
          if it remains unavailable.
        </Text>
      ) : null}
      <TextInput
        placeholder="0.00"
        value={price}
        onChangeText={setPrice}
        editable={canCreate && access.canSellPaidCourses && !saving}
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Save vendor guide"
        onPress={saveGuide}
        disabled={!canSave}
        style={[styles.button, !canSave && styles.disabled]}
      >
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save Guide"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 10, padding: 20 },
  title: { fontSize: 24, fontWeight: "900", marginBottom: 6 },
  label: { color: "#334155", fontSize: 13, fontWeight: "800" },
  input: {
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  button: {
    alignItems: "center",
    backgroundColor: "#15803d",
    borderRadius: radius.card,
    marginTop: 8,
    paddingVertical: 12
  },
  buttonText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  help: { color: "#64748b", fontSize: 12 },
  locked: {
    backgroundColor: "#f8fafc",
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 12
  },
  lockedTitle: { color: "#0f172a", fontWeight: "900" }
});
