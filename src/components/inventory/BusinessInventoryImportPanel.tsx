import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  applyBusinessInventoryImport,
  getBusinessInventoryImport,
  InventoryImportRecord,
  InventoryWorkspace,
  previewBusinessInventoryImport,
  reviewBusinessInventoryImport,
  withdrawBusinessInventoryImport
} from "@/api/businessInventory";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { parseStorefrontCsv } from "@/utils/storefrontCsvImport";

type ConflictPolicy = "skip_existing" | "update_fields";
type QuantityMode = "receive" | "set_on_hand";
type InventoryMapping = {
  sku: string;
  name: string;
  quantity: string;
  unit: string;
  reorderPoint: string;
  category: string;
  vendor: string;
  locationId: string;
  authorizedUnitCost: string;
  currency: string;
  sourceFreshnessAt: string;
  lotCode: string;
  batchCode: string;
  receivedAt: string;
  expiresAt: string;
};

const MAPPING_FIELDS: Array<keyof InventoryMapping> = [
  "sku",
  "name",
  "quantity",
  "unit",
  "reorderPoint",
  "category",
  "vendor",
  "locationId",
  "authorizedUnitCost",
  "currency",
  "sourceFreshnessAt",
  "lotCode",
  "batchCode",
  "receivedAt",
  "expiresAt"
];

const MAPPING_LABELS: Record<keyof InventoryMapping, string> = {
  sku: "SKU",
  name: "Name",
  quantity: "Quantity",
  unit: "Unit",
  reorderPoint: "Reorder point",
  category: "Category",
  vendor: "Vendor",
  locationId: "Location",
  authorizedUnitCost: "Authorized unit cost",
  currency: "Currency",
  sourceFreshnessAt: "Source freshness date",
  lotCode: "Lot code",
  batchCode: "Batch code",
  receivedAt: "Received date",
  expiresAt: "Expiration date"
};

const DEFAULT_MAPPING: InventoryMapping = {
  sku: "sku",
  name: "name",
  quantity: "quantity",
  unit: "unit",
  reorderPoint: "reorderPoint",
  category: "category",
  vendor: "vendor",
  locationId: "locationId",
  authorizedUnitCost: "authorizedUnitCost",
  currency: "currency",
  sourceFreshnessAt: "sourceFreshnessAt",
  lotCode: "lotCode",
  batchCode: "batchCode",
  receivedAt: "receivedAt",
  expiresAt: "expiresAt"
};

function suggestedMapping(columns: string[]): InventoryMapping {
  const normalized = columns.map((column) => ({
    column,
    key: column.toLowerCase().replace(/[^a-z0-9]/g, "")
  }));
  const pick = (aliases: string[], fallback: string) =>
    normalized.find((entry) => aliases.includes(entry.key))?.column || fallback;
  return {
    sku: pick(["sku", "itemsku", "productsku"], "sku"),
    name: pick(["name", "itemname", "productname", "description"], "name"),
    quantity: pick(["quantity", "qty", "onhand", "quantityonhand", "stock"], "quantity"),
    unit: pick(["unit", "uom", "unitofmeasure"], ""),
    reorderPoint: pick(["reorderpoint", "reorder", "minimumstock", "minstock"], ""),
    category: pick(["category", "itemcategory", "productcategory"], ""),
    vendor: pick(["vendor", "supplier", "suppliername"], ""),
    locationId: pick(["locationid", "location", "storagelocation", "shelf"], ""),
    authorizedUnitCost: pick(
      ["authorizedunitcost", "unitcost", "cost", "knownunitcost"],
      ""
    ),
    currency: pick(["currency", "currencycode", "costcurrency"], ""),
    sourceFreshnessAt: pick(
      ["sourcefreshnessat", "sourceasof", "sourcedate", "freshnessdate"],
      ""
    ),
    lotCode: pick(["lotcode", "lot", "lotnumber"], ""),
    batchCode: pick(["batchcode", "batch", "batchnumber"], ""),
    receivedAt: pick(["receivedat", "receiveddate", "datereceived"], ""),
    expiresAt: pick(["expiresat", "expirationdate", "expirydate", "expiry"], "")
  };
}

