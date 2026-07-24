import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  createSoilNutrientBatch,
  fetchProducts,
  fetchProductLines,
  fetchProductTrialEvidenceRuns,
  fetchSoilNutrientBatches,
  CommercialProduct,
  ProductLine,
  ProductTrialEvidenceRun,
  SoilNutrientBatch
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";
import { askPersonalAssistant } from "@/api/personalAssistant";

type BatchForm = {
  batchName: string;
  batchCode: string;
  purpose: string;
  formulaVersion: string;
  productId: string;
  productLineId: string;
  trialGrowId: string;
  batchVolume: string;
  batchVolumeUnit: string;
  estimatedCost: string;
  releaseTimelineNotes: string;
  guaranteedAnalysisNotes: string;
  ingredientSummary: string;
  mixingInstructions: string;
  notes: string;
};

const EMPTY_FORM: BatchForm = {
  batchName: "",
  batchCode: "",
  purpose: "production_batch",
  formulaVersion: "",
  productId: "",
  productLineId: "",
  trialGrowId: "",
  batchVolume: "",
  batchVolumeUnit: "cu_ft",
  estimatedCost: "",
  releaseTimelineNotes: "",
  guaranteedAnalysisNotes: "",
  ingredientSummary: "",
  mixingInstructions: "",
  notes: ""
};

function batchId(batch: SoilNutrientBatch) {
  return batch.id || batch._id || batch.batchCode || batch.batchName || "batch";
}

function numberOrUndefined(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

type RecordChoice = {
  id: string;
  label: string;
};

function recordChoice(
  record: Record<string, any>,
  index: number,
  labelKeys: string[],
  fallback: string
): RecordChoice | null {
  const id = String(record.id ?? record._id ?? "").trim();
  if (!id) return null;
  const label =
    labelKeys.map((key) => String(record[key] ?? "").trim()).find(Boolean) ||
    `${fallback} ${index + 1}`;
  return { id, label };
}

function RecordPicker({
  choices,
  createHref,
  createLabel,
  label,
  onChange,
  selectedId
}: {
  choices: RecordChoice[];
  createHref: string;
  createLabel: string;
  label: string;
  onChange: (id: string) => void;
  selectedId: string;
}) {
  return (
    <View style={styles.recordPicker}>
      <Text style={styles.selectorLabel}>{label}</Text>
      {choices.length ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`${label} choices`}
          style={styles.selectorActions}
        >
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${label}: Not linked yet`}
            accessibilityState={{ checked: !selectedId }}
            onPress={() => onChange("")}
            style={[styles.action, !selectedId && styles.selectedAction]}
          >
            <Text style={styles.actionText}>Not linked yet</Text>
          </Pressable>
          {choices.slice(0, 8).map((item) => (
            <Pressable
              key={`${label}-${item.id}`}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${item.label}`}
              accessibilityState={{ checked: selectedId === item.id }}
              onPress={() => onChange(item.id)}
              style={[styles.action, selectedId === item.id && styles.selectedAction]}
            >
              <Text style={styles.actionText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyPicker}>
          <Text style={styles.muted}>No saved {label.toLowerCase()} records yet.</Text>
          <ActionLink href={createHref} label={createLabel} />
        </View>
      )}
    </View>
  );
}

