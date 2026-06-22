import React, { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  createTaskFromToolRun,
  runCalculator,
  saveToolRunToLog,
  type ToolRun
} from "@/api/toolRuns";
import {
  cloneNutrientRecipe,
  createNutrientRecipe,
  listNutrientRecipes,
  recordNutrientRecipeUse,
  reviseNutrientRecipe,
  type NutrientRecipe
} from "@/api/nutrientRecipes";

type ProductRow = {
  id: string;
  name: string;
  amount: string;
  unit: "g" | "ml" | "oz" | "tsp" | "tbsp";
  chemistryKey: string;
  sourceType: "user_entered" | "manufacturer" | "extension_reference" | "lab_tested";
  densityGml: string;
  N: string;
  P: string;
  K: string;
  Ca: string;
  Mg: string;
  S: string;
  Fe: string;
  Mn: string;
  Zn: string;
  Cu: string;
  B: string;
  Mo: string;
  Si: string;
};

const chemistryOptions = [
  ["unknown", "Unknown / user-defined"],
  ["water_soluble_nitrate", "Water-soluble nitrate"],
  ["water_soluble_ammonium", "Water-soluble ammonium"],
  ["urea", "Urea nitrogen"],
  ["soluble_phosphate", "Water-soluble phosphate"],
  ["sulfate_salt", "Sulfate salt"],
  ["gypsum", "Gypsum / calcium sulfate"],
  ["carbonate_lime", "Calcitic lime / carbonate"],
  ["dolomitic_lime", "Dolomitic lime"],
  ["organic_protein_meal", "Protein meal / slow organic N"],
  ["organic_meal", "Mixed organic meal"],
  ["bone_meal", "Bone meal / calcium phosphate"],
  ["rock_mineral", "Rock mineral / weathering"],
  ["chelated_micronutrient", "Chelated micronutrient"]
] as const;

function newRow(index: number): ProductRow {
  return {
    id: `${Date.now()}-${index}`,
    name: "",
    amount: "0",
    unit: "g",
    chemistryKey: "unknown",
    sourceType: "user_entered",
    densityGml: "1",
    N: "0",
    P: "0",
    K: "0",
    Ca: "0",
    Mg: "0",
    S: "0",
    Fe: "0",
    Mn: "0",
    Zn: "0",
    Cu: "0",
    B: "0",
    Mo: "0",
    Si: "0"
  };
}

