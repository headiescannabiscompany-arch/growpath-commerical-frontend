import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  ExpenseReceiptExtractionResult,
  ReviewedExpenseExtraction
} from "@/api/businessDeskProvider";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import { LabeledInput } from "@/features/businessDesk/RecordFormControls";
import {
  formatScaledIntegerInput,
  multiplyMoneyByQuantityMicros,
  parseMoneyInput,
  parseQuantityInput,
  resolveCurrencyContext
} from "@/features/businessDesk/money";
import { isoToLocalDate } from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type ReviewLine = {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
  category: string;
  confidenceBasisPoints: number;
};

type ReviewDraft = {
  title: string;
  merchant: string;
  occurredAt: string;
  amount: string;
  tax: string;
  currency: string;
  category: string;
  paymentMethod: string;
  notes: string;
  reviewNotes: string;
  itemLines: ReviewLine[];
};

function rawMajor(value: number | null, digits: number) {
  return formatScaledIntegerInput(value, digits);
}

function draftFrom(
  result: ExpenseReceiptExtractionResult,
  initialRecordTitle: string
): ReviewDraft {
  const digits = Number.isSafeInteger(result.fields.minorUnitDigits.value)
    ? Number(result.fields.minorUnitDigits.value)
    : 2;
  return {
    title: initialRecordTitle,
    merchant: result.fields.merchant.value,
    occurredAt: isoToLocalDate(result.fields.occurredAt.value),
    amount: rawMajor(result.fields.amountMinor.value, digits),
    tax: rawMajor(result.fields.taxMinor.value, digits),
    currency: result.fields.currency.value,
    category: result.fields.category.value,
    paymentMethod: result.fields.paymentMethod.value,
    notes: result.fields.notes.value,
    reviewNotes: "",
    itemLines: result.itemLines.map((line, index) => ({
      id: `extracted-line-${index}`,
      description: line.description,
      quantity: formatScaledIntegerInput(line.quantityMicros, 6, {
        trimTrailingZeros: true
      }),
      unitAmount: rawMajor(line.unitAmountMinor, digits),
      category: line.category,
      confidenceBasisPoints: line.confidenceBasisPoints
    }))
  };
}

function fingerprint(draft: ReviewDraft) {
  return JSON.stringify({
    ...draft,
    itemLines: draft.itemLines.map(({ id: _id, ...line }) => line)
  });
}

function confidenceLabel(value: number) {
  return `${Math.round(value / 100)}% provider-reported confidence`;
}

