import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import {
  saveToolRunAndCreateTask,
  saveToolRunAndOpenJournal
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
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
  type LabResultOverrides,
  type NutrientIntent,
  type NutrientKey,
  type NutrientStage,
  type NutrientEnvironment
} from "@/features/personal/tools/nutrientChemistry/engine";
import { nutrientContextState } from "@/features/personal/tools/nutrientContext";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

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

function toReferenceUrl(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) ? trimmed : null;
}

function nutrientChemistryTaskMetadata(hasWarnings: boolean) {
  return {
    allDay: true,
    calendarType: "nutrient_chemistry_review",
    sourceStage: hasWarnings
      ? "nutrient_compatibility_warning_review"
      : "nutrient_source_review",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

export default function NutrientChemistryToolScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createNutrientChemistryStyles(palette), [palette]);
  const pillStyle = (active: boolean) => [styles.pill, active ? styles.pillOn : null];
  const router = useRouter();
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = coerceParam(rawGrowId);
  const plantContext = useToolPlantContext(growId, coerceParam(rawPlantId));
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_NPK);
  const cropContext = nutrientContextState(plantContext.selectedPlantContext);

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
  const [referenceInputs, setReferenceInputs] = useState<Record<string, string>>({});
  const [labResultInputs, setLabResultInputs] = useState<
    Record<string, Record<string, string>>
  >({});
  const [savedMessage, setSavedMessage] = useState("");
  const [savedMessageKind, setSavedMessageKind] = useState<"success" | "error" | "">("");
  const [saving, setSaving] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

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
  const labOverrides = useMemo(
    () =>
      Object.fromEntries(
        timelineIngredients.map((ingredient) => {
          const entries = Object.entries(labResultInputs[ingredient.id] || {})
            .map(([element, value]) => [element, toPositiveNumber(value)] as const)
            .filter((entry): entry is readonly [string, number] => {
              const value = entry[1];
              return value != null && value <= 100;
            });
          return [ingredient.id, Object.fromEntries(entries) as LabResultOverrides];
        })
      ) as Record<string, LabResultOverrides>,
    [timelineIngredients, labResultInputs]
  );
  const referenceUrls = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(referenceInputs)
          .map(([ingredientId, value]) => [ingredientId, toReferenceUrl(value)] as const)
          .filter((entry): entry is readonly [string, string] => entry[1] != null)
      ),
    [referenceInputs]
  );
  const compatibilityAnalysis = useMemo(
    () =>
      analyzeCompatibility(
        timelineIngredients,
        environment,
        applicationRates,
        labOverrides
      ),
    [timelineIngredients, environment, applicationRates, labOverrides]
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
    ? getIngredientEvidence(
        activeRecommendation.ingredient,
        referenceUrls[activeRecommendation.ingredient.id]
      )
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
    setSavedMessageKind("");
    const result = await saveToolRunAndOpenJournal({
      router,
      growId,
      ...plantContext.toolRunContext,
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
        applicationRatesGPerL: applicationRates,
        labResultOverrides: labOverrides,
        referenceUrls
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
    setSavedMessageKind(result.ok ? "success" : "error");
    setSaving(false);
  }

  async function createReviewTask() {
    if (!growId || creatingTask || !activeRecommendation) return;
    setCreatingTask(true);
    setSavedMessage("");
    setSavedMessageKind("");
    const result = await saveToolRunAndCreateTask({
      growId,
      ...plantContext.toolRunContext,
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
        applicationRatesGPerL: applicationRates,
        labResultOverrides: labOverrides,
        referenceUrls
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
      },
      title: "Review nutrient chemistry recommendation",
      description: [
        `Best current fit: ${activeRecommendation.ingredient.name}`,
        `Use case: ${intent.replaceAll("_", " ")}`,
        `Release: ${activeRecommendation.releaseSummary}`,
        compatibilityWarnings.length
          ? `Warnings: ${compatibilityWarnings.join("; ")}`
          : ""
      ]
        .filter(Boolean)
        .join("\n"),
      priority: compatibilityWarnings.length ? "high" : "medium",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...nutrientChemistryTaskMetadata(compatibilityWarnings.length > 0)
    });
    setSavedMessage(result.ok ? "Created nutrient review task." : result.error);
    setSavedMessageKind(result.ok ? "success" : "error");
    setCreatingTask(false);
  }

  if (!enabled) {
    return (
      <ScreenBoundary
        title="Nutrient Chemistry"
        showBack
        backFallbackHref="/home/personal/tools"
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Nutrient Chemistry</Text>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Tool unavailable</Text>
            <Text style={styles.helperText}>This account does not have `TOOL_NPK`.</Text>
          </View>
        </ScrollView>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="Nutrient Chemistry"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nutrient Chemistry</Text>
        <Text style={styles.subtitle}>
          Classify source form, release speed, pH effect, and fast vs slow use case.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_nutrient_chemistry"
          longContent
        />
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        <ToolPlantContextPicker
          plants={plantContext.plants}
          plantId={plantContext.plantId}
          selectedPlant={plantContext.selectedPlant}
          onSelect={plantContext.setPlantId}
        />
        <View
          style={[
            styles.contextPanel,
            cropContext.state === "confirmed" ? styles.contextPanelOk : null
          ]}
        >
          <Text style={styles.contextPanelTitle}>{cropContext.label}</Text>
          <Text style={styles.helperText}>{cropContext.message}</Text>
        </View>

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
                  style={[
                    styles.pillText,
                    stage === option.key ? styles.pillTextOn : null
                  ]}
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
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>pH</Text>
              <TextInput
                style={styles.input}
                value={pH}
                onChangeText={setPH}
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Days until need</Text>
              <TextInput
                style={styles.input}
                value={daysUntilNeed}
                onChangeText={setDaysUntilNeed}
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
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
              <Text
                style={[styles.toggleText, isConcentrate ? styles.toggleTextOn : null]}
              >
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

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_nutrient_chemistry"
          longContent
        />

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
                    style={[
                      styles.compareButton,
                      selected ? styles.compareButtonOn : null
                    ]}
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
            Fast / medium / slow groupings help separate quick correction from
            soil-building inputs.
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
              {compareGroups.medium.map((row) => row.ingredient.name).join(" · ") ||
                "None"}
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
            Adjusted for the selected temperature, moisture, biology, and pH. A form
            appears in each band its estimated range overlaps.
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
              Rates are grams of product per liter of final diluted solution. EC values
              are screening estimates; verify the complete mix with a meter.
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
                        setRateInputs((current) => ({
                          ...current,
                          [ingredient.id]: value
                        }))
                      }
                      placeholderTextColor={palette.textMuted}
                      selectionColor={palette.accent}
                      keyboardType="decimal-pad"
                    />
                  ) : null}
                  <TextInput
                    accessibilityLabel={`${ingredient.name} manufacturer or reference URL`}
                    style={styles.referenceInput}
                    value={referenceInputs[ingredient.id] || ""}
                    onChangeText={(value) =>
                      setReferenceInputs((current) => ({
                        ...current,
                        [ingredient.id]: value
                      }))
                    }
                    placeholder="Manufacturer/reference URL"
                    placeholderTextColor={palette.textMuted}
                    selectionColor={palette.accent}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <View style={styles.labRow}>
                    {Object.keys(ingredient.elemental).map((element) => (
                      <View key={element} style={styles.labField}>
                        <Text style={styles.label}>Lab {element} %</Text>
                        <TextInput
                          accessibilityLabel={`${ingredient.name} lab ${element} percent`}
                          style={styles.labInput}
                          value={labResultInputs[ingredient.id]?.[element] || ""}
                          onChangeText={(value) =>
                            setLabResultInputs((current) => ({
                              ...current,
                              [ingredient.id]: {
                                ...current[ingredient.id],
                                [element]: value
                              }
                            }))
                          }
                          placeholder={String(
                            ingredient.elemental[
                              element as keyof typeof ingredient.elemental
                            ]
                          )}
                          placeholderTextColor={palette.textMuted}
                          selectionColor={palette.accent}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
            {compatibilityAnalysis.estimatedEcContribution != null ? (
              <Text style={styles.detailMeta}>
                Estimated product EC contribution:{" "}
                {compatibilityAnalysis.estimatedEcContribution.toFixed(2)} mS/cm
              </Text>
            ) : null}
            {compatibilityAnalysis.issues.length > 0 ? (
              compatibilityAnalysis.issues.map((issue) => (
                <View
                  key={`${issue.code}-${issue.message}`}
                  style={styles.compatibilityIssue}
                >
                  <View style={styles.issueHeader}>
                    <Text
                      style={[
                        styles.severityBadge,
                        issue.severity === "high"
                          ? styles.severityHigh
                          : issue.severity === "medium"
                            ? styles.severityMedium
                            : styles.severityLow
                      ]}
                    >
                      {issue.severity.toUpperCase()}
                    </Text>
                    <Text style={styles.issueCode}>
                      {issue.code.replaceAll("_", " ")}
                    </Text>
                  </View>
                  <Text style={styles.issueMessage}>{issue.message}</Text>
                  <Text style={styles.issueRemediation}>Action: {issue.remediation}</Text>
                </View>
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
              <Text style={styles.detailName}>
                {activeRecommendation.ingredient.name}
              </Text>
              <Text style={styles.detailMeta}>
                Category: {activeRecommendation.ingredient.category} · Confidence:{" "}
                {activeRecommendation.ingredient.confidence}
              </Text>
              {activeEvidence ? (
                <>
                  <Text style={styles.evidenceText}>
                    Evidence: {activeEvidence.classification.replaceAll("_", " ")} ·
                    Source: {activeEvidence.sourceName}
                  </Text>
                  {activeEvidence.reference ? (
                    <Pressable
                      onPress={() => Linking.openURL(activeEvidence.reference || "")}
                    >
                      <Text style={styles.referenceLink}>
                        Open manufacturer/reference source
                      </Text>
                    </Pressable>
                  ) : null}
                </>
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
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.primaryButton, saving ? styles.disabled : null]}
                onPress={save}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? "Saving..." : "Save and Open Journal"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryButton,
                  creatingTask || !activeRecommendation ? styles.disabled : null
                ]}
                onPress={createReviewTask}
                disabled={creatingTask || !activeRecommendation}
              >
                <Text style={styles.secondaryButtonText}>
                  {creatingTask ? "Creating..." : "Create Review Task"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.helperText}>
              Add a grow context to save this recommendation.
            </Text>
          )}
          {savedMessage ? (
            <Text
              style={
                savedMessageKind === "error"
                  ? styles.feedbackError
                  : styles.feedbackSuccess
              }
            >
              {savedMessage}
            </Text>
          ) : null}
        </View>

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_nutrient_chemistry"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

export const createNutrientChemistryStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 20, paddingBottom: 34, gap: 12 },
    title: { fontSize: 24, fontWeight: "800", color: palette.text },
    subtitle: { fontSize: 14, color: palette.textMuted, lineHeight: 20 },
    context: {
      color: palette.link,
      fontWeight: "700",
      backgroundColor: palette.accentSoft,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10
    },
    contextPanel: {
      borderWidth: 1,
      borderColor: palette.warning,
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      padding: 12,
      gap: 4
    },
    contextPanelOk: {
      borderColor: palette.success,
      backgroundColor: palette.accentSoft
    },
    contextPanelTitle: { color: palette.text, fontWeight: "800" },
    panel: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted,
      padding: 14,
      gap: 10
    },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: palette.text },
    wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: palette.surface
    },
    pillOn: { backgroundColor: palette.accent, borderColor: palette.accent },
    pillText: { color: palette.text, fontWeight: "700", fontSize: 12 },
    pillTextOn: { color: palette.accentText },
    inlineRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    flex1: { flex: 1, gap: 6 },
    label: { fontSize: 12, fontWeight: "700", color: palette.text },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    toggle: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface
    },
    toggleOn: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    toggleText: { fontWeight: "700", color: palette.text },
    toggleTextOn: { color: palette.link },
    summaryCard: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      backgroundColor: palette.accentSoft,
      padding: 14,
      gap: 6
    },
    cardTitle: { fontSize: 16, fontWeight: "800", color: palette.link },
    summaryName: { fontSize: 20, fontWeight: "800", color: palette.text },
    summaryMeta: { color: palette.accent, fontWeight: "700" },
    summaryText: { color: palette.textSoft, lineHeight: 20 },
    warning: {
      color: palette.warning,
      backgroundColor: palette.surfaceStrong,
      padding: 10,
      borderRadius: radius.card
    },
    compatibilityIssue: {
      borderWidth: 1,
      borderColor: palette.warning,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceStrong,
      padding: 10,
      gap: 6
    },
    issueHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    severityBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 11,
      fontWeight: "800",
      overflow: "hidden"
    },
    severityHigh: { color: palette.danger, backgroundColor: palette.surfaceMuted },
    severityMedium: { color: palette.warning, backgroundColor: palette.surfaceMuted },
    severityLow: { color: palette.success, backgroundColor: palette.accentSoft },
    issueCode: { color: palette.warning, fontSize: 12, fontWeight: "800" },
    issueMessage: { color: palette.text, lineHeight: 19 },
    issueRemediation: {
      color: palette.warning,
      lineHeight: 19,
      fontWeight: "700"
    },
    recommendationCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      padding: 12,
      gap: 8
    },
    recommendationCardOn: {
      borderColor: palette.accent,
      backgroundColor: palette.accentSoft
    },
    recommendationHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
    recommendationTitle: { fontSize: 15, fontWeight: "800", color: palette.text },
    recommendationMeta: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
    recommendationBody: { color: palette.textSoft, lineHeight: 19 },
    compareButton: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: palette.surface
    },
    compareButtonOn: { backgroundColor: palette.accent, borderColor: palette.accent },
    compareButtonText: { color: palette.link, fontWeight: "800", fontSize: 12 },
    compareButtonTextOn: { color: palette.accentText },
    releaseGroup: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface
    },
    releaseLabel: { fontSize: 12, fontWeight: "800", color: palette.link },
    releaseItems: { color: palette.textSoft, marginTop: 4, lineHeight: 18 },
    helperText: { color: palette.textMuted, lineHeight: 19 },
    compareRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: palette.border
    },
    rateRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 10,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: palette.border
    },
    rateInput: {
      width: 78,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: palette.surface,
      color: palette.text,
      textAlign: "right"
    },
    referenceInput: {
      width: "100%",
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: palette.surface,
      color: palette.text
    },
    labRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 8 },
    labField: { width: 92, gap: 4 },
    labInput: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: palette.surface,
      color: palette.text
    },
    referenceLink: {
      color: palette.link,
      fontWeight: "700",
      textDecorationLine: "underline"
    },
    compareName: { fontWeight: "800", color: palette.text, flex: 1 },
    compareMeta: { color: palette.textMuted, flex: 1, textAlign: "right" },
    detailName: { fontSize: 18, fontWeight: "800", color: palette.text },
    detailMeta: { color: palette.textMuted },
    evidenceText: {
      color: palette.link,
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      padding: 8,
      textTransform: "capitalize"
    },
    detailSubhead: {
      fontSize: 13,
      fontWeight: "800",
      color: palette.text,
      marginTop: 6
    },
    formCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      padding: 10,
      gap: 4
    },
    formTitle: { fontWeight: "800", color: palette.text },
    formMeta: { color: palette.textMuted, fontSize: 12 },
    formNotes: { color: palette.textSoft, fontSize: 13, lineHeight: 18 },
    primaryButton: {
      borderRadius: radius.card,
      backgroundColor: palette.accent,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center"
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "800" },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center"
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    feedbackSuccess: { color: palette.success, lineHeight: 19, fontWeight: "700" },
    feedbackError: { color: palette.danger, lineHeight: 19, fontWeight: "700" },
    disabled: { opacity: 0.6 }
  });
