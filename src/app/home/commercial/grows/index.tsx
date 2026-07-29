import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CommercialProduct,
  CommercialGrow,
  createCommercialGrow,
  fetchCommercialGrows,
  fetchProductLines,
  fetchProducts,
  fetchSoilNutrientBatches,
  ProductLine,
  SoilNutrientBatch
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

type GrowForm = {
  name: string;
  purpose: string;
  cropType: string;
  cultivar: string;
  medium: string;
  plantCount: string;
  productId: string;
  productLineId: string;
  batchId: string;
  formulaVersion: string;
  measurementPlan: string;
  publicShareStatus: "private" | "evidence_building" | "public_ready";
  notes: string;
};

const EMPTY_FORM: GrowForm = {
  name: "",
  purpose: "product_trial",
  cropType: "cannabis",
  cultivar: "",
  medium: "",
  plantCount: "",
  productId: "",
  productLineId: "",
  batchId: "",
  formulaVersion: "",
  measurementPlan: "",
  publicShareStatus: "evidence_building",
  notes: ""
};

function growId(grow: CommercialGrow) {
  return grow.id || grow._id || grow.name || grow.growName || "grow";
}

function parseCount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
  emptyLabel,
  label,
  onChange,
  selectedId
}: {
  choices: RecordChoice[];
  createHref: string;
  createLabel: string;
  emptyLabel: string;
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
          <Text style={styles.muted}>No saved {emptyLabel} yet.</Text>
          <ActionLink href={createHref} label={createLabel} />
        </View>
      )}
    </View>
  );
}

const SHARE_STATUS_CHOICES: Array<{
  id: GrowForm["publicShareStatus"];
  label: string;
  help: string;
}> = [
  {
    id: "private",
    label: "Private",
    help: "Keep this run inside the Commercial workspace."
  },
  {
    id: "evidence_building",
    label: "Evidence building",
    help: "Collect and review evidence before using it publicly."
  },
  {
    id: "public_ready",
    label: "Public ready",
    help: "Mark the reviewed run as ready to support public material."
  }
];

