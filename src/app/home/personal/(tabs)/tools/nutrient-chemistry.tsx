import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import {
  analyzeCompatibility,
  buildReleaseTimeline,
  compareIngredientsBySpeed,
  getIngredientById,
  getIngredientEvidence,
  intentOptions,
  moistureOptions,
  nutrientOptions,
  recommendIngredients,
  stageOptions,
  microbialOptions,
  type MoistureState,
  type MicrobialActivity,
  type NutrientIntent,
  type NutrientKey,
  type NutrientStage,
  type NutrientEnvironment
} from "@/features/personal/tools/nutrientChemistry/engine";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function pillStyle(active: boolean) {
  return [styles.pill, active ? styles.pillOn : null];
}

export default function NutrientChemistryToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  const [nutrient, setNutrient] = useState<NutrientKey>("calcium");
  const [intent, setIntent] = useState<NutrientIntent>("fast_fix");
  const [stage, setStage] = useState<NutrientStage>("veg");
  const [moisture, setMoisture] = useState<MoistureState>("moderate");
  const [microbialActivity, setMicrobialActivity] =
    useState<MicrobialActivity>("moderate");
  const [soilTempC, setSoilTempC] = useState("22");
  const [pH, setPH] = useState("6.4");
  const [daysUntilNeed, setDaysUntilNeed] = useState("7");
  const [livingSoil, setLivingSoil] = useState(true);
  const [isConcentrate, setIsConcentrate] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const environment: NutrientEnvironment = useMemo(
    () => ({
      stage,
      soilTempC: toNumber(soilTempC),
      moisture,
      microbialActivity,
      pH: toNumber(pH),
      daysUntilNeed: toNumber(daysUntilNeed),
      livingSoil,
      isConcentrate
    }),
    [
      stage,
      soilTempC,
      moisture,
      microbialActivity,
      pH,
      daysUntilNeed,
      livingSoil,
      isConcentrate
    ]
  );

  const recommendations = useMemo(
    () => recommendIngredients(nutrient, intent, environment),
    [nutrient, intent, environment]
  );
  const activeRecommendation =
    recommendations.find((row) => row.ingredient.id === compareIds[0]) ||
    recommendations[0];
  const compareIngredients = useMemo(
    () =>
      compareIds.map((id) => getIngredientById(id)).filter(Boolean) as NonNullable<
        ReturnType<typeof getIngredientById>
      >[],
    [compareIds]
  );
  const timelineIngredients = useMemo(() => {
    if (compareIngredients.length) return compareIngredients;
    return activeRecommendation ? [activeRecommendation.ingredient] : [];
  }, [activeRecommendation, compareIngredients]);
  const applicationRates = useMemo(
    () =>
      Object.fromEntries(
        timelineIngredients
          .filter((ingredient) => ingredient.applicationGuide)
          .map((ingredient) => [
            ingredient.id,
            toPositiveNumber(
              rateInputs[ingredient.id] ??
                String(ingredient.applicationGuide?.typicalRateGPerL ?? "")
            )
          ])
      ),
    [timelineIngredients, rateInputs]
  );
  const compatibilityAnalysis = useMemo(
    () => analyzeCompatibility(timelineIngredients, environment, applicationRates),
    [timelineIngredients, environment, applicationRates]
  );
  const compatibilityWarnings = compatibilityAnalysis.warnings;
  const compareGroups = useMemo(
    () => compareIngredientsBySpeed(nutrient, intent, environment),
    [nutrient, intent, environment]
  );
  const releaseTimeline = useMemo(
    () => buildReleaseTimeline(timelineIngredients, environment),
    [timelineIngredients, environment]
  );
  const activeEvidence = activeRecommendation
    ? getIngredientEvidence(activeRecommendation.ingredient)
    : null;

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      return [...current, id].slice(0, 3);
    });
  }

  async function save() {
    if (!growId || saving || !activeRecommendation) return;
    setSaving(true);
    setSavedMessage("");
    const result = await saveToolRunAndOpenJournal({
      router,
      growId,
      toolKey: "nutrient-chemistry",
      input: {
        nutrient,
        intent,
        stage,
        moisture,
        microbialActivity,
        soilTempC: toNumber(soilTempC),
        pH: toNumber(pH),
        daysUntilNeed: toNumber(daysUntilNeed),
        livingSoil,
        isConcentrate,
        compareIds,
        applicationRatesGPerL: applicationRates
      },
      output: {
        activeIngredient: activeRecommendation.ingredient,
        rankedIngredients: recommendations.slice(0, 8).map((row) => ({
          id: row.ingredient.id,
          name: row.ingredient.name,
          score: row.score,
          fitLabel: row.fitLabel,
          releaseSummary: row.releaseSummary,
          reasons: row.reasons
        })),
        releaseTimeline,
        compatibilityWarnings,
        compatibilityAnalysis,
        compareGroups
      }
    });
    setSavedMessage(result.ok ? "Saved to grow journal." : result.error);
    setSaving(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackButton />
      <Text style={styles.title}>Nutrient Chemistry</Text>
      <Text style={styles.subtitle}>
        Classify source form, release speed, pH effect, and fast vs slow use case.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Nutrient</Text>
        <View style={styles.wrap}>
          {nutrientOptions.map((option) => (
            <Pressable
              key={option.key}
              style={pillStyle(nutrient === option.key)}
              onPress={() => {
                setNutrient(option.key);
                setCompareIds([]);
              }}
            >
              <Text
                style={[
                  styles.pillText,
                  nutrient === option.key ? styles.pillTextOn : null
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Use case</Text>
        <View style={styles.wrap}>
          {intentOptions.map((option) => (
            <Pressable
              key={option.key}
              style={pillStyle(intent === option.key)}
              onPress={() => {
                setIntent(option.key);
                setCompareIds([]);
              }}
            >
              <Text
                style={[
                  styles.pillText,
                  intent === option.key ? styles.pillTextOn : null
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Stage</Text>
        <View style={styles.wrap}>
          {stageOptions.map((option) => (
            <Pressable
              key={option.key}
              style={pillStyle(stage === option.key)}
              onPress={() => setStage(option.key)}
            >
              <Text
                style={[styles.pillText, stage === option.key ? styles.pillTextOn : null]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Environment</Text>
        <View style={styles.inlineRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Soil temp (C)</Text>
            <TextInput
              style={styles.input}
              value={soilTempC}
              onChangeText={setSoilTempC}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>pH</Text>
            <TextInput
              style={styles.input}
              value={pH}
              onChangeText={setPH}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Days until need</Text>
            <TextInput
              style={styles.input}
              value={daysUntilNeed}
              onChangeText={setDaysUntilNeed}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inlineRow}>
          <View style={styles.flex1}>
            <Text style={styles.label}>Moisture</Text>
            <View style={styles.wrap}>
              {moistureOptions.map((option) => (
                <Pressable
                  key={option.key}
                  style={pillStyle(moisture === option.key)}
                  onPress={() => setMoisture(option.key)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      moisture === option.key ? styles.pillTextOn : null
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.label}>Microbial activity</Text>
            <View style={styles.wrap}>
              {microbialOptions.map((option) => (
                <Pressable
                  key={option.key}
                  style={pillStyle(microbialActivity === option.key)}
                  onPress={() => setMicrobialActivity(option.key)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      microbialActivity === option.key ? styles.pillTextOn : null
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, livingSoil ? styles.toggleOn : null]}
            onPress={() => setLivingSoil((current) => !current)}
          >
            <Text style={[styles.toggleText, livingSoil ? styles.toggleTextOn : null]}>
              Living soil
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, isConcentrate ? styles.toggleOn : null]}
            onPress={() => setIsConcentrate((current) => !current)}
          >
            <Text style={[styles.toggleText, isConcentrate ? styles.toggleTextOn : null]}>
              Concentrate mix
            </Text>
          </Pressable>
        </View>
      </View>

      {activeRecommendation ? (
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Best current fit</Text>
          <Text style={styles.summaryName}>{activeRecommendation.ingredient.name}</Text>
          <Text style={styles.summaryMeta}>
            {activeRecommendation.fitLabel.toUpperCase()} |{" "}
            {activeRecommendation.releaseSummary}
          </Text>
          <Text style={styles.summaryText}>
            {activeRecommendation.ingredient.bestUseCases.join(" · ")}
          </Text>
          {compatibilityWarnings.map((warning) => (
            <Text key={warning} style={styles.warning}>
              {warning}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Recommended sources</Text>
        {recommendations.slice(0, 6).map((row) => {
          const selected = compareIds.includes(row.ingredient.id);
          return (
            <Pressable
              key={row.ingredient.id}
              style={[
                styles.recommendationCard,
                selected ? styles.recommendationCardOn : null
              ]}
              onPress={() => setCompareIds([row.ingredient.id])}
            >
              <View style={styles.recommendationHeader}>
                <View style={styles.flex1}>
                  <Text style={styles.recommendationTitle}>{row.ingredient.name}</Text>
                  <Text style={styles.recommendationMeta}>
                    {row.fitLabel.toUpperCase()} · {row.releaseSummary}
                  </Text>
                </View>
                <Pressable
                  style={[styles.compareButton, selected ? styles.compareButtonOn : null]}
                  onPress={() => toggleCompare(row.ingredient.id)}
                >
                  <Text
                    style={[
                      styles.compareButtonText,
                      selected ? styles.compareButtonTextOn : null
                    ]}
                  >
                    {selected ? "Compared" : "+ Compare"}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.recommendationBody}>
                {row.reasons.slice(0, 3).join(" · ")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Release windows</Text>
        <Text style={styles.helperText}>
          Fast / medium / slow groupings help separate quick correction from soil-building
          inputs.
        </Text>
        <View style={styles.releaseGroup}>
          <Text style={styles.releaseLabel}>Fast</Text>
          <Text style={styles.releaseItems}>
            {compareGroups.fast.map((row) => row.ingredient.name).join(" · ") || "None"}
          </Text>
        </View>
        <View style={styles.releaseGroup}>
          <Text style={styles.releaseLabel}>Medium</Text>
          <Text style={styles.releaseItems}>
            {compareGroups.medium.map((row) => row.ingredient.name).join(" · ") || "None"}
          </Text>
        </View>
        <View style={styles.releaseGroup}>
          <Text style={styles.releaseLabel}>Slow</Text>
          <Text style={styles.releaseItems}>
            {compareGroups.slow.map((row) => row.ingredient.name).join(" · ") || "None"}
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Time-release timeline</Text>
        <Text style={styles.helperText}>
          Adjusted for the selected temperature, moisture, biology, and pH. A form appears
          in each band its estimated range overlaps.
        </Text>
        {releaseTimeline.map((window) => (
          <View key={window.key} style={styles.releaseGroup}>
            <Text style={styles.releaseLabel}>{window.label}</Text>
            <Text style={styles.releaseItems}>
              {window.entries
                .map((entry) => `${entry.ingredientName}: ${entry.chemicalForm}`)
                .join(" · ") || "No expected release"}
            </Text>
          </View>
        ))}
      </View>

      {compareIngredients.length > 0 ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Compatibility check</Text>
          <Text style={styles.helperText}>
            Rates are grams of product per liter of final diluted solution. EC values are
            screening estimates; verify the complete mix with a meter.
          </Text>
          {compareIngredients.map((ingredient) => {
            const guide = ingredient.applicationGuide;
            return (
              <View key={ingredient.id} style={styles.rateRow}>
                <View style={styles.flex1}>
                  <Text style={styles.compareName}>{ingredient.name}</Text>
                  <Text style={styles.compareMeta}>
                    {guide
                      ? `Starter ${guide.typicalRateGPerL} g/L · screen ceiling ${guide.maxRateGPerL} g/L`
                      : "No soluble-rate model for this amendment"}
                  </Text>
                </View>
                {guide ? (
                  <TextInput
                    accessibilityLabel={`${ingredient.name} rate in grams per liter`}
                    style={styles.rateInput}
                    value={rateInputs[ingredient.id] ?? String(guide.typicalRateGPerL)}
                    onChangeText={(value) =>
                      setRateInputs((current) => ({ ...current, [ingredient.id]: value }))
                    }
                    keyboardType="decimal-pad"
                  />
                ) : null}
              </View>
            );
          })}
          {compatibilityAnalysis.estimatedEcContribution != null ? (
            <Text style={styles.detailMeta}>
              Estimated product EC contribution:{" "}
              {compatibilityAnalysis.estimatedEcContribution.toFixed(2)} mS/cm
            </Text>
          ) : null}
          {compatibilityWarnings.length > 0 ? (
            compatibilityWarnings.map((warning) => (
              <Text key={warning} style={styles.warning}>
                {warning}
              </Text>
            ))
          ) : (
            <Text style={styles.helperText}>
              No compatibility warning from this starter set.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Ingredient detail</Text>
        {activeRecommendation ? (
          <>
            <Text style={styles.detailName}>{activeRecommendation.ingredient.name}</Text>
            <Text style={styles.detailMeta}>
              Category: {activeRecommendation.ingredient.category} · Confidence:{" "}
              {activeRecommendation.ingredient.confidence}
            </Text>
            {activeEvidence ? (
              <Text style={styles.evidenceText}>
                Evidence: {activeEvidence.classification.replaceAll("_", " ")} · Source:{" "}
                {activeEvidence.sourceName}
              </Text>
            ) : null}
            <Text style={styles.helperText}>
              {activeRecommendation.ingredient.warnings.join(" ")}
            </Text>
            <Text style={styles.detailSubhead}>Forms</Text>
            {activeRecommendation.timing.map((form) => (
              <View
                key={`${form.nutrient}-${form.form}-${form.chemicalName}`}
                style={styles.formCard}
              >
                <Text style={styles.formTitle}>
                  {form.nutrient.toUpperCase()} · {form.chemicalName}
                </Text>
                <Text style={styles.formMeta}>
                  {form.availabilityClass} → {form.adjustedReleaseDays.min}-
                  {form.adjustedReleaseDays.max} days
                </Text>
                <Text style={styles.formMeta}>
                  pH: {form.pHEffect} · EC: {form.ecImpact} · Mobility: {form.mobility}
                </Text>
                {form.nitrogenForm ? (
                  <Text style={styles.formMeta}>
                    Nitrogen form: {form.nitrogenForm.replaceAll("_", " ")}
                  </Text>
                ) : null}
                {form.activeNitrogenRisks.map((risk) => (
                  <Text key={`${risk.code}-${risk.condition}`} style={styles.warning}>
                    {risk.severity.toUpperCase()} {risk.code.replaceAll("_", " ")}:{" "}
                    {risk.summary} {risk.mitigation}
                  </Text>
                ))}
                {form.chelate ? (
                  <Text style={styles.formMeta}>
                    Chelate: {form.chelate.agent} · stable through about pH{" "}
                    {form.chelate.stableThroughPH}
                  </Text>
                ) : null}
                <Text style={styles.formNotes}>{form.notes}</Text>
              </View>
            ))}
            <Text style={styles.detailSubhead}>Best use</Text>
            <Text style={styles.helperText}>
              {activeRecommendation.ingredient.bestUseCases.join(" · ")}
            </Text>
            <Text style={styles.detailSubhead}>Not for</Text>
            <Text style={styles.helperText}>
              {activeRecommendation.ingredient.badUseCases.join(" · ")}
            </Text>
          </>
        ) : (
          <Text style={styles.helperText}>No ingredient selected yet.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Save</Text>
        <Text style={styles.helperText}>
          Saving records the current chemistry recommendation, timing, and compatibility
          check into the grow journal.
        </Text>
        {growId ? (
          <Pressable
            style={[styles.primaryButton, saving ? styles.disabled : null]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Saving..." : "Save and Open Journal"}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.helperText}>
            Add a grow context to save this recommendation.
          </Text>
        )}
        {savedMessage ? <Text style={styles.helperText}>{savedMessage}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 34, gap: 12 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#475569", lineHeight: 20 },
  context: {
    color: "#166534",
    fontWeight: "700",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 10
  },
  panel: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 10
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF"
  },
  pillOn: { backgroundColor: "#14532D", borderColor: "#14532D" },
  pillText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  pillTextOn: { color: "#FFFFFF" },
  inlineRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  flex1: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: "700", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggle: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF"
  },
  toggleOn: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  toggleText: { fontWeight: "700", color: "#334155" },
  toggleTextOn: { color: "#14532D" },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    padding: 14,
    gap: 6
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#14532D" },
  summaryName: { fontSize: 20, fontWeight: "800", color: "#052E16" },
  summaryMeta: { color: "#166534", fontWeight: "700" },
  summaryText: { color: "#14532D", lineHeight: 20 },
  warning: {
    color: "#9A3412",
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderRadius: 10
  },
  recommendationCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 8
  },
  recommendationCardOn: { borderColor: "#86EFAC", backgroundColor: "#F0FDF4" },
  recommendationHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  recommendationTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  recommendationMeta: { fontSize: 12, color: "#64748B", marginTop: 2 },
  recommendationBody: { color: "#475569", lineHeight: 19 },
  compareButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  compareButtonOn: { backgroundColor: "#14532D", borderColor: "#14532D" },
  compareButtonText: { color: "#334155", fontWeight: "800", fontSize: 12 },
  compareButtonTextOn: { color: "#FFFFFF" },
  releaseGroup: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#FFFFFF"
  },
  releaseLabel: { fontSize: 12, fontWeight: "800", color: "#14532D" },
  releaseItems: { color: "#334155", marginTop: 4, lineHeight: 18 },
  helperText: { color: "#64748B", lineHeight: 19 },
  compareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  rateInput: {
    width: 78,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    textAlign: "right"
  },
  compareName: { fontWeight: "800", color: "#0F172A", flex: 1 },
  compareMeta: { color: "#64748B", flex: 1, textAlign: "right" },
  detailName: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  detailMeta: { color: "#64748B" },
  evidenceText: {
    color: "#166534",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: 8,
    textTransform: "capitalize"
  },
  detailSubhead: { fontSize: 13, fontWeight: "800", color: "#334155", marginTop: 6 },
  formCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 4
  },
  formTitle: { fontWeight: "800", color: "#0F172A" },
  formMeta: { color: "#64748B", fontSize: 12 },
  formNotes: { color: "#334155", fontSize: 13, lineHeight: 18 },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: "#14532D",
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.6 }
});