export default function ReceiptExtractionReview({
  result,
  selectedRecordVersion,
  initialRecordTitle,
  applicable,
  applying,
  onApply
}: {
  result: ExpenseReceiptExtractionResult;
  selectedRecordVersion: number | null;
  initialRecordTitle: string;
  applicable: boolean;
  applying: boolean;
  onApply: (expense: ReviewedExpenseExtraction) => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const initialDraft = useMemo(
    () => draftFrom(result, initialRecordTitle),
    [initialRecordTitle, result]
  );
  const initialFingerprint = useMemo(() => fingerprint(initialDraft), [initialDraft]);
  const [draft, setDraft] = useState(initialDraft);
  const [reviewError, setReviewError] = useState("");
  const reviewerEdited = fingerprint(draft) !== initialFingerprint;

  const validationByField = useMemo(() => {
    const map = new Map<string, string[]>();
    result.validationErrors.forEach((entry) => {
      map.set(entry.field, [...(map.get(entry.field) || []), entry.message]);
    });
    return map;
  }, [result.validationErrors]);
  const missing = useMemo(() => new Set(result.missingFields), [result.missingFields]);

  const fieldHint = (
    field: keyof ExpenseReceiptExtractionResult["fields"],
    currentValue: string,
    initialValue: string
  ) => {
    const notes = [confidenceLabel(result.fields[field].confidenceBasisPoints)];
    if (missing.has(field)) notes.push("Missing in the source or extraction");
    if (currentValue !== initialValue) notes.push("Changed by reviewer");
    notes.push(...(validationByField.get(field) || []));
    return notes.join(" · ");
  };

  const buildReviewedExpense = () => {
    if (!draft.title.trim()) {
      throw new Error("Review and enter the expense record title.");
    }
    const context = resolveCurrencyContext(draft.currency);
    const amountMinor = parseMoneyInput(draft.amount, context, {
      label: "Reviewed expense amount"
    });
    if (amountMinor === null)
      throw new Error("Review and enter the full expense amount.");
    const taxMinor = parseMoneyInput(draft.tax, context, {
      label: "Reviewed shown tax",
      allowBlank: true
    });
    const occurredAt = String(draft.occurredAt || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
      throw new Error("Review and choose the expense date.");
    }
    if ((taxMinor || 0) > amountMinor) {
      throw new Error("Reviewed tax cannot exceed the full expense amount.");
    }
    const itemLines = draft.itemLines.map((line, index) => {
      if (!line.description.trim()) {
        throw new Error(`Extracted item ${index + 1} needs a reviewed description.`);
      }
      const quantityMicros = parseQuantityInput(line.quantity, {
        label: `Extracted item ${index + 1} quantity`
      });
      const unitAmountMinor = parseMoneyInput(line.unitAmount, context, {
        label: `Extracted item ${index + 1} unit amount`
      });
      if (!quantityMicros || unitAmountMinor === null) {
        throw new Error(`Review the quantity and unit amount for item ${index + 1}.`);
      }
      return {
        description: line.description.trim(),
        quantityMicros,
        unitAmountMinor,
        lineTotalMinor: multiplyMoneyByQuantityMicros(
          unitAmountMinor,
          quantityMicros,
          `Extracted item ${index + 1}`
        ),
        category: line.category.trim()
      };
    });
    const lineTotal = itemLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
    if (!Number.isSafeInteger(lineTotal) || lineTotal > amountMinor) {
      throw new Error("Reviewed item totals cannot exceed the full expense amount.");
    }
    return {
      title: draft.title.trim(),
      merchant: draft.merchant.trim(),
      occurredAt,
      amountMinor,
      taxMinor: taxMinor || 0,
      ...context,
      category: draft.category.trim() || "uncategorized",
      paymentMethod: draft.paymentMethod.trim(),
      itemLines,
      notes: draft.notes.trim(),
      reviewNotes: draft.reviewNotes.trim()
    } satisfies ReviewedExpenseExtraction;
  };

  const runReviewedAction = (action: (expense: ReviewedExpenseExtraction) => void) => {
    setReviewError("");
    try {
      action(buildReviewedExpense());
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "The extracted draft needs more review."
      );
    }
  };

  return (
    <AppCard
      title="Review extracted receipt draft"
      titleLevel={3}
      subtitle="AI output is staged, not saved truth. Verify every field against the protected source before applying it."
    >
      <View accessibilityLiveRegion="polite" style={styles.provenanceBox}>
        <Text style={styles.provenanceTitle}>Provider provenance</Text>
        <Text style={styles.meta}>
          {result.provenance.provider} · {result.provenance.model} · schema{" "}
          {result.provenance.schemaVersion} · prompt {result.provenance.promptVersion}
        </Text>
        <Text style={styles.meta}>
          Extracted {new Date(result.provenance.extractedAt).toLocaleString()}. Source and
          result digests were verified by the server.
        </Text>
        <Text style={styles.warning}>
          Confidence is provider-reported, not proof. Receipt text is treated as untrusted
          data and cannot issue instructions or actions.
        </Text>
      </View>

      {result.duplicate.status === "same_workspace_duplicate" ? (
        <Text style={styles.warning}>
          This workspace already has matching receipt bytes. Review for a duplicate
          expense before applying.
        </Text>
      ) : result.duplicate.status === "unknown" ? (
        <Text style={styles.meta}>
          Duplicate status is unknown; check before saving twice.
        </Text>
      ) : null}

      {result.missingFields.length || result.validationErrors.length ? (
        <View style={styles.issueBox}>
          <Text style={styles.issueTitle}>Extraction issues need review</Text>
          {result.missingFields.map((field) => (
            <Text key={`missing-${field}`} style={styles.issueText}>
              Missing: {field}
            </Text>
          ))}
          {result.validationErrors.map((entry) => (
            <Text key={`${entry.field}-${entry.code}`} style={styles.issueText}>
              {entry.field}: {entry.message}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.fieldGrid}>
        <LabeledInput
          label="Reviewed expense title"
          value={draft.title}
          onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
          hint={
            draft.title === initialDraft.title
              ? "Current saved record title"
              : "Changed by reviewer"
          }
        />
        <LabeledInput
          label="Extracted merchant"
          value={draft.merchant}
          onChangeText={(merchant) => setDraft((current) => ({ ...current, merchant }))}
          hint={fieldHint("merchant", draft.merchant, initialDraft.merchant)}
        />
        <View style={styles.dateField}>
          <CalendarDateField
            label="Extracted expense date"
            accessibilityLabel="Reviewed extracted expense date"
            value={draft.occurredAt}
            onChange={(occurredAt) => setDraft((current) => ({ ...current, occurredAt }))}
          />
          <Text style={styles.fieldHint}>
            {fieldHint("occurredAt", draft.occurredAt, initialDraft.occurredAt)}
          </Text>
        </View>
        <LabeledInput
          label="Extracted currency"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={3}
          value={draft.currency}
          onChangeText={(currency) => setDraft((current) => ({ ...current, currency }))}
          hint={fieldHint("currency", draft.currency, initialDraft.currency)}
        />
        <LabeledInput
          label="Extracted full amount"
          keyboardType="decimal-pad"
          value={draft.amount}
          onChangeText={(amount) => setDraft((current) => ({ ...current, amount }))}
          hint={fieldHint("amountMinor", draft.amount, initialDraft.amount)}
        />
        <LabeledInput
          label="Extracted tax shown"
          keyboardType="decimal-pad"
          value={draft.tax}
          onChangeText={(tax) => setDraft((current) => ({ ...current, tax }))}
          hint={fieldHint("taxMinor", draft.tax, initialDraft.tax)}
        />
        <LabeledInput
          label="Extracted category"
          value={draft.category}
          onChangeText={(category) => setDraft((current) => ({ ...current, category }))}
          hint={fieldHint("category", draft.category, initialDraft.category)}
        />
        <LabeledInput
          label="Extracted payment method"
          value={draft.paymentMethod}
          onChangeText={(paymentMethod) =>
            setDraft((current) => ({ ...current, paymentMethod }))
          }
          hint={fieldHint(
            "paymentMethod",
            draft.paymentMethod,
            initialDraft.paymentMethod
          )}
        />
      </View>
      <LabeledInput
        label="Extracted notes"
        multiline
        value={draft.notes}
        onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))}
        hint={fieldHint("notes", draft.notes, initialDraft.notes)}
      />
      <LabeledInput
        label="Reviewer notes"
        multiline
        value={draft.reviewNotes}
        onChangeText={(reviewNotes) =>
          setDraft((current) => ({ ...current, reviewNotes }))
        }
        hint="Optional human review context; this is not provider-extracted text."
      />

      <View style={styles.stack}>
        <Text accessibilityRole="header" aria-level={4} style={styles.sectionTitle}>
          Extracted readable items
        </Text>
        {draft.itemLines.length ? (
          draft.itemLines.map((line, index) => (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineHeading}>
                <Text style={styles.lineTitle}>Extracted item {index + 1}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove extracted item ${index + 1}`}
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      itemLines: current.itemLines.filter(
                        (candidate) => candidate.id !== line.id
                      )
                    }))
                  }
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
              <Text style={styles.fieldHint}>
                {confidenceLabel(line.confidenceBasisPoints)} · verify against source
              </Text>
              <View style={styles.fieldGrid}>
                <LabeledInput
                  label="Description"
                  accessibilityLabel={`Extracted item ${index + 1} description`}
                  value={line.description}
                  onChangeText={(description) =>
                    setDraft((current) => ({
                      ...current,
                      itemLines: current.itemLines.map((candidate) =>
                        candidate.id === line.id
                          ? { ...candidate, description }
                          : candidate
                      )
                    }))
                  }
                />
                <LabeledInput
                  label="Quantity"
                  accessibilityLabel={`Extracted item ${index + 1} quantity`}
                  keyboardType="decimal-pad"
                  value={line.quantity}
                  onChangeText={(quantity) =>
                    setDraft((current) => ({
                      ...current,
                      itemLines: current.itemLines.map((candidate) =>
                        candidate.id === line.id ? { ...candidate, quantity } : candidate
                      )
                    }))
                  }
                />
                <LabeledInput
                  label="Unit amount"
                  accessibilityLabel={`Extracted item ${index + 1} unit amount`}
                  keyboardType="decimal-pad"
                  value={line.unitAmount}
                  onChangeText={(unitAmount) =>
                    setDraft((current) => ({
                      ...current,
                      itemLines: current.itemLines.map((candidate) =>
                        candidate.id === line.id
                          ? { ...candidate, unitAmount }
                          : candidate
                      )
                    }))
                  }
                />
                <LabeledInput
                  label="Item category"
                  accessibilityLabel={`Extracted item ${index + 1} category`}
                  value={line.category}
                  onChangeText={(category) =>
                    setDraft((current) => ({
                      ...current,
                      itemLines: current.itemLines.map((candidate) =>
                        candidate.id === line.id ? { ...candidate, category } : candidate
                      )
                    }))
                  }
                />
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No readable item lines were extracted.</Text>
        )}
      </View>

      <Text style={styles.meta}>
        Reviewer edits:{" "}
        {reviewerEdited ? "yes — changes will be recorded by digest" : "none yet"}.
      </Text>
      {!applicable ? (
        <Text style={styles.error}>
          This staged result is not bound to the currently selected READY receipt. Select
          the matching protected source before using it.
        </Text>
      ) : null}
      {reviewError ? <Text style={styles.error}>{reviewError}</Text> : null}

      <View style={styles.actions}>
        {selectedRecordVersion ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply reviewed receipt extraction as a new expense revision"
            accessibilityState={{ disabled: applying || !applicable, busy: applying }}
            disabled={applying || !applicable}
            onPress={() => runReviewedAction(onApply)}
            style={[styles.primaryButton, (applying || !applicable) && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {applying
                ? "Applying reviewed revision…"
                : `Apply to saved revision ${selectedRecordVersion}`}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.meta}>
        Apply uses the exact expected saved version. A conflict preserves this staged
        review for comparison.
      </Text>
    </AppCard>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    dateField: { flexBasis: 230, flexGrow: 1, gap: 5, minWidth: 210 },
    disabled: { opacity: 0.55 },
    error: { color: palette.danger, fontSize: 13, fontWeight: "800", lineHeight: 19 },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    fieldHint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    issueBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning || palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 12
    },
    issueText: { color: palette.text, fontSize: 12, lineHeight: 18 },
    issueTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    lineCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 12
    },
    lineHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    lineTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 13, fontWeight: "900" },
    provenanceBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 12
    },
    provenanceTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    removeText: { color: palette.danger, fontSize: 12, fontWeight: "900" },
    sectionTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    stack: { gap: 10 },
    warning: { color: palette.warning || palette.text, fontSize: 12, lineHeight: 18 }
  });
}
