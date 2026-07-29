import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  applyStorefrontImport,
  previewStorefrontImport,
  StorefrontImportBatch
} from "@/api/storefrontImports";
import { uploadCourseMedia } from "@/api/uploads";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";
import { parseStorefrontCsv } from "@/utils/storefrontCsvImport";

function batchId(batch: StorefrontImportBatch | null) {
  return String(batch?.id || batch?._id || "");
}

export default function StorefrontProductImportRoute() {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [sourceName, setSourceName] = useState("storefront-products.csv");
  const [batch, setBatch] = useState<StorefrontImportBatch | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [rowFilter, setRowFilter] = useState<"all" | "ready" | "needs-work">("all");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
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

  async function preview(text = csvText, name = sourceName) {
    setBusy(true);
    setFeedback("");
    try {
      const rows = parseStorefrontCsv(text);
      const result = await previewStorefrontImport({
        format: "csv",
        sourceName: name,
        rows
      });
      setBatch(result);
      setSelected(
        result.rows
          .map((row, index) => (!row.errors.length && row.action !== "skip" ? index : -1))
          .filter((index) => index >= 0)
      );
      setFeedback(
        `Prepared ${result.rows.length} rows for review. Nothing has been published.`
      );
    } catch (error: any) {
      setFeedback(error?.message || "Unable to preview storefront import.");
    } finally {
      setBusy(false);
    }
  }

  async function pickCsv() {
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
    if (!asset) return;
    setSourceName(asset.name || "storefront-products.csv");
    if (asset.file && typeof asset.file.text === "function") {
      const text = await asset.file.text();
      setCsvText(text);
      await preview(text, asset.name || "storefront-products.csv");
    } else {
      Alert.alert(
        "Paste CSV",
        "This device cannot read the selected file directly yet. Paste its CSV text below."
      );
    }
  }

  async function pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: false,
      copyToCacheDirectory: true
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    setBusy(true);
    setFeedback("Uploading and extracting PDF catalog items...");
    try {
      const uploaded: any = await uploadCourseMedia(asset);
      const extracted = await previewStorefrontImport({
        format: "pdf",
        sourceName: asset.name || "storefront-catalog.pdf",
        sourceUrl: uploaded?.url
      });
      setBatch(extracted);
      setSelected(
        extracted.rows
          .map((row, index) => (!row.errors.length && row.action !== "skip" ? index : -1))
          .filter((index) => index >= 0)
      );
      setFeedback(
        `AI extracted ${extracted.rows.length} proposed products. Verify every row against the PDF before creating drafts.`
      );
    } catch (error: any) {
      setFeedback(error?.message || "Unable to extract the PDF catalog.");
    } finally {
      setBusy(false);
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
    if (!id || !selected.length) return;
    setBusy(true);
    try {
      const result: any = await applyStorefrontImport(id, selected);
      setBatch(result?.importBatch || batch);
      setFeedback(
        `Created or updated ${result?.products?.length || 0} draft products. Review them before publishing.`
      );
    } catch (error: any) {
      setFeedback(error?.message || "Unable to apply storefront import.");
    } finally {
      setBusy(false);
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
      <AppCard>
        <Text style={styles.cardTitle}>CSV import</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={pickCsv} style={styles.button}>
            <Text style={styles.buttonText}>Choose CSV File</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Paste storefront CSV"
          multiline
          onChangeText={setCsvText}
          placeholder="Paste CSV here for browsers/devices that cannot read the selected file"
          style={styles.csvInput}
          value={csvText}
        />
        <Pressable
          accessibilityRole="button"
          disabled={busy || !csvText.trim()}
          onPress={() => preview()}
          style={[styles.button, (busy || !csvText.trim()) && styles.disabled]}
        >
          <Text style={styles.buttonText}>{busy ? "Working..." : "Preview Import"}</Text>
        </Pressable>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
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
                onPress={() => setRowFilter(filter)}
                style={[
                  styles.filterButton,
                  rowFilter === filter && styles.filterSelected
                ]}
              >
                <Text style={styles.secondaryText}>
                  {filter === "all" ? "All" : filter === "ready" ? "Ready" : "Needs work"}
                </Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected(readyIndexes)}
              style={styles.filterButton}
            >
              <Text style={styles.secondaryText}>Select all eligible</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelected([])}
              style={styles.filterButton}
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
                disabled: Boolean(row.errors.length)
              }}
              disabled={Boolean(row.errors.length)}
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
              onPress={() => router.push("/home/commercial/products")}
              style={styles.secondaryButton}
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

const styles = StyleSheet.create({
  title: { color: "#111827", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  cardTitle: { color: "#111827", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  csvInput: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 150,
    padding: 12,
    textAlignVertical: "top"
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  button: {
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  secondaryText: { color: "#166534", fontWeight: "800" },
  filterButton: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  filterSelected: { backgroundColor: "#DCFCE7", borderColor: "#166534" },
  disabled: { opacity: 0.45 },
  feedback: { color: "#166534", marginTop: 10 },
  row: {
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 8,
    padding: 12
  },
  selected: { backgroundColor: "#F0FDF4", borderColor: "#166534" },
  rowTitle: { color: "#111827", fontWeight: "800" },
  meta: { color: "#64748B", lineHeight: 19, marginTop: 4 },
  error: { color: "#B91C1C", marginTop: 4 },
  warning: { color: "#92400E", marginTop: 4 }
});
