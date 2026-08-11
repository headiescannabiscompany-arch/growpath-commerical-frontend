import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  applyStorefrontImport,
  previewStorefrontImport,
  StorefrontImportBatch
} from "@/api/storefrontImports";
import { uploadCourseMedia } from "@/api/uploads";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { parseStorefrontCsv } from "@/utils/storefrontCsvImport";

function batchId(batch: StorefrontImportBatch | null) {
  return String(batch?.id || batch?._id || "");
}

export default function StorefrontProductImportRoute() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStorefrontProductImportStyles(palette), [palette]);
  const [csvText, setCsvText] = useState("");
  const [sourceName, setSourceName] = useState("storefront-products.csv");
  const [batch, setBatch] = useState<StorefrontImportBatch | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [rowFilter, setRowFilter] = useState<"all" | "ready" | "needs-work">("all");
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"success" | "error" | "info">("info");
  const requestInFlightRef = useRef(false);
  const indexedRows = (batch?.rows || []).map((row, index) => ({ row, index }));
  const readyIndexes = indexedRows
    .filter(({ row }) => !row.errors.length && row.action !== "skip")
    .map(({ index }) => index);
  const visibleRows = indexedRows.filter(({ row }) => {
    if (rowFilter === "ready") return !row.errors.length && !row.warnings.length;
    if (rowFilter === "needs-work")
      return Boolean(row.errors.length || row.warnings.length);
    return true;
  });

  function showFeedback(message: string, tone: "success" | "error" | "info") {
    setFeedback(message);
    setFeedbackTone(tone);
  }

  function applyPreviewResult(result: StorefrontImportBatch) {
    setBatch(result);
    setSelected(
      result.rows
        .map((row, index) => (!row.errors.length && row.action !== "skip" ? index : -1))
        .filter((index) => index >= 0)
    );
  }

  async function requestCsvPreview(text: string, name: string) {
    const rows = parseStorefrontCsv(text);
    const result = await previewStorefrontImport({
      format: "csv",
      sourceName: name,
      rows
    });
    applyPreviewResult(result);
    showFeedback(
      `Prepared ${result.rows.length} rows for review. Nothing has been published.`,
      "success"
    );
  }

  async function preview(text = csvText, name = sourceName) {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setBusy(true);
    setActiveAction("Preparing CSV preview");
    showFeedback("", "info");
    try {
      await requestCsvPreview(text, name);
    } catch (error: any) {
      showFeedback(error?.message || "Unable to preview storefront import.", "error");
    } finally {
      requestInFlightRef.current = false;
      setBusy(false);
      setActiveAction("");
    }
  }

  async function pickCsv() {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setBusy(true);
    setActiveAction("Opening CSV file");
    showFeedback("", "info");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "text/comma-separated-values",
          "application/vnd.ms-excel",
          "*/*"
        ],
        multiple: false,
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      const asset: any = result.assets?.[0];
      if (!asset) throw new Error("The selected CSV file could not be opened.");
      const nextSourceName = asset.name || "storefront-products.csv";
      setSourceName(nextSourceName);
      if (asset.file && typeof asset.file.text === "function") {
        setActiveAction("Preparing CSV preview");
        const text = await asset.file.text();
        setCsvText(text);
        await requestCsvPreview(text, nextSourceName);
      } else {
        showFeedback(
          "This device cannot read that selected file directly yet. Paste its CSV text below, then choose Preview Import.",
          "info"
        );
      }
    } catch (error: any) {
      showFeedback(error?.message || "Unable to open the CSV file.", "error");
    } finally {
      requestInFlightRef.current = false;
      setBusy(false);
      setActiveAction("");
    }
  }

  async function pickPdf() {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setBusy(true);
    setActiveAction("Opening PDF catalog");
    showFeedback("", "info");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: false,
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) throw new Error("The selected PDF catalog could not be opened.");
      setActiveAction("Uploading and extracting PDF catalog");
      const uploaded: any = await uploadCourseMedia(asset);
      const sourceUrl = String(uploaded?.url || "").trim();
      if (!sourceUrl) {
        throw new Error("The PDF uploaded, but no protected file URL was returned.");
      }
      const extracted = await previewStorefrontImport({
        format: "pdf",
        sourceName: asset.name || "storefront-catalog.pdf",
        sourceUrl
      });
      applyPreviewResult(extracted);
      showFeedback(
        `AI extracted ${extracted.rows.length} proposed products. Verify every row against the PDF before creating drafts.`,
        "success"
      );
    } catch (error: any) {
      showFeedback(error?.message || "Unable to extract the PDF catalog.", "error");
    } finally {
      requestInFlightRef.current = false;
      setBusy(false);
      setActiveAction("");
    }
  }

  function toggle(index: number) {
    setSelected((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index]
    );
  }

  async function applyDrafts() {
    const id = batchId(batch);
    if (!id || !selected.length || requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    setBusy(true);
    setActiveAction("Creating selected draft products");
    showFeedback("", "info");
    try {
      const result: any = await applyStorefrontImport(id, selected);
      setBatch(result?.importBatch || batch);
      showFeedback(
        `Created or updated ${result?.products?.length || 0} draft products. Review them before publishing.`,
        "success"
      );
    } catch (error: any) {
      showFeedback(error?.message || "Unable to apply storefront import.", "error");
    } finally {
      requestInFlightRef.current = false;
      setBusy(false);
      setActiveAction("");
    }
  }

  return (
    <AppPage
      routeKey="commercial-product-import"
      showBack
      backFallbackHref="/home/commercial/products"
      longContent
      header={
        <View>
          <Text style={styles.title}>Import storefront items</Text>
          <Text style={styles.subtitle}>
            Upload Shopify, WooCommerce, Square, or another CSV. Every result stays draft
            until you publish it.
          </Text>
        </View>
      }
    >
      {busy || feedback ? (
        <AppCard>
          {busy ? (
            <View
              accessibilityLabel={`${activeAction} in progress`}
              accessibilityLiveRegion="polite"
              accessibilityRole="progressbar"
              style={styles.progressRow}
            >
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.progressText}>{activeAction}...</Text>
            </View>
          ) : null}
          {feedback ? (
            <Text
              accessibilityLiveRegion={feedbackTone === "error" ? "assertive" : "polite"}
              accessibilityRole={feedbackTone === "error" ? "alert" : undefined}
              style={
                feedbackTone === "error"
                  ? styles.errorFeedback
                  : feedbackTone === "success"
                    ? styles.feedback
                    : styles.infoFeedback
              }
            >
              {feedback}
            </Text>
          ) : null}
        </AppCard>
      ) : null}
      <AppCard>
        <Text style={styles.cardTitle}>CSV import</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={pickCsv}
            style={[styles.button, busy && styles.disabled]}
          >
            <Text style={styles.buttonText}>Choose CSV File</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Paste storefront CSV"
          multiline
          onChangeText={setCsvText}
          placeholder="Paste CSV here for browsers/devices that cannot read the selected file"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          style={styles.csvInput}
          value={csvText}
          editable={!busy}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy || !csvText.trim()}
          onPress={() => preview()}
          style={[styles.button, (busy || !csvText.trim()) && styles.disabled]}
        >
          <Text style={styles.buttonText}>{busy ? "Working..." : "Preview Import"}</Text>
        </Pressable>
      </AppCard>
      {batch ? (
        <AppCard>
          <Text style={styles.cardTitle}>Review draft rows</Text>
          <Text style={styles.meta}>
            {batch.rows.length} products found · {readyIndexes.length} eligible for draft
            creation · {batch.rows.length - readyIndexes.length} blocked
          </Text>
          <View style={styles.actions}>
            {(["all", "ready", "needs-work"] as const).map((filter) => (
              <Pressable
                key={filter}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setRowFilter(filter)}
                style={[
                  styles.filterButton,
                  rowFilter === filter && styles.filterSelected,
                  busy && styles.disabled
                ]}
              >
                <Text style={styles.secondaryText}>
                  {filter === "all" ? "All" : filter === "ready" ? "Ready" : "Needs work"}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setSelected(readyIndexes)}
              style={[styles.filterButton, busy && styles.disabled]}
            >
              <Text style={styles.secondaryText}>Select all eligible</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setSelected([])}
              style={[styles.filterButton, busy && styles.disabled]}
            >
              <Text style={styles.secondaryText}>Clear selection</Text>
            </Pressable>
          </View>
          {visibleRows.map(({ row, index }) => (
            <Pressable
              key={`${row.sourceRow}-${index}`}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selected.includes(index),
                disabled: busy || Boolean(row.errors.length)
              }}
              disabled={busy || Boolean(row.errors.length)}
              onPress={() => toggle(index)}
              style={[styles.row, selected.includes(index) && styles.selected]}
            >
              <Text style={styles.rowTitle}>
                {row.draft.name || `CSV row ${row.sourceRow}`}
              </Text>
              <Text style={styles.meta}>
                {row.action.toUpperCase()} · {row.draft.sku || "No SKU"} · $
                {(Number(row.draft.priceCents || 0) / 100).toFixed(2)}{" "}
                {String(row.draft.currency || "usd").toUpperCase()}
              </Text>
              {row.errors.map((message) => (
                <Text key={message} style={styles.error}>
                  {message}
                </Text>
              ))}
              {row.warnings.map((message) => (
                <Text key={message} style={styles.warning}>
                  {message}
                </Text>
              ))}
            </Pressable>
          ))}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy || !selected.length}
              onPress={applyDrafts}
              style={[styles.button, (busy || !selected.length) && styles.disabled]}
            >
              <Text style={styles.buttonText}>Create Selected Drafts</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.push("/home/commercial/products")}
              style={[styles.secondaryButton, busy && styles.disabled]}
            >
              <Text style={styles.secondaryText}>Review Products</Text>
            </Pressable>
          </View>
        </AppCard>
      ) : null}
      <AppCard>
        <Text style={styles.cardTitle}>PDF catalog import</Text>
        <Text style={styles.meta}>
          Upload a catalog or menu. AI proposes draft rows; verify names, SKUs, prices,
          claims, and source pages before applying them. Nothing publishes automatically.
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={pickPdf}
          style={[styles.button, busy && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {busy ? "Working..." : "Choose PDF Catalog"}
          </Text>
        </Pressable>
      </AppCard>
    </AppPage>
  );
}

export function createStorefrontProductImportStyles(palette: ThemePalette) {
  return StyleSheet.create({
    title: { color: palette.text, fontSize: 26, fontWeight: "800" },
    subtitle: { color: palette.textSoft, marginTop: 4 },
    cardTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 10
    },
    csvInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 150,
      padding: 12,
      textAlignVertical: "top"
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
    button: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    buttonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    secondaryText: { color: palette.link, fontWeight: "800" },
    filterButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    filterSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    disabled: { opacity: 0.45 },
    feedback: { color: palette.success, marginTop: 10 },
    infoFeedback: { color: palette.textMuted, marginTop: 10 },
    errorFeedback: { color: palette.danger, marginTop: 10 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
    progressText: { color: palette.textMuted },
    row: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginTop: 8,
      padding: 12
    },
    selected: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    rowTitle: { color: palette.text, fontWeight: "800" },
    meta: { color: palette.textMuted, lineHeight: 19, marginTop: 4 },
    error: { color: palette.danger, marginTop: 4 },
    warning: { color: palette.warning, marginTop: 4 }
  });
}
