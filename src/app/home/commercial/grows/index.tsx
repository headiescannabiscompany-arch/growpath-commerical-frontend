import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  CommercialGrow,
  createCommercialGrow,
  fetchCommercialGrows
} from "@/api/commercialWorkflows";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";

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

export default function CommercialGrowsRoute() {
  const auth = useAuth();
  const ent = useEntitlements();
  const [grows, setGrows] = useState<CommercialGrow[]>([]);
  const [form, setForm] = useState<GrowForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const activeCount = useMemo(
    () => grows.filter((grow) => (grow.status || "active") === "active").length,
    [grows]
  );
  const publicReadyCount = useMemo(
    () => grows.filter((grow) => grow.publicShareStatus === "public_ready").length,
    [grows]
  );

  async function loadGrows() {
    setLoading(true);
    setError(null);
    try {
      setGrows(await fetchCommercialGrows());
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
      routeKey="commercial-grows"
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Product Trial Grows</Text>
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
            <ActionLink href="/home/personal/grows" label="Open Grow Workspace" />
            <ActionLink href="/home/commercial/trials" label="Product Trials" />
            <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Trial evidence workspace</Text>
        <Text style={styles.body}>
          Use product trial grows to track plants, logs, tasks, photos, diagnosis, crop
          steering, dry/cure, and run-to-run comparisons. Commercial metadata links the
          evidence back to products, formulas, batches, and trial reports.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{grows.length}</Text>
            <Text style={styles.metricLabel}>Trial grows</Text>
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
          <Text style={styles.muted}>Loading product trial grows...</Text>
        ) : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Create Product Trial Grow</Text>
        <Text style={styles.body}>
          Start with trial anchors, then add business context: product line, product,
          batch, formula version, purpose, and public-share intent.
        </Text>
        <View style={styles.formGrid}>
          <TextInput
            value={form.name}
            onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
            accessibilityLabel="Product trial grow name"
            placeholder="Trial grow name"
            style={styles.input}
          />
          <TextInput
            value={form.purpose}
            onChangeText={(purpose) => setForm((prev) => ({ ...prev, purpose }))}
            accessibilityLabel="Product trial grow purpose"
            placeholder="Purpose: product_trial, soil_trial, demo_grow..."
            style={styles.input}
          />
          <TextInput
            value={form.cropType}
            onChangeText={(cropType) => setForm((prev) => ({ ...prev, cropType }))}
            accessibilityLabel="Product trial grow crop type"
            placeholder="Crop type"
            style={styles.input}
          />
          <TextInput
            value={form.cultivar}
            onChangeText={(cultivar) => setForm((prev) => ({ ...prev, cultivar }))}
            accessibilityLabel="Product trial grow cultivar"
            placeholder="Cultivar / plant line"
            style={styles.input}
          />
          <TextInput
            value={form.medium}
            onChangeText={(medium) => setForm((prev) => ({ ...prev, medium }))}
            accessibilityLabel="Product trial grow medium"
            placeholder="Medium"
            style={styles.input}
          />
          <TextInput
            value={form.plantCount}
            onChangeText={(plantCount) => setForm((prev) => ({ ...prev, plantCount }))}
            accessibilityLabel="Product trial grow plant count"
            keyboardType="numeric"
            placeholder="Plant count"
            style={styles.input}
          />
          <TextInput
            value={form.productId}
            onChangeText={(productId) => setForm((prev) => ({ ...prev, productId }))}
            accessibilityLabel="Product trial grow product id"
            placeholder="Linked product ID"
            style={styles.input}
          />
          <TextInput
            value={form.productLineId}
            onChangeText={(productLineId) =>
              setForm((prev) => ({ ...prev, productLineId }))
            }
            accessibilityLabel="Product trial grow product line id"
            placeholder="Linked product line ID"
            style={styles.input}
          />
          <TextInput
            value={form.batchId}
            onChangeText={(batchId) => setForm((prev) => ({ ...prev, batchId }))}
            accessibilityLabel="Product trial grow batch id"
            placeholder="Linked batch ID"
            style={styles.input}
          />
          <TextInput
            value={form.formulaVersion}
            onChangeText={(formulaVersion) =>
              setForm((prev) => ({ ...prev, formulaVersion }))
            }
            accessibilityLabel="Product trial grow formula version"
            placeholder="Formula version"
            style={styles.input}
          />
        </View>
        <TextInput
          value={form.measurementPlan}
          onChangeText={(measurementPlan) =>
            setForm((prev) => ({ ...prev, measurementPlan }))
          }
          accessibilityLabel="Product trial grow measurement plan"
          multiline
          placeholder="Measurement plan: pH/EC, vigor, diagnosis, steering, harvest, dry/cure, final quality"
          style={[styles.input, styles.textArea]}
        />
        <TextInput
          value={form.notes}
          onChangeText={(notes) => setForm((prev) => ({ ...prev, notes }))}
          accessibilityLabel="Product trial grow notes"
          multiline
          placeholder="Notes and public-share context"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create product trial grow"
            disabled={saving || !form.name.trim()}
            onPress={submitGrow}
            style={[
              styles.primaryAction,
              saving || !form.name.trim() ? styles.disabled : null
            ]}
          >
            <Text style={styles.primaryActionText}>
              {saving ? "Creating..." : "Create Product Trial Grow"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle product trial grow public share status"
            onPress={() =>
              setForm((prev) => ({
                ...prev,
                publicShareStatus:
                  prev.publicShareStatus === "public_ready"
                    ? "private"
                    : prev.publicShareStatus === "private"
                      ? "evidence_building"
                      : "public_ready"
              }))
            }
            style={styles.action}
          >
            <Text style={styles.actionText}>Share: {form.publicShareStatus}</Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Current product trial grows</Text>
        {grows.length ? (
          <View style={styles.list}>
            {grows.map((grow) => (
              <View key={growId(grow)} style={styles.growRow}>
                <Text style={styles.growTitle}>{grow.name || grow.growName}</Text>
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
                    href={`/home/commercial/grows/${encodeURIComponent(String(growId(grow)))}`}
                    label="Open Detail"
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No product trial grows yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Pro workflow retained</Text>
        <Text style={styles.body}>
          Commercial users should not lose Pro grow behavior. Product trial grows remain
          the evidence anchor for plant records, logs, tool runs, tasks, photos, and
          reports when commercial proof is needed.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/personal/grows" label="Open grow list" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Product trial evidence layer</Text>
        <Text style={styles.body}>
          Product trial grows add product, batch, formula, and public-report context on
          top of the normal grow workspace. The private grow record remains the source of
          truth.
        </Text>
        <Text style={styles.bullet}>
          Link product/product line/batch/formula before the trial starts
        </Text>
        <Text style={styles.bullet}>
          Use grow logs, photos, pH/EC checks, diagnosis, steering, harvest, and dry/cure
          records as evidence
        </Text>
        <Text style={styles.bullet}>
          Create feed campaigns, course lessons, or storefront proof only from saved grow
          records
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/batch-planner" label="Batch Planner" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Trial setup checklist</Text>
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
  primaryAction: {
    backgroundColor: "#166534",
    borderRadius: 8,
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
    borderRadius: 8,
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