export default function CommercialBatchPlannerRoute() {
  const [batches, setBatches] = useState<SoilNutrientBatch[]>([]);
  const [products, setProducts] = useState<CommercialProduct[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [evidenceRuns, setEvidenceRuns] = useState<ProductTrialEvidenceRun[]>([]);
  const [form, setForm] = useState<BatchForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [error, setError] = useState<any>(null);
  const [showAdvancedRecordIds, setShowAdvancedRecordIds] = useState(false);

  const readyCount = useMemo(
    () =>
      batches.filter((batch) => ["ready", "used"].includes(batch.status || "")).length,
    [batches]
  );
  const linkedProductCount = useMemo(
    () => batches.filter((batch) => batch.productId).length,
    [batches]
  );

  async function loadBatches() {
    setLoading(true);
    setError(null);
    try {
      const [nextBatches, nextProducts, nextLines, nextEvidenceRuns] = await Promise.all([
        fetchSoilNutrientBatches(),
        fetchProducts(),
        fetchProductLines(),
        fetchProductTrialEvidenceRuns()
      ]);
      setBatches(nextBatches);
      setProducts(nextProducts);
      setProductLines(nextLines);
      setEvidenceRuns(nextEvidenceRuns);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

  const productChoices = products
    .map((record, index) => recordChoice(record, index, ["name"], "Product"))
    .filter((item): item is RecordChoice => !!item);
  const productLineChoices = productLines
    .map((record, index) => recordChoice(record, index, ["name"], "Product line"))
    .filter((item): item is RecordChoice => !!item);
  const evidenceRunChoices = evidenceRuns
    .map((record, index) =>
      recordChoice(record, index, ["name", "growName", "cultivar"], "Evidence run")
    )
    .filter((item): item is RecordChoice => !!item);

  async function submitBatch() {
    if (!form.batchName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createSoilNutrientBatch({
        batchName: form.batchName.trim(),
        name: form.batchName.trim(),
        batchCode: form.batchCode.trim(),
        purpose: form.purpose.trim() || "production_batch",
        formulaVersion: form.formulaVersion.trim(),
        productId: form.productId.trim(),
        productLineId: form.productLineId.trim(),
        linkedTrialId: form.trialGrowId.trim(),
        trialGrowId: form.trialGrowId.trim(),
        batchVolume: numberOrUndefined(form.batchVolume),
        batchVolumeUnit: form.batchVolumeUnit.trim() || "cu_ft",
        estimatedCost: numberOrUndefined(form.estimatedCost),
        releaseTimelineNotes: form.releaseTimelineNotes.trim(),
        guaranteedAnalysisNotes: form.guaranteedAnalysisNotes.trim(),
        ingredientSummary: form.ingredientSummary.trim(),
        mixingInstructions: form.mixingInstructions.trim(),
        notes: form.notes.trim(),
        status: "planned"
      });
      setForm(EMPTY_FORM);
      await loadBatches();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function prefillCommercialBatch() {
    if (prefilling) return;
    setPrefilling(true);
    setError(null);
    try {
      const response = await askPersonalAssistant({
        workspaceType: "commercial",
        context: {
          workflow: "soil-nutrient-batch",
          productLines: productLines.slice(0, 20),
          recentBatches: batches.slice(0, 10),
          requestedFields: Object.keys(EMPTY_FORM)
        },
        message:
          "Prefill a commercial soil/nutrient batch from saved product lines, recipes, verified analyses, inventory/lot records, trials, and prior batch actuals. Return JSON only with the requested string fields. Never invent batch codes, formula versions, product/trial links, guaranteed analysis, quantities, costs, or release claims. Leave unknowns blank. Put missing labels/COAs, substitutions, QA, release uncertainty, and production limitations in notes."
      });
      const raw = String(response.reply || "");
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const parsed = JSON.parse(fenced?.[1] || raw.slice(raw.indexOf("{")));
      setForm(
        Object.fromEntries(
          Object.keys(EMPTY_FORM).map((key) => [key, String(parsed[key] ?? "")])
        ) as BatchForm
      );
    } catch (err) {
      setError(err);
    } finally {
      setPrefilling(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-batch-planner"
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Soil & Nutrient Batch Planner</Text>
            <Text style={styles.subtitle}>
              Commercial batch planning scales recipes with purpose, guaranteed analysis,
              release timing, cost, inventory pull sheets, product links, and evidence run
              links.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink
              href="/home/commercial/products/new"
              label="Create Product Draft"
            />
            <ActionLink href="/home/commercial/trials" label="Product Trials" />
            <ActionLink href="/home/commercial/products" label="Products" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Commercial batch fields</Text>
        <Text style={styles.body}>
          Track formula versions, guaranteed analysis, release timing, inventory, cost,
          and the products or trials connected to each batch.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{batches.length}</Text>
            <Text style={styles.metricLabel}>Batches</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{readyCount}</Text>
            <Text style={styles.metricLabel}>Ready/used</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{linkedProductCount}</Text>
            <Text style={styles.metricLabel}>Linked products</Text>
          </View>
        </View>
        {loading ? <Text style={styles.muted}>Loading batches...</Text> : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Create commercial batch</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fill commercial batch from saved records"
          disabled={prefilling}
          onPress={prefillCommercialBatch}
          style={[styles.action, prefilling && styles.disabled]}
        >
          <Text style={styles.actionText}>
            {prefilling ? "Reviewing records..." : "Fill from saved records with AI"}
          </Text>
        </Pressable>
        <View style={styles.formGrid}>
          <TextInput
            value={form.batchName}
            onChangeText={(batchName) => setForm((prev) => ({ ...prev, batchName }))}
            accessibilityLabel="Commercial batch name"
            placeholder="Batch name"
            style={styles.input}
          />
          <TextInput
            value={form.batchCode}
            onChangeText={(batchCode) => setForm((prev) => ({ ...prev, batchCode }))}
            accessibilityLabel="Commercial batch code"
            placeholder="Batch code / SKU"
            style={styles.input}
          />
          <TextInput
            value={form.purpose}
            onChangeText={(purpose) => setForm((prev) => ({ ...prev, purpose }))}
            accessibilityLabel="Commercial batch purpose"
            placeholder="Purpose"
            style={styles.input}
          />
          <TextInput
            value={form.formulaVersion}
            onChangeText={(formulaVersion) =>
              setForm((prev) => ({ ...prev, formulaVersion }))
            }
            accessibilityLabel="Commercial batch formula version"
            placeholder="Formula version"
            style={styles.input}
          />
          <RecordPicker
            label="Batch product"
            choices={productChoices}
            selectedId={form.productId}
            onChange={(productId) => setForm((prev) => ({ ...prev, productId }))}
            createHref="/home/commercial/products/new"
            createLabel="Create Product"
          />
          <RecordPicker
            label="Batch product line"
            choices={productLineChoices}
            selectedId={form.productLineId}
            onChange={(productLineId) => setForm((prev) => ({ ...prev, productLineId }))}
            createHref="/home/commercial/product-lines"
            createLabel="Create Product Line"
          />
          <RecordPicker
            label="Batch evidence run"
            choices={evidenceRunChoices}
            selectedId={form.trialGrowId}
            onChange={(trialGrowId) => setForm((prev) => ({ ...prev, trialGrowId }))}
            createHref="/home/commercial/evidence-runs/new"
            createLabel="Create Evidence Run"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showAdvancedRecordIds
                ? "Hide advanced batch record ID fields"
                : "Show advanced batch record ID fields"
            }
            accessibilityState={{ expanded: showAdvancedRecordIds }}
            onPress={() => setShowAdvancedRecordIds((current) => !current)}
            style={styles.advancedToggle}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvancedRecordIds
                ? "Hide advanced record IDs"
                : "Use advanced record IDs"}
            </Text>
          </Pressable>
          {showAdvancedRecordIds ? (
            <>
              <TextInput
                value={form.productId}
                onChangeText={(productId) => setForm((prev) => ({ ...prev, productId }))}
                accessibilityLabel="Commercial batch product id"
                placeholder="Linked product ID"
                style={styles.input}
              />
              <TextInput
                value={form.productLineId}
                onChangeText={(productLineId) =>
                  setForm((prev) => ({ ...prev, productLineId }))
                }
                accessibilityLabel="Commercial batch product line id"
                placeholder="Linked product line ID"
                style={styles.input}
              />
              <TextInput
                value={form.trialGrowId}
                onChangeText={(trialGrowId) =>
                  setForm((prev) => ({ ...prev, trialGrowId }))
                }
                accessibilityLabel="Commercial batch evidence run id"
                placeholder="Linked evidence run ID"
                style={styles.input}
              />
            </>
          ) : null}
          <TextInput
            value={form.batchVolume}
            onChangeText={(batchVolume) => setForm((prev) => ({ ...prev, batchVolume }))}
            accessibilityLabel="Commercial batch volume"
            keyboardType="decimal-pad"
            placeholder="Batch volume"
            style={styles.input}
          />
          <TextInput
            value={form.batchVolumeUnit}
            onChangeText={(batchVolumeUnit) =>
              setForm((prev) => ({ ...prev, batchVolumeUnit }))
            }
            accessibilityLabel="Commercial batch volume unit"
            placeholder="Volume unit"
            style={styles.input}
          />
          <TextInput
            value={form.estimatedCost}
            onChangeText={(estimatedCost) =>
              setForm((prev) => ({ ...prev, estimatedCost }))
            }
            accessibilityLabel="Commercial batch estimated cost"
            keyboardType="decimal-pad"
            placeholder="Estimated cost"
            style={styles.input}
          />
        </View>
        <TextInput
          value={form.guaranteedAnalysisNotes}
          onChangeText={(guaranteedAnalysisNotes) =>
            setForm((prev) => ({ ...prev, guaranteedAnalysisNotes }))
          }
          accessibilityLabel="Commercial batch guaranteed analysis notes"
          multiline
          placeholder="Guaranteed analysis / elemental estimate notes"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.releaseTimelineNotes}
          onChangeText={(releaseTimelineNotes) =>
            setForm((prev) => ({ ...prev, releaseTimelineNotes }))
          }
          accessibilityLabel="Commercial batch release timeline notes"
          multiline
          placeholder="Release timing: fast, medium, slow inputs and uncertainty"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.ingredientSummary}
          onChangeText={(ingredientSummary) =>
            setForm((prev) => ({ ...prev, ingredientSummary }))
          }
          accessibilityLabel="Commercial batch ingredient summary"
          multiline
          placeholder="Ingredient pull sheet / ingredient summary"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.mixingInstructions}
          onChangeText={(mixingInstructions) =>
            setForm((prev) => ({ ...prev, mixingInstructions }))
          }
          accessibilityLabel="Commercial batch mixing instructions"
          multiline
          placeholder="Mixing instructions, rest/cook timing, QC notes"
          style={[styles.input, styles.textArea]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create commercial batch"
          disabled={saving || !form.batchName.trim()}
          onPress={submitBatch}
          style={[
            styles.primaryAction,
            saving || !form.batchName.trim() ? styles.disabled : null
          ]}
        >
          <Text style={styles.primaryActionText}>
            {saving ? "Creating..." : "Create Batch"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Current batches</Text>
        {batches.length ? (
          <View style={styles.list}>
            {batches.map((batch) => (
              <View key={batchId(batch)} style={styles.batchRow}>
                <Text style={styles.batchTitle}>{batch.batchName || batch.name}</Text>
                <Text style={styles.batchMeta}>
                  {[
                    batch.batchCode,
                    batch.purpose,
                    batch.formulaVersion && `formula ${batch.formulaVersion}`,
                    batch.status || "planned"
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {batch.productId ||
                batch.productLineId ||
                batch.linkedTrialId ||
                batch.trialGrowId ? (
                  <Text style={styles.batchMeta}>
                    Links:{" "}
                    {[
                      batch.productId && `product ${batch.productId}`,
                      batch.productLineId && `line ${batch.productLineId}`,
                      (batch.linkedTrialId || batch.trialGrowId) &&
                        `trial ${batch.linkedTrialId || batch.trialGrowId}`
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
                {batch.releaseTimelineNotes ? (
                  <Text style={styles.batchBody}>{batch.releaseTimelineNotes}</Text>
                ) : null}
                <View style={styles.actions}>
                  <ActionLink
                    href={`/home/commercial/batch-planner/${encodeURIComponent(batchId(batch))}`}
                    label="Open Detail"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No commercial batches yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>From formula to product</Text>
        <Text style={styles.body}>
          Commercial batch planning should turn a purpose-built recipe into a
          product-ready formula only after the formula has batch records, cost context,
          and product trial evidence.
        </Text>
        <Text style={styles.bullet}>
          Create recipe/formula with purpose: seedling, veg, flower, topdress, re-amend,
          recovery, production batch
        </Text>
        <Text style={styles.bullet}>
          Scale batch and generate ingredient pull sheet, cost, packaging, and mixing
          tasks
        </Text>
        <Text style={styles.bullet}>
          Link batch to product/product line and evidence run
        </Text>
        <Text style={styles.bullet}>
          Track plant response before publishing product claims
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/product-lines" label="Product Lines" />
          <ActionLink
            href="/home/commercial/evidence-runs/new"
            label="Create Product Trial Evidence Run"
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Effectiveness loop</Text>
        <Text style={styles.body}>
          A soil or nutrient product is not done at recipe math. Link batches to trial
          evidence runs and track seedling safety, veg vigor, pH/EC stability,
          deficiencies, yield, aroma, dry/cure, and repeat-run performance.
        </Text>
        <Text style={styles.bullet}>pH/EC checks and runoff context</Text>
        <Text style={styles.bullet}>Diagnosis events and nutrient/source warnings</Text>
        <Text style={styles.bullet}>Crop steering response and dryback tolerance</Text>
        <Text style={styles.bullet}>
          Harvest, dry/cure, aroma/flavor, and repeat-run comparison
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Start Trial" />
          <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Naming rule</Text>
        <Text style={styles.body}>
          The app module is Soil & Nutrient Batch Planner. Living Soil Labs is an example
          commercial brand, not the feature name.
        </Text>
        <Text style={styles.bullet}>
          Use product, formula, batch, trial, and storefront language in the app
        </Text>
        <Text style={styles.bullet}>Do not label the module Living Soil Labs</Text>
        <Text style={styles.bullet}>
          Keep production batch planning and records inside the Commercial workspace
        </Text>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between"
  },
  headerText: {
    flex: 1,
    minWidth: 260
  },
  headerActions: {
    alignContent: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: 440
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900"
  },
  body: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 130,
    padding: 9
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#0F172A",
    flexGrow: 1,
    fontSize: 14,
    minWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  textArea: {
    minHeight: 82,
    marginTop: 8,
    textAlignVertical: "top"
  },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.5
  },
  list: {
    gap: 10,
    marginTop: 12
  },
  batchRow: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  batchTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900"
  },
  batchMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  batchBody: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  selectedAction: { backgroundColor: "#DCFCE7", borderColor: "#22C55E" },
  actionText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  },
  recordPicker: {
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 220,
    padding: 9
  },
  emptyPicker: {
    alignItems: "flex-start",
    gap: 8
  },
  selectorLabel: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  selectorActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  advancedToggle: {
    alignSelf: "flex-start",
    minWidth: 220,
    paddingHorizontal: 4,
    paddingVertical: 8
  },
  advancedToggleText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
    textDecorationLine: "underline"
  },
  bullet: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  },
  muted: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10
  }
});