function importId(record: InventoryImportRecord | null) {
  return String(record?.id || record?._id || "");
}

function duplicateImportId(error: any) {
  const codes = [
    error?.code,
    error?.data?.error?.code,
    error?.data?.code,
    error?.error?.code
  ].map((value) => String(value || ""));
  if (!codes.includes("DUPLICATE_IMPORT")) return "";
  return String(
    error?.data?.error?.importId ||
      error?.data?.importId ||
      error?.error?.importId ||
      error?.importId ||
      ""
  ).trim();
}

export function BusinessInventoryImportPanel({
  canWrite,
  onApplied,
  workspace
}: {
  canWrite: boolean;
  onApplied: () => Promise<void> | void;
  workspace: InventoryWorkspace;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const requestInFlight = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [sourceName, setSourceName] = useState("inventory.csv");
  const [record, setRecord] = useState<InventoryImportRecord | null>(null);
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>("skip_existing");
  const [quantityMode, setQuantityMode] = useState<QuantityMode>("receive");
  const [mapping, setMapping] = useState<InventoryMapping>(DEFAULT_MAPPING);
  const [reviewedSignature, setReviewedSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const selectionSignature = `${importId(record)}:${conflictPolicy}:${quantityMode}:${JSON.stringify(mapping)}`;
  const conflicts = Array.isArray(record?.rowSummary?.existingSkuConflicts)
    ? record!.rowSummary!.existingSkuConflicts!
    : [];
  const total = Number(record?.rowSummary?.total || record?.previewRows?.length || 0);
  const invalidRows = record?.rowSummary?.invalidRows || [];
  const duplicateSourceSkus = record?.rowSummary?.duplicateSourceSkus || [];
  const locationConflicts = record?.rowSummary?.locationConflicts || [];
  const unitConflicts = record?.rowSummary?.unitConflicts || [];
  const closedLotConflicts = record?.rowSummary?.closedLotConflicts || [];
  const appliedRowCount = Number(record?.rowSummary?.applied || 0);
  const requiresReview = Boolean(record?.rowSummary?.requiresReview);
  const hasBlockingSourceIssues = Boolean(
    invalidRows.length ||
    duplicateSourceSkus.length ||
    locationConflicts.length ||
    unitConflicts.length ||
    closedLotConflicts.length ||
    requiresReview
  );
  const recordLocked = Boolean(
    record && ["applying", "applied", "rejected"].includes(record.status)
  );
  // A stopped apply can return to review with some rows already committed. At that
  // point changing mapping or quantity semantics would make a retry inconsistent.
  const choicesLocked = recordLocked || appliedRowCount > 0;
  const canWithdraw = Boolean(record && ["preview", "conflict"].includes(record.status));
  const hiddenIssueSummary = [
    [conflicts, "existing SKU conflicts"],
    [invalidRows, "invalid rows"],
    [duplicateSourceSkus, "duplicate source SKUs"],
    [locationConflicts, "location conflicts"],
    [unitConflicts, "unit conflicts"],
    [closedLotConflicts, "closed-lot conflicts"]
  ]
    .map(([issues, label]) => {
      const hidden = Math.max(0, (issues as unknown[]).length - 5);
      return hidden ? `${hidden} more ${label}` : "";
    })
    .filter(Boolean)
    .join(", ");

  function restoreImport(next: InventoryImportRecord) {
    const reviewed = next?.reviewedMapping || {};
    const inferred = suggestedMapping(next?.detectedColumns || []);
    const nextMapping = MAPPING_FIELDS.reduce(
      (current, field) => ({
        ...current,
        [field]: typeof reviewed[field] === "string" ? reviewed[field] : inferred[field]
      }),
      {} as InventoryMapping
    );
    const nextConflictPolicy = ["skip_existing", "update_fields"].includes(
      reviewed.conflictPolicy
    )
      ? (reviewed.conflictPolicy as ConflictPolicy)
      : "skip_existing";
    const nextQuantityMode = ["receive", "set_on_hand"].includes(reviewed.quantityMode)
      ? (reviewed.quantityMode as QuantityMode)
      : "receive";
    const hasSavedReview = Boolean(
      next.reviewedAt &&
      !next.rowSummary?.requiresReview &&
      reviewed.conflictPolicy &&
      reviewed.quantityMode
    );

    setRecord(next);
    setSourceName(next.sourceName || "inventory.csv");
    setMapping(nextMapping);
    setConflictPolicy(nextConflictPolicy);
    setQuantityMode(nextQuantityMode);
    setReviewedSignature(
      hasSavedReview && ["preview", "conflict"].includes(next.status)
        ? `${importId(next)}:${nextConflictPolicy}:${nextQuantityMode}:${JSON.stringify(nextMapping)}`
        : ""
    );
  }

  async function resumeDuplicate(error: any) {
    const id = duplicateImportId(error);
    if (!id) return false;
    const existing = await getBusinessInventoryImport(workspace, id);
    if (!existing) throw new Error("The existing inventory import could not be loaded.");
    restoreImport(existing);
    setFeedback(
      existing.status === "applied"
        ? "This exact source was already applied. Its applied state and audit evidence were preserved."
        : existing.status === "rejected"
          ? "This exact source was already withdrawn. Change the source before preparing a new preview."
          : existing.status === "applying"
            ? "This exact source is already being applied. Its in-progress state was preserved."
            : existing.rowSummary?.requiresReview
              ? "Resumed the existing import after a stopped apply attempt. Review and confirm its current state again before retrying."
              : "Resumed the existing import review for this exact source."
    );
    return true;
  }

  async function requestPreview(text: string, name: string) {
    const rows = parseStorefrontCsv(text);
    const nextMapping = suggestedMapping(Object.keys(rows[0] || {}));
    setMapping(nextMapping);
    const next = await previewBusinessInventoryImport(workspace, {
      sourceName: name,
      rows,
      mapping: nextMapping
    });
    setRecord(next);
    setReviewedSignature("");
    setFeedback(
      `Prepared ${Number(next?.rowSummary?.total || rows.length)} rows. Nothing has changed yet.`
    );
  }

  async function preview() {
    if (!canWrite || requestInFlight.current || !csvText.trim()) return;
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await requestPreview(csvText, sourceName.trim() || "inventory.csv");
    } catch (caught: any) {
      try {
        if (!(await resumeDuplicate(caught))) {
          setError(String(caught?.message || caught || "Inventory preview failed."));
        }
      } catch (recovery: any) {
        setError(
          String(
            recovery?.message || recovery || "The existing import could not be resumed."
          )
        );
      }
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  async function pickCsv() {
    if (!canWrite || requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
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
      const name = String(asset.name || "inventory.csv");
      setSourceName(name);
      if (asset.file && typeof asset.file.text === "function") {
        const text = await asset.file.text();
        setCsvText(text);
        await requestPreview(text, name);
      } else if (asset.uri) {
        const text = await FileSystem.readAsStringAsync(String(asset.uri));
        setCsvText(text);
        await requestPreview(text, name);
      } else {
        throw new Error("The selected CSV file did not include readable file data.");
      }
    } catch (caught: any) {
      try {
        if (!(await resumeDuplicate(caught))) {
          setError(String(caught?.message || caught || "Unable to open the CSV file."));
        }
      } catch (recovery: any) {
        setError(
          String(
            recovery?.message || recovery || "The existing import could not be resumed."
          )
        );
      }
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  async function confirmReview() {
    if (!record || requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const next = await reviewBusinessInventoryImport(workspace, record, {
        conflictPolicy,
        quantityMode,
        mapping
      });
      setRecord(next);
      const blocked = Boolean(
        next?.rowSummary?.invalidRows?.length ||
        next?.rowSummary?.duplicateSourceSkus?.length ||
        next?.rowSummary?.locationConflicts?.length ||
        next?.rowSummary?.unitConflicts?.length ||
        next?.rowSummary?.closedLotConflicts?.length ||
        next?.rowSummary?.requiresReview
      );
      setReviewedSignature(
        blocked
          ? ""
          : `${importId(next)}:${conflictPolicy}:${quantityMode}:${JSON.stringify(mapping)}`
      );
      setFeedback(
        blocked
          ? "The file still has blocking row problems. Correct it and prepare a new preview."
          : "Import choices saved. Review the summary once more before applying."
      );
    } catch (caught: any) {
      setError(String(caught?.message || caught || "Import review failed."));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  async function applyImport() {
    if (!record || reviewedSignature !== selectionSignature || requestInFlight.current)
      return;
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const result = await applyBusinessInventoryImport(workspace, record);
      const appliedRecord =
        result?.import?.status === "applied"
          ? result.import
          : await getBusinessInventoryImport(workspace, importId(record));
      if (appliedRecord?.status !== "applied") {
        throw new Error("GrowPath could not confirm that this import was applied.");
      }
      const applied = Number(
        appliedRecord.rowSummary?.applied || result?.appliedItemIds?.length || 0
      );
      setFeedback(
        `Applied ${applied} inventory rows with audited, retry-safe movements.`
      );
      restoreImport(appliedRecord);
      await onApplied();
    } catch (caught: any) {
      setReviewedSignature("");
      try {
        const current = await getBusinessInventoryImport(workspace, importId(record));
        if (current) {
          restoreImport(current);
          setReviewedSignature("");
          if (current.status === "applied") {
            setFeedback(
              "The import was applied even though its first response was interrupted. Its applied state and audit evidence were preserved."
            );
            await onApplied();
            return;
          }
        }
      } catch {
        // Keep the current review visible, but never allow immediate apply after failure.
      }
      setFeedback(
        "The apply attempt stopped. Review the current import state again before retrying."
      );
      setError(String(caught?.message || caught || "Inventory import stopped."));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  async function withdrawImport() {
    if (!record || !canWithdraw || requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const next = await withdrawBusinessInventoryImport(workspace, record);
      if (next?.status !== "rejected") {
        throw new Error("GrowPath could not confirm that this import was withdrawn.");
      }
      restoreImport(next);
      setFeedback(
        "Reviewed import withdrawn. No inventory rows were applied; the audit record remains."
      );
    } catch (caught: any) {
      setError(String(caught?.message || caught || "Inventory withdrawal failed."));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Inventory CSV import"
        accessibilityState={{ expanded, disabled: !canWrite }}
        disabled={!canWrite}
        onPress={() => setExpanded((value) => !value)}
        style={[styles.headerButton, !canWrite && styles.disabled]}
      >
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" aria-level={2} style={styles.title}>
            Reviewed CSV import
          </Text>
          <Text style={styles.help}>
            Preview, resolve duplicate SKUs, confirm quantity meaning, then apply.
          </Text>
        </View>
        <Text style={styles.link}>{expanded ? "Close" : "Open"}</Text>
      </Pressable>
      {!canWrite ? (
        <Text style={styles.help}>
          Your role can view inventory but cannot import it.
        </Text>
      ) : null}
      {expanded && canWrite ? (
        <View style={styles.form}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose inventory CSV file"
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            onPress={pickCsv}
            style={[styles.secondary, busy && styles.disabled]}
          >
            <Text style={styles.secondaryText}>Choose CSV File</Text>
          </Pressable>
          <TextInput
            accessibilityLabel="Inventory import source name"
            placeholder="Source filename"
            placeholderTextColor={palette.textMuted}
            value={sourceName}
            onChangeText={setSourceName}
            editable={!busy && !record}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Paste inventory CSV"
            multiline
            placeholder={
              "sku,name,quantity,unit,reorderPoint,locationId\nSOIL-01,Living Soil,12,bag,4,Shelf A"
            }
            placeholderTextColor={palette.textMuted}
            value={csvText}
            onChangeText={(value) => {
              setCsvText(value);
              setRecord(null);
              setReviewedSignature("");
            }}
            editable={!busy}
            style={[styles.input, styles.csv]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preview inventory import"
            accessibilityState={{ disabled: busy || !csvText.trim(), busy }}
            disabled={busy || !csvText.trim()}
            onPress={preview}
            style={[styles.primary, (busy || !csvText.trim()) && styles.disabled]}
          >
            <Text style={styles.primaryText}>Preview Import</Text>
          </Pressable>

          {record ? (
            <View style={styles.review}>
              <Text style={styles.reviewTitle}>
                {total} rows · {conflicts.length} existing SKU conflicts
              </Text>
              <Text accessibilityLiveRegion="polite" style={styles.status}>
                Import status: {record.status}
                {record.status === "applied" && record.appliedAt
                  ? ` at ${new Date(record.appliedAt).toLocaleString()}`
                  : ""}
              </Text>
              <Text style={styles.help}>
                Detected columns: {(record.detectedColumns || []).join(", ") || "none"}
              </Text>
              {MAPPING_FIELDS.map((field) => (
                <View key={field} style={styles.mappingRow}>
                  <Text style={styles.mappingLabel}>{MAPPING_LABELS[field]}</Text>
                  <TextInput
                    accessibilityLabel={`Inventory import ${field} column`}
                    value={mapping[field]}
                    onChangeText={(value) => {
                      setMapping((current) => ({ ...current, [field]: value }));
                      setReviewedSignature("");
                    }}
                    editable={!busy && !choicesLocked}
                    placeholder="Exact CSV column"
                    placeholderTextColor={palette.textMuted}
                    style={[styles.input, styles.mappingInput]}
                  />
                </View>
              ))}
              <Text style={styles.help}>
                Existing SKU fields:{" "}
                {conflictPolicy === "skip_existing"
                  ? "keep current names and settings"
                  : "update mapped fields from this file"}
                .
              </Text>
              <View
                style={styles.choiceRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="Existing SKU conflict policy"
              >
                {(["skip_existing", "update_fields"] as ConflictPolicy[]).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: conflictPolicy === value,
                      disabled: busy || choicesLocked
                    }}
                    onPress={() => {
                      setConflictPolicy(value);
                      setReviewedSignature("");
                    }}
                    disabled={busy || choicesLocked}
                    style={[
                      styles.choice,
                      conflictPolicy === value && styles.choiceSelected
                    ]}
                  >
                    <Text style={styles.choiceText}>
                      {value === "skip_existing"
                        ? "Keep existing fields"
                        : "Update existing fields"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.help}>
                Quantity meaning:{" "}
                {quantityMode === "receive"
                  ? "each row adds a received amount"
                  : "each row is the intended on-hand total"}
                .
              </Text>
              <View
                style={styles.choiceRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="Imported quantity meaning"
              >
                {(["receive", "set_on_hand"] as QuantityMode[]).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: quantityMode === value,
                      disabled: busy || choicesLocked
                    }}
                    onPress={() => {
                      setQuantityMode(value);
                      setReviewedSignature("");
                    }}
                    disabled={busy || choicesLocked}
                    style={[
                      styles.choice,
                      quantityMode === value && styles.choiceSelected
                    ]}
                  >
                    <Text style={styles.choiceText}>
                      {value === "receive" ? "Received amounts" : "On-hand snapshot"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {conflicts.slice(0, 5).map((conflict, index) => (
                <Text
                  key={`${conflict.sku || "conflict"}-${index}`}
                  style={styles.conflict}
                >
                  Conflict: {conflict.sku || "missing SKU"} ·{" "}
                  {conflict.name || "unnamed existing item"}
                </Text>
              ))}
              {invalidRows.slice(0, 5).map((issue) => (
                <Text key={`invalid-${issue.row}`} style={styles.error}>
                  Row {issue.row}: needs {issue.problems.join(", ")}
                </Text>
              ))}
              {duplicateSourceSkus.slice(0, 5).map((issue) => (
                <Text
                  key={`duplicate-${issue.sku}-${issue.lotCode || "item"}`}
                  style={styles.error}
                >
                  Duplicate source SKU {issue.sku}
                  {issue.lotCode ? ` / lot ${issue.lotCode}` : ""} on rows{" "}
                  {issue.rows.join(", ")}
                </Text>
              ))}
              {locationConflicts.slice(0, 5).map((issue) => (
                <Text
                  key={`location-${issue.row}-${issue.sku}-${issue.lotCode || "item"}`}
                  style={styles.error}
                >
                  Row {issue.row}: {issue.sku}
                  {issue.lotCode ? ` / lot ${issue.lotCode}` : ""} is at{" "}
                  {issue.currentLocation || "an unrecorded location"}; requested{" "}
                  {issue.requestedLocation || "an unrecorded location"}.{" "}
                  {issue.resolution}
                </Text>
              ))}
              {unitConflicts.slice(0, 5).map((issue) => (
                <Text key={`unit-${issue.row}-${issue.sku}`} style={styles.error}>
                  Row {issue.row}: {issue.sku} is recorded in {issue.currentUnit};
                  requested {issue.requestedUnit}. {issue.resolution}
                </Text>
              ))}
              {closedLotConflicts.slice(0, 5).map((issue) => (
                <Text
                  key={`closed-lot-${issue.row}-${issue.sku}-${issue.lotCode}`}
                  style={styles.error}
                >
                  Row {issue.row}: {issue.sku} / lot {issue.lotCode} cannot be imported
                  with status {issue.status}. {issue.resolution}
                </Text>
              ))}
              {hiddenIssueSummary ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  Additional issues not shown: {hiddenIssueSummary}.
                </Text>
              ) : null}
              {appliedRowCount > 0 && !recordLocked ? (
                <Text accessibilityLiveRegion="polite" style={styles.help}>
                  {appliedRowCount} rows were already applied. Mapping, conflict, and
                  quantity choices are locked so a retry keeps the same meaning.
                </Text>
              ) : null}
              {requiresReview ? (
                <Text style={styles.error}>
                  Review required: confirm the current mapping and quantity choices again
                  before applying.
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm inventory import review"
                accessibilityState={{ disabled: busy || recordLocked, busy }}
                disabled={busy || recordLocked}
                onPress={confirmReview}
                style={[styles.secondary, (busy || recordLocked) && styles.disabled]}
              >
                <Text style={styles.secondaryText}>Confirm Review Choices</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply reviewed inventory import"
                accessibilityState={{
                  disabled:
                    busy ||
                    recordLocked ||
                    hasBlockingSourceIssues ||
                    reviewedSignature !== selectionSignature,
                  busy
                }}
                disabled={
                  busy ||
                  recordLocked ||
                  hasBlockingSourceIssues ||
                  reviewedSignature !== selectionSignature
                }
                onPress={applyImport}
                style={[
                  styles.primary,
                  (busy ||
                    recordLocked ||
                    hasBlockingSourceIssues ||
                    reviewedSignature !== selectionSignature) &&
                    styles.disabled
                ]}
              >
                <Text style={styles.primaryText}>Apply Reviewed Import</Text>
              </Pressable>
              {canWithdraw ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Withdraw reviewed inventory import"
                  accessibilityState={{ disabled: busy, busy }}
                  disabled={busy}
                  onPress={withdrawImport}
                  style={[styles.withdraw, busy && styles.disabled]}
                >
                  <Text style={styles.withdrawText}>Withdraw Reviewed Import</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              {feedback}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    headerButton: { alignItems: "center", flexDirection: "row", gap: 12 },
    title: { color: palette.text, fontSize: 16, fontWeight: "900" },
    help: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
    link: { color: palette.link, fontWeight: "900" },
    form: { gap: 10 },
    input: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 10
    },
    csv: { minHeight: 120, textAlignVertical: "top" },
    primary: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 11
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondary: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 10
    },
    secondaryText: { color: palette.link, fontWeight: "900" },
    disabled: { opacity: 0.5 },
    review: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    reviewTitle: { color: palette.text, fontWeight: "900" },
    status: { color: palette.text, fontSize: 12, fontWeight: "900" },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    choice: {
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    choiceSelected: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    choiceText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    mappingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    mappingLabel: { color: palette.text, fontSize: 12, fontWeight: "900", width: 140 },
    mappingInput: { flex: 1 },
    conflict: { color: palette.warning, fontSize: 12, fontWeight: "800" },
    withdraw: {
      alignItems: "center",
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 10
    },
    withdrawText: { color: palette.warning, fontWeight: "900" },
    error: { color: palette.danger, fontWeight: "800" },
    success: { color: palette.success, fontWeight: "800" }
  });
}
