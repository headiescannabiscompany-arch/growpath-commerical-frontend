import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import {
  createTaskFromToolRun,
  runCalculator,
  saveToolRunToLog,
  type ToolRun
} from "@/api/toolRuns";

type ProductRow = {
  id: string;
  name: string;
  amount: string;
  unit: "g" | "ml";
  densityGml: string;
  N: string;
  P: string;
  K: string;
  Ca: string;
  Mg: string;
  S: string;
};

function newRow(index: number): ProductRow {
  return {
    id: `${Date.now()}-${index}`,
    name: "",
    amount: "0",
    unit: "g",
    densityGml: "1",
    N: "0",
    P: "0",
    K: "0",
    Ca: "0",
    Mg: "0",
    S: "0"
  };
}

export default function NpkToolScreen() {
  const { growId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growContext =
    typeof growId === "string" ? growId : Array.isArray(growId) ? growId[0] : "";
  const [batchVolume, setBatchVolume] = useState("5");
  const [batchUnit, setBatchUnit] = useState<"gal" | "L">("gal");
  const [rows, setRows] = useState<ProductRow[]>([newRow(0), newRow(1), newRow(2)]);
  const [result, setResult] = useState<any>(null);
  const [toolRun, setToolRun] = useState<ToolRun | null>(null);
  const [feedback, setFeedback] = useState("");
  const [running, setRunning] = useState(false);

  function updateRow(id: string, key: keyof ProductRow, value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

  async function calculate() {
    if (running) return;
    setRunning(true);
    setFeedback("");
    try {
      const products = rows
        .filter((row) => row.name.trim() || Number(row.amount) > 0)
        .map(({ id: _id, ...row }) => ({
          ...row,
          amount: Number(row.amount),
          densityGml: Number(row.densityGml),
          N: Number(row.N),
          P: Number(row.P),
          K: Number(row.K),
          Ca: Number(row.Ca),
          Mg: Number(row.Mg),
          S: Number(row.S)
        }));
      const response = await runCalculator<any>("npk-recipe", {
        growId: growContext || undefined,
        batchVolume: Number(batchVolume),
        batchUnit,
        products
      });
      setResult(response.outputs);
      setToolRun(response.toolRun);
      setFeedback("Recipe calculated and saved.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to calculate recipe.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton />
      <Text style={styles.title}>Nutrient Recipe Mixer</Text>
      <Text style={styles.subtitle}>
        Build up to 20 product rows. Fertilizer label P and K are converted from P2O5 and
        K2O to elemental ppm.
      </Text>
      {growContext ? (
        <Text style={styles.context}>Grow context: {growContext}</Text>
      ) : null}

      <Text style={styles.label}>Batch volume</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.volumeInput}
          value={batchVolume}
          onChangeText={setBatchVolume}
          keyboardType="numeric"
        />
        {(["gal", "L"] as const).map((unit) => (
          <Pressable
            key={unit}
            style={[styles.pill, batchUnit === unit && styles.pillOn]}
            onPress={() => setBatchUnit(unit)}
          >
            <Text style={[styles.pillText, batchUnit === unit && styles.pillTextOn]}>
              {unit}
            </Text>
          </Pressable>
        ))}
      </View>

      {rows.map((row, index) => (
        <View key={row.id} style={styles.product}>
          <View style={styles.productHeader}>
            <Text style={styles.productTitle}>Product {index + 1}</Text>
            {rows.length > 1 ? (
              <Pressable
                onPress={() =>
                  setRows((current) => current.filter((item) => item.id !== row.id))
                }
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <TextInput
            style={styles.fullInput}
            value={row.name}
            onChangeText={(value) => updateRow(row.id, "name", value)}
            placeholder="Product name"
          />
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={row.amount}
              onChangeText={(value) => updateRow(row.id, "amount", value)}
              keyboardType="numeric"
              placeholder="Amount"
            />
            {(["g", "ml"] as const).map((unit) => (
              <Pressable
                key={unit}
                style={[styles.pill, row.unit === unit && styles.pillOn]}
                onPress={() => updateRow(row.id, "unit", unit)}
              >
                <Text style={[styles.pillText, row.unit === unit && styles.pillTextOn]}>
                  {unit}
                </Text>
              </Pressable>
            ))}
            {row.unit === "ml" ? (
              <TextInput
                style={styles.input}
                value={row.densityGml}
                onChangeText={(value) => updateRow(row.id, "densityGml", value)}
                keyboardType="numeric"
                placeholder="g/ml"
              />
            ) : null}
          </View>
          <Text style={styles.fieldHint}>Guaranteed analysis percentages</Text>
          <View style={styles.analysisGrid}>
            {(["N", "P", "K", "Ca", "Mg", "S"] as const).map((key) => (
              <View key={key} style={styles.analysisField}>
                <Text style={styles.analysisLabel}>{key}%</Text>
                <TextInput
                  style={styles.analysisInput}
                  value={row[key]}
                  onChangeText={(value) => updateRow(row.id, key, value)}
                  keyboardType="numeric"
                />
              </View>
            ))}
          </View>
        </View>
      ))}

      {rows.length < 20 ? (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => setRows((current) => [...current, newRow(current.length)])}
        >
          <Text style={styles.secondaryButtonText}>Add product ({rows.length}/20)</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.primaryButton, running && styles.disabled]}
        disabled={running}
        onPress={calculate}
      >
        <Text style={styles.primaryButtonText}>
          {running ? "Calculating..." : "Calculate recipe"}
        </Text>
      </Pressable>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {result ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Elemental ppm</Text>
          <View style={styles.resultGrid}>
            {Object.entries(result.totals || {}).map(([key, value]) => (
              <View key={key} style={styles.resultMetric}>
                <Text style={styles.metricLabel}>{key.replace("ppm", "")}</Text>
                <Text style={styles.metricValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.fieldHint}>{result.formula}</Text>
          {result.warnings?.map((warning: string) => (
            <Text key={warning} style={styles.warning}>
              {warning}
            </Text>
          ))}
          {result.recommendations?.map((item: string) => (
            <Text key={item} style={styles.recommendation}>
              {item}
            </Text>
          ))}
        </View>
      ) : null}

      {toolRun?._id && growContext ? (
        <View style={styles.row}>
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              await saveToolRunToLog(toolRun._id!);
              setFeedback("Saved to grow journal.");
            }}
          >
            <Text style={styles.primaryButtonText}>Save to Grow Log</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              await createTaskFromToolRun(toolRun._id!);
              setFeedback("Follow-up task created.");
            }}
          >
            <Text style={styles.secondaryButtonText}>Create Task</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, gap: 12, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B", lineHeight: 19 },
  context: { color: "#166534", fontWeight: "700" },
  label: { fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  volumeInput: {
    minWidth: 130,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10
  },
  product: { borderTopWidth: 1, borderColor: "#E2E8F0", paddingTop: 14, gap: 10 },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  productTitle: { fontSize: 16, fontWeight: "700" },
  remove: { color: "#B91C1C", fontWeight: "600" },
  fullInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 10 },
  input: {
    minWidth: 90,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10
  },
  pill: {
    minWidth: 44,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 10
  },
  pillOn: { backgroundColor: "#166534", borderColor: "#166534" },
  pillText: { fontWeight: "700" },
  pillTextOn: { color: "#FFFFFF" },
  fieldHint: { color: "#64748B", fontSize: 12, lineHeight: 17 },
  analysisGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  analysisField: { width: 82 },
  analysisLabel: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  analysisInput: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 9 },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignSelf: "flex-start"
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start"
  },
  secondaryButtonText: { color: "#166534", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  feedback: { color: "#475569", fontSize: 13 },
  resultCard: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    padding: 14,
    gap: 10,
    backgroundColor: "#F8FAFC"
  },
  resultTitle: { fontSize: 18, fontWeight: "800" },
  resultGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  resultMetric: { width: 72, borderRightWidth: 1, borderColor: "#CBD5E1" },
  metricLabel: { color: "#64748B", fontSize: 12 },
  metricValue: { fontSize: 18, fontWeight: "800" },
  warning: { color: "#B45309", fontWeight: "600" },
  recommendation: { color: "#334155", lineHeight: 19 }
});