export default function NpkToolScreen() {
  const { growId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_NPK);
  const growContext =
    typeof growId === "string" ? growId : Array.isArray(growId) ? growId[0] : "";
  const [batchVolume, setBatchVolume] = useState("5");
  const [batchUnit, setBatchUnit] = useState<"gal" | "L">("gal");
  const [stage, setStage] = useState("veg");
  const [medium, setMedium] = useState("soil");
  const [recipeName, setRecipeName] = useState("");
  const [savedRecipes, setSavedRecipes] = useState<NutrientRecipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [daysUntilHarvest, setDaysUntilHarvest] = useState("");
  const [soilTempC, setSoilTempC] = useState("22");
  const [moisture, setMoisture] = useState("even");
  const [livingSoil, setLivingSoil] = useState(false);
  const [isConcentrate, setIsConcentrate] = useState(false);
  const [rows, setRows] = useState<ProductRow[]>([newRow(0), newRow(1), newRow(2)]);
  const [result, setResult] = useState<any>(null);
  const [toolRun, setToolRun] = useState<ToolRun | null>(null);
  const [feedback, setFeedback] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    listNutrientRecipes(growContext || undefined)
      .then(setSavedRecipes)
      .catch(() => setSavedRecipes([]));
  }, [growContext]);

  function recipePayload() {
    return {
      name: recipeName.trim(),
      growId: growContext || undefined,
      batchVolume: Number(batchVolume),
      batchUnit,
      stage,
      medium,
      daysUntilHarvest: daysUntilHarvest ? Number(daysUntilHarvest) : undefined,
      isConcentrate,
      releaseEnvironment: { soilTempC: Number(soilTempC), moisture, livingSoil },
      products: rows
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
          S: Number(row.S),
          Fe: Number(row.Fe),
          Mn: Number(row.Mn),
          Zn: Number(row.Zn),
          Cu: Number(row.Cu),
          B: Number(row.B),
          Mo: Number(row.Mo),
          Si: Number(row.Si)
        }))
    };
  }

  function loadRecipe(recipe: NutrientRecipe) {
    setSelectedRecipeId(recipe._id);
    setRecipeName(recipe.name);
    setBatchVolume(String(recipe.batchVolume));
    setBatchUnit(recipe.batchUnit);
    setStage(recipe.stage || "veg");
    setMedium(recipe.medium || "soil");
    setSoilTempC(String(recipe.releaseEnvironment?.soilTempC ?? 22));
    setMoisture(String(recipe.releaseEnvironment?.moisture ?? "even"));
    setLivingSoil(Boolean(recipe.releaseEnvironment?.livingSoil));
    setRows(
      (recipe.products || []).map((product, index) => ({
        ...newRow(index),
        ...Object.fromEntries(
          Object.entries(product).map(([key, value]) => [
            key,
            typeof value === "number" ? String(value) : value
          ])
        ),
        id: `${Date.now()}-${index}`
      })) as ProductRow[]
    );
  }

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
          S: Number(row.S),
          Fe: Number(row.Fe),
          Mn: Number(row.Mn),
          Zn: Number(row.Zn),
          Cu: Number(row.Cu),
          B: Number(row.B),
          Mo: Number(row.Mo),
          Si: Number(row.Si)
        }));
      const response = await runCalculator<any>("npk-recipe", {
        growId: growContext || undefined,
        batchVolume: Number(batchVolume),
        batchUnit,
        stage,
        daysUntilHarvest: daysUntilHarvest ? Number(daysUntilHarvest) : undefined,
        isConcentrate,
        releaseEnvironment: {
          soilTempC: Number(soilTempC),
          moisture,
          livingSoil
        },
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

  if (!enabled) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <BackButton />
        <Text style={styles.title}>Nutrient Recipe Mixer</Text>
        <View style={styles.lockedCard}>
          <Text style={styles.productTitle}>Tool unavailable</Text>
          <Text style={styles.fieldHint}>This account does not have `TOOL_NPK`.</Text>
        </View>
      </ScrollView>
    );
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

      <Text style={styles.label}>Recipe name</Text>
      <TextInput
        style={styles.fullInput}
        value={recipeName}
        onChangeText={setRecipeName}
        placeholder="e.g. Veg base"
      />

      {savedRecipes.length ? (
        <View style={styles.savedSection}>
          <Text style={styles.label}>Saved recipes</Text>
          {savedRecipes.map((recipe) => (
            <Pressable
              key={recipe._id}
              style={[
                styles.savedRecipe,
                selectedRecipeId === recipe._id && styles.savedRecipeOn
              ]}
              onPress={() => loadRecipe(recipe)}
            >
              <Text style={styles.productTitle}>
                {recipe.name} v{recipe.version}
              </Text>
              <Text style={styles.fieldHint}>
                {recipe.stage} | {recipe.medium} | used {recipe.useCount || 0} times
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.label}>Recipe context</Text>
      <View style={styles.row}>
        <View style={styles.selectWrap}>
          <Picker selectedValue={stage} onValueChange={setStage} style={styles.picker}>
            {[
              "seedling",
              "veg",
              "preflower",
              "flower",
              "late_flower",
              "soil_building"
            ].map((value) => (
              <Picker.Item key={value} label={value.replace("_", " ")} value={value} />
            ))}
          </Picker>
        </View>
        <View style={styles.selectWrap}>
          <Picker selectedValue={medium} onValueChange={setMedium} style={styles.picker}>
            {["soil", "living_soil", "coco", "peat", "hydro"].map((value) => (
              <Picker.Item key={value} label={value.replace("_", " ")} value={value} />
            ))}
          </Picker>
        </View>
        <TextInput
          style={styles.input}
          value={daysUntilHarvest}
          onChangeText={setDaysUntilHarvest}
          keyboardType="numeric"
          placeholder="Days until harvest"
        />
        <TextInput
          style={styles.input}
          value={soilTempC}
          onChangeText={setSoilTempC}
          keyboardType="numeric"
          placeholder="Soil temp C"
        />
      </View>
      <View style={styles.row}>
        {["dry", "even", "waterlogged"].map((value) => (
          <Pressable
            key={value}
            style={[styles.pill, moisture === value && styles.pillOn]}
            onPress={() => setMoisture(value)}
          >
            <Text style={[styles.pillText, moisture === value && styles.pillTextOn]}>
              {value}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.pill, livingSoil && styles.pillOn]}
          onPress={() => setLivingSoil((value) => !value)}
        >
          <Text style={[styles.pillText, livingSoil && styles.pillTextOn]}>
            Living soil
          </Text>
        </Pressable>
        <Pressable
          style={[styles.pill, isConcentrate && styles.pillOn]}
          onPress={() => setIsConcentrate((value) => !value)}
        >
          <Text style={[styles.pillText, isConcentrate && styles.pillTextOn]}>
            Concentrated stock
          </Text>
        </Pressable>
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
          <Text style={styles.fieldHint}>Chemical form and evidence</Text>
          <View style={styles.selectWrapFull}>
            <Picker
              selectedValue={row.chemistryKey}
              onValueChange={(value) => updateRow(row.id, "chemistryKey", value)}
              style={styles.picker}
            >
              {chemistryOptions.map(([value, label]) => (
                <Picker.Item key={value} label={label} value={value} />
              ))}
            </Picker>
          </View>
          <View style={styles.selectWrapFull}>
            <Picker
              selectedValue={row.sourceType}
              onValueChange={(value) => updateRow(row.id, "sourceType", value)}
              style={styles.picker}
            >
              <Picker.Item label="User entered" value="user_entered" />
              <Picker.Item label="Manufacturer label" value="manufacturer" />
              <Picker.Item label="Extension reference" value="extension_reference" />
              <Picker.Item label="Lab tested" value="lab_tested" />
            </Picker>
          </View>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={row.amount}
              onChangeText={(value) => updateRow(row.id, "amount", value)}
              keyboardType="numeric"
              placeholder="Amount"
            />
            {(["g", "ml", "oz", "tsp", "tbsp"] as const).map((unit) => (
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
            {["ml", "tsp", "tbsp"].includes(row.unit) ? (
              <TextInput
                style={styles.input}
                value={row.densityGml}
                onChangeText={(value) => updateRow(row.id, "densityGml", value)}
                keyboardType="numeric"
                placeholder="g/ml"
              />
            ) : null}
          </View>
          <Text style={styles.fieldHint}>Micronutrient percentages</Text>
          <View style={styles.analysisGrid}>
            {(["Fe", "Mn", "Zn", "Cu", "B", "Mo", "Si"] as const).map((key) => (
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

      {result && recipeName.trim() ? (
        <View style={styles.row}>
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              try {
                const saved = selectedRecipeId
                  ? await reviseNutrientRecipe(selectedRecipeId, recipePayload())
                  : await createNutrientRecipe(recipePayload());
                setSelectedRecipeId(saved._id);
                setSavedRecipes(await listNutrientRecipes(growContext || undefined));
                setFeedback(`Saved ${saved.name} v${saved.version}.`);
              } catch (error: any) {
                setFeedback(error?.message || "Unable to save recipe.");
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {selectedRecipeId ? "Save New Revision" : "Save Recipe"}
            </Text>
          </Pressable>
          {selectedRecipeId ? (
            <>
              <Pressable
                style={styles.secondaryButton}
                onPress={async () => {
                  const clone = await cloneNutrientRecipe(
                    selectedRecipeId,
                    `${recipeName} copy`
                  );
                  setSavedRecipes(await listNutrientRecipes(growContext || undefined));
                  loadRecipe(clone);
                  setFeedback("Recipe cloned.");
                }}
              >
                <Text style={styles.secondaryButtonText}>Clone Recipe</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={async () => {
                  await recordNutrientRecipeUse(selectedRecipeId, {
                    growId: growContext || undefined,
                    batchVolume: Number(batchVolume),
                    batchUnit,
                    saveLog: true
                  });
                  setSavedRecipes(await listNutrientRecipes(growContext || undefined));
                  setFeedback("Recipe use saved to grow history.");
                }}
              >
                <Text style={styles.primaryButtonText}>Record Feeding</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {result ? (
        <ToolResultSurface
          title="NPK recipe result"
          status="CALCULATED"
          summary={result.formula}
          metrics={Object.entries(result.totals || {}).map(([key, value]) => ({
            key,
            label: key.replace("ppm", ""),
            value: String(value),
            detail: "ppm elemental"
          }))}
          notices={(result.warnings || []).map((warning: string, index: number) => ({
            key: `warning-${index}`,
            severity: "medium" as const,
            message: warning
          }))}
          recommendations={result.recommendations || []}
          assumptions={[result.releaseDisclaimer].filter(Boolean)}
          details={
            <>
              <Text style={styles.resultTitle}>Release timing</Text>
              {Object.entries(result.releaseTimeline || {}).map(
                ([window, entries]: [string, any]) =>
                  entries.length ? (
                    <View key={window} style={styles.timelineRow}>
                      <Text style={styles.timelineLabel}>
                        {window.replaceAll("_", "-")}
                      </Text>
                      <Text style={styles.recommendation}>
                        {entries
                          .map(
                            (entry: any) =>
                              `${entry.name}: ${entry.form} (${entry.confidence})`
                          )
                          .join("; ")}
                      </Text>
                    </View>
                  ) : null
              )}
            </>
          }
          actions={
            toolRun?._id && growContext
              ? [
                  {
                    key: "save-log",
                    label: "Save to Grow Log",
                    onPress: async () => {
                      await saveToolRunToLog(toolRun._id!);
                      setFeedback("Saved to grow journal.");
                    }
                  },
                  {
                    key: "create-task",
                    label: "Create Task",
                    variant: "secondary",
                    onPress: async () => {
                      await createTaskFromToolRun(toolRun._id!);
                      setFeedback("Follow-up task created.");
                    }
                  }
                ]
              : []
          }
          feedback={feedback}
          contextMessage={
            !growContext ? "Select a grow to enable journal and task actions." : undefined
          }
        />
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
  selectWrap: {
    minWidth: 180,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    overflow: "hidden"
  },
  selectWrapFull: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    overflow: "hidden"
  },
  picker: { height: 44, backgroundColor: "#FFFFFF" },
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
  recommendation: { color: "#334155", lineHeight: 19 },
  savedSection: { gap: 8 },
  savedRecipe: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 10 },
  savedRecipeOn: { borderColor: "#166534", backgroundColor: "#F0FDF4" },
  timelineRow: { borderTopWidth: 1, borderColor: "#E2E8F0", paddingTop: 8, gap: 4 },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  timelineLabel: { fontWeight: "700", color: "#166534" }
});
