import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from "react-native";
import AppShell from "../components/AppShell.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { saveToolUsage } from "../../toolUsageApi.js";

export default function GrowthTrackerScreen() {
  const { user } = useAuth();
  // Example entitlement logic: Only Pro users can add entries
  const isPro = user?.plan === "pro" || user?.role === "admin";
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);

  async function handleAddEntry() {
    if (!entry.trim() || !isPro) return;
    const newEntry = { text: entry, date: new Date().toLocaleDateString() };
    setEntries([newEntry, ...entries]);
    setEntry("");
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "GrowthTracker",
        input: { entry },
        output: { newEntry }
      });
    } catch (err) {
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <AppShell style={undefined} contentContainerStyle={undefined}>
      <Card style={styles.card}>
        <Text style={styles.title}>Growth Tracker</Text>
        <Text style={styles.label}>Add a Note or Observation</Text>
        <TextInput
          style={styles.input}
          value={entry}
          onChangeText={setEntry}
          placeholder="e.g. New leaves, flowered, repotted..."
        />
        <TouchableOpacity
          style={[styles.button, !isPro && { opacity: 0.5 }]}
          onPress={handleAddEntry}
          disabled={!isPro}
        >
          <Text style={styles.buttonText}>Add Entry</Text>
        </TouchableOpacity>
        {!isPro && (
          <Text style={{ color: "gray", fontSize: 12, marginTop: 8 }}>
            Upgrade to Pro to add entries
          </Text>
        )}
        <FlatList
          data={entries}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={styles.entryItem}>
              <Text style={styles.entryDate}>{item.date}</Text>
              <Text style={styles.entryText}>{item.text}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No entries yet.</Text>}
        />
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing(2),
    padding: spacing(3),
    alignItems: "stretch"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: spacing(2),
    color: colors.primary
  },
  label: {
    fontSize: 16,
    marginTop: spacing(2),
    color: colors.textSecondary
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing(1),
    fontSize: 16,
    marginTop: spacing(0.5)
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing(2),
    marginTop: spacing(3),
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  entryItem: {
    marginTop: spacing(2),
    padding: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderColor: colors.border,
    borderWidth: 1
  },
  entryDate: {
    fontSize: 12,
    color: colors.textSecondary
  },
  entryText: {
    fontSize: 16,
    color: colors.textPrimary
  },
  empty: {
    marginTop: spacing(2),
    color: colors.textSecondary,
    textAlign: "center"
  }
});