export default function CommercialGrowsRoute({
  routeKey = "commercial-grows"
}: {
  routeKey?: string;
} = {}) {
  const auth = useAuth();
  const ent = useEntitlements();
  const [grows, setGrows] = useState<CommercialGrow[]>([]);
  const [products, setProducts] = useState<CommercialProduct[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [batches, setBatches] = useState<SoilNutrientBatch[]>([]);
  const [form, setForm] = useState<GrowForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [showAdvancedRecordIds, setShowAdvancedRecordIds] = useState(false);

  const activeCount = useMemo(
    () => grows.filter((grow) => (grow.status || "active") === "active").length,
    [grows]
  );
  const publicReadyCount = useMemo(
    () => grows.filter((grow) => grow.publicShareStatus === "public_ready").length,
    [grows]
  );
  const productChoices = useMemo(
    () =>
      products
        .map((record, index) => recordChoice(record, index, ["name"], "Product"))
        .filter((item): item is RecordChoice => !!item),
    [products]
  );
  const productLineChoices = useMemo(
    () =>
      productLines
        .map((record, index) => recordChoice(record, index, ["name"], "Product line"))
        .filter((item): item is RecordChoice => !!item),
    [productLines]
  );
  const batchChoices = useMemo(
    () =>
      batches
        .map((record, index) =>
          recordChoice(record, index, ["batchName", "name", "batchCode"], "Batch")
        )
        .filter((item): item is RecordChoice => !!item),
    [batches]
  );

  async function loadGrows() {
    setLoading(true);
    setError(null);
    try {
      const [nextGrows, nextProducts, nextLines, nextBatches] = await Promise.all([
        fetchCommercialGrows(),
        fetchProducts(),
        fetchProductLines(),
        fetchSoilNutrientBatches()
      ]);
      setGrows(nextGrows);
      setProducts(nextProducts);
      setProductLines(nextLines);
      setBatches(nextBatches);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrows();
  }, []);

  async function submitGrow() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCommercialGrow({
        name: form.name.trim(),
        growName: form.name.trim(),
        purpose: form.purpose.trim() || "product_trial",
        cropType: form.cropType.trim() || "cannabis",
        cultivar: form.cultivar.trim(),
        medium: form.medium.trim(),
        plantCount: parseCount(form.plantCount),
        productId: form.productId.trim(),
        productLineId: form.productLineId.trim(),
        batchId: form.batchId.trim(),
        formulaVersion: form.formulaVersion.trim(),
        measurementPlan: form.measurementPlan.trim(),
        publicShareStatus: form.publicShareStatus,
        notes: form.notes.trim(),
        status: "active"
      });
      setForm(EMPTY_FORM);
      await loadGrows();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey={routeKey}
      backFallbackHref={
        routeKey === "commercial-grow-create" ||
        routeKey === "commercial-evidence-run-create"
          ? "/home/commercial/evidence-runs"
          : undefined
      }
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text accessibilityRole="header" aria-level={1} style={styles.title}>
              Product Trial Evidence Runs
            </Text>
            <Text style={styles.subtitle}>
              Commercial accounts use grow records only when they support product trials,
              formula tests, demos, and evidence-backed public reporting.
            </Text>
            <Text style={styles.accountLine}>
              {[auth.user?.email, `${ent.plan || "commercial"} plan`]
                .filter(Boolean)
                .join(" | ")}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink
              href="/home/commercial/evidence-runs/new"
              label="Create Evidence Run"
            />
            <ActionLink href="/home/commercial/trials" label="Product Trials" />
            <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Evidence run overview
        </Text>
        <Text style={styles.body}>
          Use evidence runs to track plants, logs, tasks, photos, diagnosis, crop
          steering, dry/cure, and run-to-run comparisons. Commercial metadata links the
          evidence back to products, formulas, batches, and trial reports.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{grows.length}</Text>
            <Text style={styles.metricLabel}>Evidence runs</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{activeCount}</Text>
            <Text style={styles.metricLabel}>Active</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{publicReadyCount}</Text>
            <Text style={styles.metricLabel}>Public-ready</Text>
          </View>
        </View>
        {loading ? (
          <Text style={styles.muted}>Loading product trial evidence runs...</Text>
        ) : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Create Product Trial Evidence Run
        </Text>
        <Text style={styles.body}>
          Start with trial anchors, then add brand and product context: product line,
          product, batch, formula version, purpose, and public-share intent.
        </Text>
        <View style={styles.formGrid}>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
            accessibilityLabel="Product trial evidence run name"
            placeholder="Evidence run name"
            style={styles.input}
          />
          <TextInput
            value={form.purpose}
            onChangeText={(purpose) => setForm((prev) => ({ ...prev, purpose }))}
            accessibilityLabel="Product trial evidence run purpose"
            placeholder="Purpose: product_trial, soil_trial, demo_trial..."
            style={styles.input}
          />
          <TextInput
            value={form.cropType}
            onChangeText={(cropType) => setForm((prev) => ({ ...prev, cropType }))}
            accessibilityLabel="Product trial evidence run crop type"
            placeholder="Crop type"
            style={styles.input}
          />
          <TextInput
            value={form.cultivar}
            onChangeText={(cultivar) => setForm((prev) => ({ ...prev, cultivar }))}
            accessibilityLabel="Product trial evidence run cultivar"
            placeholder="Cultivar / plant line"
            style={styles.input}
          />
          <TextInput
            value={form.medium}
            onChangeText={(medium) => setForm((prev) => ({ ...prev, medium }))}
            accessibilityLabel="Product trial evidence run medium"
            placeholder="Medium"
            style={styles.input}
          />
          <TextInput
            value={form.plantCount}
            onChangeText={(plantCount) => setForm((prev) => ({ ...prev, plantCount }))}
            accessibilityLabel="Product trial evidence run plant count"
            keyboardType="numeric"
            placeholder="Plant count"
            style={styles.input}
          />
          <TextInput
            value={form.formulaVersion}
            onChangeText={(formulaVersion) =>
              setForm((prev) => ({ ...prev, formulaVersion }))
            }
            accessibilityLabel="Product trial evidence run formula version"
            placeholder="Formula version"
            style={styles.input}
          />
        </View>
        <View style={styles.pickerGrid}>
          <RecordPicker
            label="Evidence run product"
            choices={productChoices}
            selectedId={form.productId}
            onChange={(productId) => setForm((prev) => ({ ...prev, productId }))}
            emptyLabel="products"
            createHref="/home/commercial/products/new"
            createLabel="Create Product"
          />
          <RecordPicker
            label="Evidence run product line"
            choices={productLineChoices}
            selectedId={form.productLineId}
            onChange={(productLineId) => setForm((prev) => ({ ...prev, productLineId }))}
            emptyLabel="product lines"
            createHref="/home/commercial/product-lines"
            createLabel="Create Product Line"
          />
          <RecordPicker
            label="Evidence run product batch"
            choices={batchChoices}
            selectedId={form.batchId}
            onChange={(batchId) => setForm((prev) => ({ ...prev, batchId }))}
            emptyLabel="product batches"
            createHref="/home/commercial/batch-planner"
            createLabel="Create Product Batch"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showAdvancedRecordIds
              ? "Hide advanced evidence run record ID fields"
              : "Show advanced evidence run record ID fields"
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
          <View style={styles.formGrid}>
            <TextInput
              value={form.productId}
              onChangeText={(productId) => setForm((prev) => ({ ...prev, productId }))}
              accessibilityLabel="Product trial evidence run product id"
              placeholder="Product ID"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={form.productLineId}
              onChangeText={(productLineId) =>
                setForm((prev) => ({ ...prev, productLineId }))
              }
              accessibilityLabel="Product trial evidence run product line id"
              placeholder="Product line ID"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={form.batchId}
              onChangeText={(batchId) => setForm((prev) => ({ ...prev, batchId }))}
              accessibilityLabel="Product trial evidence run batch id"
              placeholder="Product batch ID"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        ) : null}
        <TextInput
          value={form.measurementPlan}
          onChangeText={(measurementPlan) =>
            setForm((prev) => ({ ...prev, measurementPlan }))
          }
          accessibilityLabel="Product trial evidence run measurement plan"
          multiline
          placeholder="Measurement plan: pH/EC, vigor, diagnosis, steering, harvest, dry/cure, final quality"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.notes}
          onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))}
          accessibilityLabel="Product trial evidence run notes"
          multiline
          placeholder="Notes and public-share context"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.sharePicker}>
          <Text style={styles.selectorLabel}>Public share status</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Product trial evidence run public share status"
            style={styles.shareChoices}
          >
            {SHARE_STATUS_CHOICES.map((choice) => (
              <Pressable
                key={choice.id}
                accessibilityRole="radio"
                accessibilityLabel={`Public share status: ${choice.label}`}
                accessibilityState={{ checked: form.publicShareStatus === choice.id }}
                onPress={() =>
                  setForm((prev) => ({ ...prev, publicShareStatus: choice.id }))
                }
                style={[
                  styles.shareChoice,
                  form.publicShareStatus === choice.id && styles.selectedAction
                ]}
              >
                <Text style={styles.actionText}>{choice.label}</Text>
                <Text style={styles.choiceHelp}>{choice.help}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create product trial evidence run"
            disabled={saving || !form.name.trim()}
            onPress={submitGrow}
            style={[
              styles.primaryAction,
              saving || !form.name.trim() ? styles.disabled : null
            ]}
          >
            <Text style={styles.primaryActionText}>
              {saving ? "Creating..." : "Create Evidence Run"}
            </Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Current product trial evidence runs
        </Text>
        {grows.length ? (
          <View style={styles.list}>
            {grows.map((grow) => (
              <View key={growId(grow)} style={styles.growRow}>
                <Text accessibilityRole="header" aria-level={3} style={styles.growTitle}>
                  {grow.name || grow.growName}
                </Text>
                <Text style={styles.growMeta}>
                  {[
                    grow.purpose,
                    grow.cropType,
                    grow.cultivar,
                    grow.status || "active",
                    grow.publicShareStatus
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </Text>
                {grow.productId || grow.productLineId || grow.batchId ? (
                  <Text style={styles.growMeta}>
                    Linked evidence:{" "}
                    {[
                      grow.productId && `product ${grow.productId}`,
                      grow.productLineId && `line ${grow.productLineId}`,
                      grow.batchId && `batch ${grow.batchId}`
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}
                {grow.measurementPlan ? (
                  <Text style={styles.growBody}>{grow.measurementPlan}</Text>
                ) : null}
                <View style={styles.actions}>
                  <ActionLink
                    href={`/home/commercial/evidence-runs/${encodeURIComponent(String(growId(grow)))}`}
                    label="Open Detail"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No product trial evidence runs yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Advanced planning tools
        </Text>
        <Text style={styles.body}>
          Commercial users should not lose Pro grow behavior. Evidence runs remain the
          evidence anchor for plant records, logs, tool runs, tasks, photos, and reports
          when commercial proof is needed.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Open Product Trials" />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Evidence-to-claim guardrails
        </Text>
        <Text style={styles.body}>
          Evidence runs add product, batch, formula, and public-report context on top of
          the connected run workspace. The private evidence-run record remains the source
          of truth.
        </Text>
        <Text style={styles.bullet}>
          Link product/product line/batch/formula before the trial starts
        </Text>
        <Text style={styles.bullet}>
          Use grow logs, photos, pH/EC checks, diagnosis, steering, harvest, and dry/cure
          records as evidence
        </Text>
        <Text style={styles.bullet}>
          Create feed campaigns, course lessons, or storefront proof only from saved
          evidence-run records
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Trial setup checklist
        </Text>
        <Text style={styles.body}>
          A commercial trial should start with enough context to compare results later.
          Missing setup context makes public claims weaker.
        </Text>
        <Text style={styles.bullet}>Product or product line being tested</Text>
        <Text style={styles.bullet}>Batch/formula/recipe version used</Text>
        <Text style={styles.bullet}>
          Crop, cultivar/pheno, medium, plant count, and start stage
        </Text>
        <Text style={styles.bullet}>
          Measurement plan: pH/EC, vigor, diagnosis, steering, harvest, dry/cure, final
          quality
        </Text>
        <Text style={styles.bullet}>
          Whether this is private, public-share-ready, or evidence-building only
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
  accountLine: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 8
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
  pickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  recordPicker: {
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 250,
    padding: 9
  },
  emptyPicker: { alignItems: "flex-start", gap: 8 },
  selectorLabel: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  selectorActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  advancedToggle: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 2,
    paddingVertical: 4
  },
  advancedToggleText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
    textDecorationLine: "underline"
  },
  sharePicker: {
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 10,
    padding: 10
  },
  shareChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  shareChoice: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: 220,
    flexGrow: 1,
    padding: 10
  },
  choiceHelp: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4
  },
  primaryAction: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
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
  growRow: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  growTitle: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900"
  },
  growMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  growBody: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
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
