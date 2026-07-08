import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  createSoilNutrientBatch,
  fetchSoilNutrientBatches,
  SoilNutrientBatch
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";

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

export default function CommercialBatchPlannerRoute() {
  const [batches, setBatches] = useState<SoilNutrientBatch[]>([]);
  const [form, setForm] = useState<BatchForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

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
      setBatches(await fetchSoilNutrientBatches());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBatches();
  }, []);

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
          Commercial users need product/formula fields on top of the normal batch planner.
          Do not call this Living Soil Labs inside the app.
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
            onChangeText={(trialGrowId) => setForm((prev) => ({ ...prev, trialGrowId }))}
            accessibilityLabel="Commercial batch evidence run id"
            placeholder="Linked evidence run ID"
            style={styles.input}
          />
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
                {batch.productId || batch.productLineId || batch.trialGrowId ? (
                  <Text style={styles.batchMeta}>
                    Links:{" "}
                    {[
                      batch.productId && `product ${batch.productId}`,
                      batch.productLineId && `line ${batch.productLineId}`,
                      batch.trialGrowId && `trial ${batch.trialGrowId}`
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
        <Text style={styles.cardTitle}>Formula-to-product workflow</Text>
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
            href="/home/commercial/grows/new"
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
          Support both personal one-grow batches and commercial production batches
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
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
