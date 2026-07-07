import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link } from "expo-router";

import {
  createProductTrial,
  fetchProductTrials,
  type ProductTrial
} from "@/api/commercialWorkflows";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";

type AnyRec = Record<string, any>;

function idOf(item: AnyRec, index: number) {
  return String(item.id ?? item._id ?? `trial-${index}`);
}

export default function CommercialTrialsRoute() {
  const [trials, setTrials] = useState<ProductTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");

  const [trialName, setTrialName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [productId, setProductId] = useState("");
  const [productLineId, setProductLineId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [growId, setGrowId] = useState("");
  const [cropType, setCropType] = useState("");
  const [cultivar, setCultivar] = useState("");
  const [plantCount, setPlantCount] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrials(await fetchProductTrials());
    } catch (err) {
      setError(err);
      setTrials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTrial() {
    const name = trialName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError(null);
    setFeedback("");
    try {
      const created = await createProductTrial({
        trialName: name,
        purpose: purpose.trim() || undefined,
        productId: productId.trim() || undefined,
        productLineId: productLineId.trim() || undefined,
        batchId: batchId.trim() || undefined,
        growId: growId.trim() || undefined,
        cropType: cropType.trim() || undefined,
        cultivar: cultivar.trim() || undefined,
        plantCount: plantCount ? Number(plantCount) : undefined,
        notes: notes.trim() || undefined,
        status: "planned"
      });
      setTrials((current) => [created, ...current].filter(Boolean));
      setTrialName("");
      setPurpose("");
      setProductId("");
      setProductLineId("");
      setBatchId("");
      setGrowId("");
      setCropType("");
      setCultivar("");
      setPlantCount("");
      setNotes("");
      setFeedback("Product trial created.");
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-trials"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial workspace</Text>
          <Text style={styles.title}>Product Trials</Text>
          <Text style={styles.subtitle}>
            Track product effectiveness over time by linking products, formulas, batches,
            and commercial grows.
          </Text>
          <View style={styles.headerActions}>
            <Link href="/home/personal/grows/new" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineText}>Create Personal Grow</Text>
              </Pressable>
            </Link>
            <Link href="/storefront" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineText}>Products</Text>
              </Pressable>
            </Link>
            <Link href="/home/commercial/batch-planner" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineText}>Batch Planner</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      }
    >
      {error ? <InlineError error={error} /> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <AppCard>
        <Text style={styles.cardTitle}>Create Product Trial</Text>
        <Text style={styles.body}>
          Trial record: connect CommercialProduct, ProductLine, SoilNutrientBatch, Recipe,
          and Grow records before using the result as public proof.
        </Text>
        <TextInput
          value={trialName}
          onChangeText={setTrialName}
          accessibilityLabel="Product trial name"
          placeholder="Seedling safety trial"
          style={styles.input}
        />
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          accessibilityLabel="Product trial purpose"
          placeholder="seedling_safety, veg_performance, flower_performance..."
          style={styles.input}
        />
        <View style={styles.grid}>
          <TextInput
            value={productId}
            onChangeText={setProductId}
            accessibilityLabel="Trial product id"
            placeholder="Product id"
            autoCapitalize="none"
            style={[styles.input, styles.gridInput]}
          />
          <TextInput
            value={productLineId}
            onChangeText={setProductLineId}
            accessibilityLabel="Trial product line id"
            placeholder="Product line id"
            autoCapitalize="none"
            style={[styles.input, styles.gridInput]}
          />
          <TextInput
            value={batchId}
            onChangeText={setBatchId}
            accessibilityLabel="Trial batch id"
            placeholder="Batch id"
            autoCapitalize="none"
            style={[styles.input, styles.gridInput]}
          />
          <TextInput
            value={growId}
            onChangeText={setGrowId}
            accessibilityLabel="Trial grow id"
            placeholder="Grow id"
            autoCapitalize="none"
            style={[styles.input, styles.gridInput]}
          />
        </View>
        <View style={styles.grid}>
          <TextInput
            value={cropType}
            onChangeText={setCropType}
            accessibilityLabel="Trial crop type"
            placeholder="Crop type"
            style={[styles.input, styles.gridInput]}
          />
          <TextInput
            value={cultivar}
            onChangeText={setCultivar}
            accessibilityLabel="Trial cultivar"
            placeholder="Cultivar"
            style={[styles.input, styles.gridInput]}
          />
          <TextInput
            value={plantCount}
            onChangeText={setPlantCount}
            accessibilityLabel="Trial plant count"
            placeholder="Plant count"
            keyboardType="numeric"
            style={[styles.input, styles.gridInput]}
          />
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Trial notes"
          placeholder="Measurement plan, controls, photos, pH/EC checks, harvest, dry/cure..."
          multiline
          style={[styles.input, styles.textArea]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create product trial"
          onPress={createTrial}
          disabled={!trialName.trim() || saving}
          style={[styles.primaryButton, (!trialName.trim() || saving) && styles.disabled]}
        >
          <Text style={styles.primaryText}>
            {saving ? "Creating..." : "Create Product Trial"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Product Trials</Text>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading product trials...</Text>
          </View>
        ) : trials.length ? (
          <View style={styles.list}>
            {trials.map((trial, index) => (
              <View key={idOf(trial, index)} style={styles.row}>
                <Text style={styles.rowTitle}>
                  {trial.trialName || trial.name || "Untitled trial"}
                </Text>
                <Text style={styles.muted}>
                  {[trial.purpose, trial.status || "planned"].filter(Boolean).join(" | ")}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {[
                    trial.productId && `Product ${trial.productId}`,
                    trial.batchId && `Batch ${trial.batchId}`,
                    trial.growId && `Grow ${trial.growId}`,
                    trial.cultivar
                  ]
                    .filter(Boolean)
                    .join(" | ") || "No linked evidence yet"}
                </Text>
                <View style={styles.headerActions}>
                  <Link
                    href={
                      `/home/commercial/trials/${encodeURIComponent(idOf(trial, index))}` as any
                    }
                    asChild
                  >
                    <Pressable style={styles.outlineButton}>
                      <Text style={styles.outlineText}>Open Detail</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No product trials yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Evidence collection loop</Text>
        <Text style={styles.body}>
          A trial should collect structured data through the same grow operating system
          used by Pro users, then attach those records to the product/product line before
          anything becomes marketing proof.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Link batch/formula/product to grow before use</Text>
          <Text style={styles.bullet}>
            Log application date, stage, plant count, medium, and cultivar
          </Text>
          <Text style={styles.bullet}>
            Attach pH/EC checks, diagnosis, crop steering, photos, harvest, and dry/cure
            records
          </Text>
          <Text style={styles.bullet}>
            Run Comparison when there is previous-run or control data
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Claim guard</Text>
        <Text style={styles.body}>
          Commercial trial summaries must not overclaim. Separate observed results,
          cautious interpretation, missing data, and marketing-safe public copy.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Observed: what was measured or logged</Text>
          <Text style={styles.bullet}>
            Interpretation: may have contributed, associated with, lower confidence
          </Text>
          <Text style={styles.bullet}>
            Limitations: missing controls, cultivar differences, short sample size
          </Text>
          <Text style={styles.bullet}>
            Publish only claims supported by saved evidence
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Publishable result</Text>
        <Text style={styles.body}>
          When a trial has enough evidence, create a feed campaign, storefront proof
          point, course lesson, or Forum/Q&A support answer from the trial summary.
        </Text>
        <View style={styles.headerActions}>
          <Link href="/home/commercial/feed" asChild>
            <Pressable style={styles.outlineButton}>
              <Text style={styles.outlineText}>Create Feed Campaign</Text>
            </Pressable>
          </Link>
          <Link href="/home/commercial/storefront" asChild>
            <Pressable style={styles.outlineButton}>
              <Text style={styles.outlineText}>Open Storefront</Text>
            </Pressable>
          </Link>
        </View>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#475569", lineHeight: 21 },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  outlineButton: {
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  outlineText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", lineHeight: 20, marginTop: 8 },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15,23,42,0.14)",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: { minHeight: 86, textAlignVertical: "top" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridInput: { flexBasis: "31%", flexGrow: 1, minWidth: 150 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 12
  },
  primaryText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  loading: { alignItems: "center", gap: 8, paddingVertical: 12 },
  muted: { color: "#64748B", fontWeight: "700" },
  list: { gap: 10, marginTop: 10 },
  row: {
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12
  },
  rowTitle: { color: "#0F172A", fontSize: 15, fontWeight: "900" },
  bullets: { gap: 6, marginTop: 10 },
  bullet: { color: "#334155", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  feedback: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    color: "#166534",
    fontWeight: "900",
    padding: 10
  }
});
