import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  type TextInputProps,
  View
} from "react-native";
import { Link } from "expo-router";

import {
  createProductTrial,
  fetchProducts,
  fetchProductLines,
  fetchProductTrialEvidenceRuns,
  fetchProductTrials,
  fetchSoilNutrientBatches,
  type CommercialProduct,
  type ProductLine,
  type ProductTrial,
  type ProductTrialEvidenceRun,
  type SoilNutrientBatch
} from "@/api/commercialWorkflows";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";
import {
  purchaseIntentConceptById,
  purchaseIntentConcepts
} from "@/config/commerceConceptTrials";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function TextInput(props: TextInputProps) {
  const { palette } = useAppTheme();

  return (
    <NativeTextInput
      {...props}
      placeholderTextColor={palette.textMuted}
      selectionColor={palette.accent}
    />
  );
}

function idOf(item: AnyRec, index: number) {
  return String(item.id ?? item._id ?? `trial-${index}`);
}

function linkedEvidenceRunId(trial: ProductTrial) {
  return String(trial.growId ?? "").trim();
}

type RecordChoice = {
  id: string;
  label: string;
};

function recordId(record: AnyRec) {
  return String(record.id ?? record._id ?? "").trim();
}

function choice(
  record: AnyRec,
  index: number,
  labelKeys: string[],
  fallback: string
): RecordChoice | null {
  const id = recordId(record);
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
  disabled,
  label,
  onChange,
  selectedId
}: {
  choices: RecordChoice[];
  createHref: string;
  createLabel: string;
  disabled: boolean;
  label: string;
  onChange: (id: string) => void;
  selectedId: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialTrialsStyles(palette), [palette]);

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
            accessibilityState={{ checked: !selectedId, disabled }}
            disabled={disabled}
            onPress={() => onChange("")}
            style={[
              styles.outlineButton,
              !selectedId && styles.selectedButton,
              disabled && styles.disabled
            ]}
          >
            <Text style={styles.outlineText}>Not linked yet</Text>
          </Pressable>
          {choices.slice(0, 8).map((item) => (
            <Pressable
              key={`${label}-${item.id}`}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${item.label}`}
              accessibilityState={{ checked: selectedId === item.id, disabled }}
              disabled={disabled}
              onPress={() => onChange(item.id)}
              style={[
                styles.outlineButton,
                selectedId === item.id && styles.selectedButton,
                disabled && styles.disabled
              ]}
            >
              <Text style={styles.outlineText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.emptyPicker}>
          <Text style={styles.muted}>No saved {label.toLowerCase()} records yet.</Text>
          <Link href={createHref as any} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={createLabel}
              accessibilityState={{ disabled }}
              disabled={disabled}
              style={[styles.outlineButton, disabled && styles.disabled]}
            >
              <Text style={styles.outlineText}>{createLabel}</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </View>
  );
}

export default function CommercialTrialsRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialTrialsStyles(palette), [palette]);
  const [trials, setTrials] = useState<ProductTrial[]>([]);
  const [products, setProducts] = useState<CommercialProduct[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [batches, setBatches] = useState<SoilNutrientBatch[]>([]);
  const [evidenceRuns, setEvidenceRuns] = useState<ProductTrialEvidenceRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conceptSaving, setConceptSaving] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);
  const [saveError, setSaveError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [showAdvancedRecordIds, setShowAdvancedRecordIds] = useState(false);
  const loadInFlightRef = useRef(false);
  const createInFlightRef = useRef(false);
  const conceptCreateInFlightRef = useRef(false);

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
  const [selectedConceptId, setSelectedConceptId] = useState(
    "growpathai-hat-circuit-leaf-midnight-purchase-intent-trial"
  );
  const [candidatePrice, setCandidatePrice] = useState("");
  const canCreate = trialName.trim().length > 1 && !saving && !conceptSaving;
  const selectedConcept = purchaseIntentConceptById(selectedConceptId);
  const parsedCandidatePrice = Number(candidatePrice);
  const canCreateConceptTrial =
    selectedConcept?.artworkApprovalStatus === "owner_approved" &&
    Number.isFinite(parsedCandidatePrice) &&
    parsedCandidatePrice > 0 &&
    !conceptSaving;

  const load = useCallback(async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const [nextTrials, nextProducts, nextLines, nextBatches, nextEvidenceRuns] =
        await Promise.all([
          fetchProductTrials(),
          fetchProducts(),
          fetchProductLines(),
          fetchSoilNutrientBatches(),
          fetchProductTrialEvidenceRuns()
        ]);
      setTrials(nextTrials);
      setProducts(nextProducts);
      setProductLines(nextLines);
      setBatches(nextBatches);
      setEvidenceRuns(nextEvidenceRuns);
    } catch (err) {
      setLoadError(err);
      setTrials([]);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const productChoices = products
    .map((record, index) => choice(record, index, ["name"], "Product"))
    .filter((item): item is RecordChoice => !!item);
  const productLineChoices = productLines
    .map((record, index) => choice(record, index, ["name"], "Product line"))
    .filter((item): item is RecordChoice => !!item);
  const batchChoices = batches
    .map((record, index) =>
      choice(record, index, ["batchName", "name", "batchCode"], "Batch")
    )
    .filter((item): item is RecordChoice => !!item);
  const evidenceRunChoices = evidenceRuns
    .map((record, index) =>
      choice(record, index, ["name", "growName", "cultivar"], "Evidence run")
    )
    .filter((item): item is RecordChoice => !!item);

  async function createTrial() {
    const name = trialName.trim();
    if (name.length < 2 || createInFlightRef.current || conceptSaving) return;
    const parsedPlantCount = plantCount.trim() ? Number(plantCount) : undefined;
    if (
      parsedPlantCount !== undefined &&
      (!Number.isInteger(parsedPlantCount) || parsedPlantCount < 1)
    ) {
      setSaveError(new Error("Plant count must be a whole number greater than zero."));
      return;
    }
    createInFlightRef.current = true;
    setSaving(true);
    setSaveError(null);
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
        plantCount: parsedPlantCount,
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
      setSaveError(err);
    } finally {
      createInFlightRef.current = false;
      setSaving(false);
    }
  }

  async function createConceptTrial() {
    if (!selectedConcept || conceptCreateInFlightRef.current || saving) return;
    if (selectedConcept.artworkApprovalStatus !== "owner_approved") {
      setSaveError(
        new Error("Approve this exact artwork before starting a public concept trial.")
      );
      return;
    }
    if (!Number.isFinite(parsedCandidatePrice) || parsedCandidatePrice <= 0) {
      setSaveError(new Error("Enter a positive hypothetical price for the trial."));
      return;
    }
    conceptCreateInFlightRef.current = true;
    setConceptSaving(true);
    setSaveError(null);
    setFeedback("");
    try {
      const displayedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(parsedCandidatePrice);
      const created = await createProductTrial({
        trialName: `${selectedConcept.title} purchase-intent trial`,
        name: selectedConcept.title,
        purpose: "purchase_intent",
        trialType: "purchase_intent_concept",
        conceptAssetId: selectedConcept.id,
        conceptTitle: selectedConcept.title,
        conceptImageAlt: selectedConcept.imageAlt,
        question: `Would you buy this hat for ${displayedPrice}?`,
        candidatePrice: parsedCandidatePrice,
        priceCurrency: "USD",
        publicTrial: true,
        ownerApprovedArtwork: true,
        rightsReviewStatus: selectedConcept.rightsReviewStatus,
        itemForSale: false,
        saleEnabled: false,
        responseCreatesOrder: false,
        status: "active",
        notes:
          "Concept trial only — not for sale. Responses record purchase interest and do not create orders. Available inventory: 0."
      });
      setTrials((current) => [created, ...current].filter(Boolean));
      setCandidatePrice("");
      setFeedback(
        "Purchase-intent concept trial started. It is not a product listing and cannot accept orders or payment."
      );
    } catch (err) {
      setSaveError(err);
    } finally {
      conceptCreateInFlightRef.current = false;
      setConceptSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-trials"
      backFallbackHref="/home/commercial/more"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial workspace</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Product Trials
          </Text>
          <Text style={styles.subtitle}>
            Track product effectiveness over time by linking products, formulas, batches,
            and product trial evidence runs.
          </Text>
          <View style={styles.headerActions}>
            <Link href="/home/commercial/evidence-runs/new" asChild>
              <Pressable style={styles.outlineButton}>
                <Text style={styles.outlineText}>Create Evidence Run</Text>
              </Pressable>
            </Link>
            <Link href="/home/commercial/products" asChild>
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
      {loadError ? (
        <View accessibilityLiveRegion="assertive" style={styles.errorPanel}>
          <InlineError error={loadError} />
          <Pressable
            accessibilityLabel="Retry product trials"
            accessibilityRole="button"
            disabled={loading}
            onPress={load}
            style={[styles.outlineButton, loading && styles.disabled]}
          >
            <Text style={styles.outlineText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.feedback}
        >
          {feedback}
        </Text>
      ) : null}

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Test a hat concept
        </Text>
        <Text style={styles.body}>
          Ask whether people would buy one exact concept at a hypothetical price. This is
          research only: inventory stays at zero and no answer creates a reservation,
          order, checkout, payment, production promise, or shipping promise.
        </Text>
        <View style={styles.conceptGrid}>
          {purchaseIntentConcepts.map((concept) => {
            const approved = concept.artworkApprovalStatus === "owner_approved";
            const selected = selectedConceptId === concept.id;
            return (
              <Pressable
                key={concept.id}
                accessibilityRole="radio"
                accessibilityLabel={`${concept.title}${
                  approved ? "" : ", final artwork approval required"
                }`}
                accessibilityState={{
                  checked: selected,
                  disabled: !approved || conceptSaving
                }}
                disabled={!approved || conceptSaving}
                onPress={() => setSelectedConceptId(concept.id)}
                style={[
                  styles.conceptCard,
                  selected && styles.selectedButton,
                  (!approved || conceptSaving) && styles.disabled
                ]}
              >
                <Image
                  source={concept.image}
                  accessibilityLabel={concept.imageAlt}
                  resizeMode="contain"
                  style={styles.conceptImage}
                />
                <Text style={styles.rowTitle}>{concept.title}</Text>
                <Text style={styles.muted}>
                  {approved
                    ? "Owner-approved trial artwork"
                    : "Needs final owner approval"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={candidatePrice}
          onChangeText={setCandidatePrice}
          accessibilityLabel="Hypothetical hat trial price in US dollars"
          editable={!conceptSaving}
          placeholder="Hypothetical price, for example 34.00"
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <Text style={styles.disclosure}>
          Public wording: “Would you buy this hat for the shown price?” followed by
          “Concept trial only — not for sale.”
        </Text>
        {conceptSaving ? (
          <View
            accessibilityLabel="Creating purchase-intent concept trial in progress"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Starting concept trial...</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start purchase-intent hat concept trial"
          accessibilityState={{ disabled: !canCreateConceptTrial, busy: conceptSaving }}
          disabled={!canCreateConceptTrial}
          onPress={() => void createConceptTrial()}
          style={[styles.primaryButton, !canCreateConceptTrial && styles.disabled]}
        >
          <Text style={styles.primaryText}>
            {conceptSaving ? "Starting..." : "Start Not-for-Sale Concept Trial"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Create Product Trial
        </Text>
        <Text style={styles.body}>
          Trial record: connect CommercialProduct, ProductLine, SoilNutrientBatch, Recipe,
          and an underlying evidence run before using the result as public proof.
        </Text>
        <TextInput
          value={trialName}
          onChangeText={setTrialName}
          accessibilityLabel="Product trial name"
          editable={!saving}
          placeholder="Seedling safety trial"
          style={styles.input}
        />
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          accessibilityLabel="Product trial purpose"
          editable={!saving}
          placeholder="seedling_safety, veg_performance, flower_performance..."
          style={styles.input}
        />
        <View style={styles.pickerGrid}>
          <RecordPicker
            disabled={saving}
            label="Trial product"
            choices={productChoices}
            selectedId={productId}
            onChange={setProductId}
            createHref="/home/commercial/products/new"
            createLabel="Create Product"
          />
          <RecordPicker
            disabled={saving}
            label="Trial product line"
            choices={productLineChoices}
            selectedId={productLineId}
            onChange={setProductLineId}
            createHref="/home/commercial/product-lines"
            createLabel="Create Product Line"
          />
          <RecordPicker
            disabled={saving}
            label="Trial batch"
            choices={batchChoices}
            selectedId={batchId}
            onChange={setBatchId}
            createHref="/home/commercial/batch-planner"
            createLabel="Create Product Batch"
          />
          <RecordPicker
            disabled={saving}
            label="Trial evidence run"
            choices={evidenceRunChoices}
            selectedId={growId}
            onChange={setGrowId}
            createHref="/home/commercial/evidence-runs/new"
            createLabel="Create Evidence Run"
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            showAdvancedRecordIds
              ? "Hide advanced trial record ID fields"
              : "Show advanced trial record ID fields"
          }
          accessibilityState={{ expanded: showAdvancedRecordIds }}
          disabled={saving}
          onPress={() => setShowAdvancedRecordIds((current) => !current)}
          style={[styles.advancedToggle, saving && styles.disabled]}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvancedRecordIds
              ? "Hide advanced record IDs"
              : "Use advanced record IDs"}
          </Text>
        </Pressable>
        {showAdvancedRecordIds ? (
          <View style={styles.grid}>
            <TextInput
              value={productId}
              onChangeText={setProductId}
              accessibilityLabel="Trial product id"
              editable={!saving}
              placeholder="Product id"
              autoCapitalize="none"
              style={[styles.input, styles.gridInput]}
            />
            <TextInput
              value={productLineId}
              onChangeText={setProductLineId}
              accessibilityLabel="Trial product line id"
              editable={!saving}
              placeholder="Product line id, or choose below"
              autoCapitalize="none"
              style={[styles.input, styles.gridInput]}
            />
            <TextInput
              value={batchId}
              onChangeText={setBatchId}
              accessibilityLabel="Trial batch id"
              editable={!saving}
              placeholder="Batch id"
              autoCapitalize="none"
              style={[styles.input, styles.gridInput]}
            />
            <TextInput
              value={growId}
              onChangeText={setGrowId}
              accessibilityLabel="Trial evidence run id"
              editable={!saving}
              placeholder="Evidence run id"
              autoCapitalize="none"
              style={[styles.input, styles.gridInput]}
            />
          </View>
        ) : null}
        <View style={styles.grid}>
          <TextInput
            value={cropType}
            onChangeText={setCropType}
            accessibilityLabel="Trial crop type"
            editable={!saving}
            placeholder="Crop type"
            style={[styles.input, styles.gridInput]}
          />
          <TextInput
            value={cultivar}
            onChangeText={setCultivar}
            accessibilityLabel="Trial cultivar"
            editable={!saving}
            placeholder="Cultivar"
            style={[styles.input, styles.gridInput]}
          />
          <TextInput
            value={plantCount}
            onChangeText={setPlantCount}
            accessibilityLabel="Trial plant count"
            editable={!saving}
            placeholder="Plant count"
            keyboardType="numeric"
            style={[styles.input, styles.gridInput]}
          />
        </View>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Trial notes"
          editable={!saving}
          placeholder="Measurement plan, controls, photos, pH/EC checks, harvest, dry/cure..."
          multiline
          style={[styles.input, styles.textArea]}
        />
        {saving ? (
          <View
            accessibilityLabel="Creating product trial in progress"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Creating product trial...</Text>
          </View>
        ) : null}
        {saveError ? (
          <View accessible accessibilityLiveRegion="assertive" accessibilityRole="alert">
            <InlineError error={saveError} />
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create product trial"
          onPress={createTrial}
          accessibilityState={{ disabled: !canCreate, busy: saving }}
          disabled={!canCreate}
          style={[styles.primaryButton, !canCreate && styles.disabled]}
        >
          <Text style={styles.primaryText}>
            {saving ? "Creating..." : "Create Product Trial"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Product Trials
        </Text>
        {loading ? (
          <View
            accessibilityLabel="Loading product trials"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading product trials...</Text>
          </View>
        ) : trials.length ? (
          <View style={styles.list}>
            {trials.map((trial, index) => {
              const evidenceRunId = linkedEvidenceRunId(trial);
              return (
                <View key={idOf(trial, index)} style={styles.row}>
                  <Text accessibilityRole="header" aria-level={3} style={styles.rowTitle}>
                    {trial.trialName || trial.name || "Untitled trial"}
                  </Text>
                  <Text style={styles.muted}>
                    {[trial.purpose, trial.status || "planned"]
                      .filter(Boolean)
                      .join(" | ")}
                  </Text>
                  <Text style={styles.body} numberOfLines={2}>
                    {[
                      trial.productId && `Product ${trial.productId}`,
                      trial.batchId && `Batch ${trial.batchId}`,
                      evidenceRunId && `Evidence run ${evidenceRunId}`,
                      trial.cultivar
                    ]
                      .filter(Boolean)
                      .join(" | ") || "No linked evidence yet"}
                  </Text>
                  <View style={styles.headerActions}>
                    <Link
                      href={
                        `/home/commercial/trials/${encodeURIComponent(
                          idOf(trial, index)
                        )}` as any
                      }
                      asChild
                    >
                      <Pressable style={styles.outlineButton}>
                        <Text style={styles.outlineText}>Open Detail</Text>
                      </Pressable>
                    </Link>
                    {evidenceRunId ? (
                      <Link
                        href={
                          `/home/commercial/evidence-runs/${encodeURIComponent(
                            evidenceRunId
                          )}` as any
                        }
                        asChild
                      >
                        <Pressable style={styles.outlineButton}>
                          <Text style={styles.outlineText}>Open Evidence Run</Text>
                        </Pressable>
                      </Link>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.muted}>No product trials yet.</Text>
        )}
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Evidence collection loop
        </Text>
        <Text style={styles.body}>
          A trial should collect structured data through the same evidence-run operating
          system used by Pro users, then attach those records to the product/product line
          before anything becomes marketing proof.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            Link batch/formula/product to an evidence run before use
          </Text>
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
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Claim guard
        </Text>
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
        <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
          Publishable result
        </Text>
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

export function createCommercialTrialsStyles(palette: ThemePalette) {
  return StyleSheet.create({
    header: { gap: 8 },
    kicker: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 28, fontWeight: "900" },
    subtitle: { color: palette.textSoft, lineHeight: 21 },
    headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
    outlineButton: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    selectedButton: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    outlineText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    cardTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    body: { color: palette.textSoft, lineHeight: 20, marginTop: 8 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    textArea: { minHeight: 86, textAlignVertical: "top" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    gridInput: { flexBasis: "31%", flexGrow: 1, minWidth: 150 },
    pickerGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 10
    },
    conceptGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 12
    },
    conceptCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: "47%",
      flexGrow: 1,
      gap: 8,
      minWidth: 260,
      padding: 10
    },
    conceptImage: {
      aspectRatio: 4 / 3,
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      width: "100%"
    },
    disclosure: {
      color: palette.textMuted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8
    },
    recordPicker: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: "47%",
      flexGrow: 1,
      minWidth: 240,
      padding: 10
    },
    emptyPicker: { alignItems: "flex-start", gap: 8, marginTop: 8 },
    selectorLabel: {
      color: palette.link,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    selectorActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    advancedToggle: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingHorizontal: 4,
      paddingVertical: 8
    },
    advancedToggleText: {
      color: palette.link,
      fontSize: 13,
      fontWeight: "900",
      textDecorationLine: "underline"
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 12,
      paddingVertical: 12
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    loading: { alignItems: "center", gap: 8, paddingVertical: 12 },
    muted: { color: palette.textMuted, fontWeight: "700" },
    list: { gap: 10, marginTop: 10 },
    row: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    rowTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    bullets: { gap: 6, marginTop: 10 },
    bullet: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19
    },
    feedback: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      color: palette.success,
      fontWeight: "900",
      padding: 10
    },
    errorPanel: { alignItems: "flex-start", gap: 8 }
  });
}
