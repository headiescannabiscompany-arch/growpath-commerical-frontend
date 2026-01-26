import React, { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
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

const EXAMPLES = [
  { keyword: "spots", result: "Possible fungal or bacterial leaf spot." },
  { keyword: "web", result: "Spider mites likely present." },
  { keyword: "yellow", result: "Could be overwatering, nutrient deficiency, or pests." },
  { keyword: "holes", result: "Check for caterpillars or beetles." }
];

export default function PestDiseaseIdentifierScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  async function handleIdentify() {
    if (!query.trim()) return;
    // Simple keyword match for demo
    const found = EXAMPLES.filter((e) => query.toLowerCase().includes(e.keyword));
    const output = found.length
      ? found
      : [{ result: "No match found. Try a different description." }];
    setResults(output);
    try {
      await saveToolUsage({
        userId: user?.id || user?._id || null,
        tool: "PestDiseaseIdentifier",
        input: { query },
        output
      });
    } catch (err) {
      console.error("Failed to save tool usage", err);
    }
  }

  return (
    <AppShell style={undefined} contentContainerStyle={undefined}>
      <Card style={styles.card}>
        <Text style={styles.title}>Pest & Disease Identifier</Text>
        <Text style={styles.label}>
          Describe the symptom or upload a photo (text only for now):
        </Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="e.g. yellow leaves, webbing, holes..."
        />
        <TouchableOpacity style={styles.button} onPress={handleIdentify}>
          <Text style={styles.buttonText}>Identify</Text>
        </TouchableOpacity>
        <FlatList
          data={results}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              <Text style={styles.resultText}>{item.result}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No results yet.</Text>}
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
  resultItem: {
    marginTop: spacing(2),
    padding: spacing(1),
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderColor: colors.border,
    borderWidth: 1
  },
  resultText: {
    fontSize: 16,
    color: colors.textPrimary
  },
  empty: {
    marginTop: spacing(2),
    color: colors.textSecondary,
    textAlign: "center"
  }
});
