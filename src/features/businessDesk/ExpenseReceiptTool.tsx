import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  businessDeskWorkspaceKey,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES } from "@/api/businessDeskArtifacts";
import {
  applyExpenseReceiptExtraction,
  startExpenseReceiptExtraction,
  type ExpenseReceiptExtractionResult,
  type ReviewedExpenseExtraction
} from "@/api/businessDeskProvider";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import { useOptionalAuth } from "@/auth/AuthContext";
import {
  LabeledInput,
  RecordSaveArchiveActions
} from "@/features/businessDesk/RecordFormControls";
import ProtectedAttachmentField from "@/features/businessDesk/ProtectedAttachmentField";
import ProviderOperationStatus, {
  businessDeskCapabilityCopy,
  businessDeskProviderErrorMessage
} from "@/features/businessDesk/ProviderOperationStatus";
import RecordToolScaffold from "@/features/businessDesk/RecordToolScaffold";
import ReceiptExtractionReview from "@/features/businessDesk/ReceiptExtractionReview";
import {
  formatMoneyMinor,
  formatScaledIntegerInput,
  multiplyMoneyByQuantityMicros,
  parseMoneyInput,
  parseQuantityInput,
  resolveCurrencyContext
} from "@/features/businessDesk/money";
import {
  businessDeskRecordId,
  isoToLocalDate,
  localDateToIso,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import ReviewedArtifactPanel from "@/features/businessDesk/ReviewedArtifactPanel";
import {
  businessDeskProviderPersistenceScopeKey,
  getOrCreatePersistedProviderIdentity,
  rememberPersistedProviderOperation
} from "@/features/businessDesk/providerOperationPersistence";
import {
  useBusinessDeskProviderCapabilities,
  useBusinessDeskProviderOperation
} from "@/features/businessDesk/useBusinessDeskProviderOperation";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type ExpenseStatus = "draft" | "reviewed" | "rejected" | "correction_required";
type ExpenseTransitionStatus = Exclude<ExpenseStatus, "draft">;

type ExpenseLineDraft = {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
  category: string;
};

type ExpenseReceiptToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

let expenseLineSequence = 0;

function newLine(overrides: Partial<ExpenseLineDraft> = {}): ExpenseLineDraft {
  expenseLineSequence += 1;
  return {
    id: `expense-line-${expenseLineSequence}`,
    description: "",
    quantity: "1",
    unitAmount: "",
    category: "",
    ...overrides
  };
}

function payloadOf(record: BusinessDeskRecord | null) {
  return (record?.payload?.expense || {}) as any;
}

function rawMajor(value: unknown, digits: number) {
  if (!Number.isSafeInteger(value)) return "";
  return formatScaledIntegerInput(Number(value), digits);
}

function rawQuantity(value: unknown) {
  return Number.isSafeInteger(value)
    ? formatScaledIntegerInput(Number(value), 6, { trimTrailingZeros: true })
    : "1";
}

export default function ExpenseReceiptTool({
  workspace,
  workspaceLabel,
  basePath
}: ExpenseReceiptToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const auth = useOptionalAuth();
  const collection = useBusinessDeskRecordCollection(workspace, "expense");
  const workspaceKey = businessDeskWorkspaceKey(workspace);
  const providerAccountId = String(auth?.user?.id || auth?.user?._id || "");
  const providerFacilityRole =
    workspace.workspaceType === "facility"
      ? String(auth?.ctx?.facilityRole || "UNKNOWN").toUpperCase()
      : "";
  const providerPersistenceScopeKey = businessDeskProviderPersistenceScopeKey(
    providerFacilityRole
      ? `${providerAccountId}:facility-role:${providerFacilityRole}`
      : providerAccountId,
    workspaceKey
  );
  const providerCapabilities = useBusinessDeskProviderCapabilities(workspace);
  const extractionOperation =
    useBusinessDeskProviderOperation<ExpenseReceiptExtractionResult>({
      workspace,
      kind: "expense_receipt_extraction",
      slot: "expense_receipt_extraction",
      keyPrefix: "expense-receipt-extract"
    });
  const activeWorkspaceKey = useRef(workspaceKey);
  useLayoutEffect(() => {
    activeWorkspaceKey.current = workspaceKey;
  }, [workspaceKey]);
  const [selected, setSelected] = useState<BusinessDeskRecord | null>(null);
  const [title, setTitle] = useState("");
  const [merchant, setMerchant] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("uncategorized");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [lines, setLines] = useState<ExpenseLineDraft[]>([]);
  const [notes, setNotes] = useState("");
  const [attachmentDraft, setAttachmentDraft] = useState({
    workspaceKey,
    ids: [] as string[],
    editVersion: 0,
    session: 0,
    blocking: false
  });
  const [readyAttachmentState, setReadyAttachmentState] = useState({
    workspaceKey,
    ids: [] as string[]
  });
  const [applyBusyState, setApplyBusyState] = useState({
    workspaceKey,
    value: false
  });
  const [archiveReason, setArchiveReason] = useState("");
  const [savedContentFingerprint, setSavedContentFingerprint] = useState("");
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [throughDate, setThroughDate] = useState("");
  const applyBusy =
    applyBusyState.workspaceKey === workspaceKey ? applyBusyState.value : false;
  const readyAttachmentIds =
    readyAttachmentState.workspaceKey === workspaceKey ? readyAttachmentState.ids : [];
  const activeAttachmentDraft =
    attachmentDraft.workspaceKey === workspaceKey
      ? attachmentDraft
      : {
          workspaceKey,
          ids: [] as string[],
          editVersion: 0,
          session: attachmentDraft.session,
          blocking: false
        };

  const contentFingerprint = JSON.stringify({
    title,
    merchant,
    occurredAt,
    amount,
    tax,
    currency,
    category,
    paymentMethod,
    lines: lines.map(({ id: _id, ...line }) => line),
    notes,
    receiptAttachmentIds: activeAttachmentDraft.ids,
    attachmentEditVersion: activeAttachmentDraft.editVersion
  });
  const exactSavedDraft = Boolean(
    selected?.status === "draft" && contentFingerprint === savedContentFingerprint
  );
  const formMatchesSelectedRevision = Boolean(
    selected && contentFingerprint === savedContentFingerprint
  );
  const selectedSavedReceiptId = String(payloadOf(selected).receiptAssetId || "").trim();
  const readyReceiptId = readyAttachmentIds[0] || "";
  const extractionCapability =
    providerCapabilities.capabilities?.expenseReceiptExtraction || null;
  const extractionResult =
    extractionOperation.operation?.state === "succeeded" &&
    extractionOperation.operation.result?.type === "expense_receipt_extraction"
      ? extractionOperation.operation.result
      : null;
  const extractionAppliesToCurrentReceipt = Boolean(
    extractionResult &&
    readyReceiptId &&
    extractionResult.provenance.sourceAttachmentId === readyReceiptId &&
    selectedSavedReceiptId === readyReceiptId &&
    formMatchesSelectedRevision
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const wantedCategory = categoryFilter.trim().toLowerCase();
    return collection.records.filter((record) => {
      const expense = payloadOf(record);
      const date = String(expense.occurredAt || "").slice(0, 10);
      const haystack = [record.title, expense.merchant, expense.category]
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!wantedCategory ||
          String(expense.category || "").toLowerCase() === wantedCategory) &&
        (!fromDate || date >= fromDate) &&
        (!throughDate || date <= throughDate)
      );
    });
  }, [categoryFilter, collection.records, fromDate, search, throughDate]);

  const reviewedFilteredRecords = useMemo(
    () =>
      filteredRecords.filter((record) => {
        const expense = payloadOf(record);
        return (
          record.status === "reviewed" &&
          expense.review?.status === "reviewed" &&
          Boolean(businessDeskRecordId(record)) &&
          Number.isSafeInteger(record.version) &&
          record.version > 0
        );
      }),
    [filteredRecords]
  );
  const artifactRevisionSelections = useMemo(
    () =>
      reviewedFilteredRecords.length <= 100
        ? reviewedFilteredRecords
            .map((record) => ({
              recordId: businessDeskRecordId(record),
              revisionNumber: record.version
            }))
            .sort((left, right) => left.recordId.localeCompare(right.recordId))
        : [],
    [reviewedFilteredRecords]
  );

  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, { amount: number; digits: number }>();
    filteredRecords.forEach((record) => {
      const expense = payloadOf(record);
      if (!Number.isSafeInteger(expense.amountMinor) || !expense.currency) return;
      const key = `${expense.currency}:${expense.minorUnitDigits}`;
      const current = totals.get(key) || {
        amount: 0,
        digits: Number(expense.minorUnitDigits || 0)
      };
      const next = current.amount + Number(expense.amountMinor);
      if (Number.isSafeInteger(next)) totals.set(key, { ...current, amount: next });
    });
    return [...totals.entries()].map(([key, value]) => ({
      currency: key.split(":")[0],
      ...value
    }));
  }, [filteredRecords]);

  const reset = () => {
    setSelected(null);
    setTitle("");
    setMerchant("");
    setOccurredAt("");
    setAmount("");
    setTax("");
    setCurrency("USD");
    setCategory("uncategorized");
    setPaymentMethod("");
    setLines([]);
    setNotes("");
    setAttachmentDraft((current) => ({
      workspaceKey,
      ids: [],
      editVersion: 0,
      session: current.session + 1,
      blocking: false
    }));
    setReadyAttachmentState({ workspaceKey, ids: [] });
    setArchiveReason("");
    setSavedContentFingerprint("");
    setFormError("");
    setFeedback("");
  };

  const open = (record: BusinessDeskRecord) => {
    const expense = payloadOf(record);
    const digits = Number.isInteger(expense.minorUnitDigits)
      ? Number(expense.minorUnitDigits)
      : 2;
    const next = {
      title: record.title || "",
      merchant: String(expense.merchant || ""),
      occurredAt: isoToLocalDate(expense.occurredAt),
      amount: rawMajor(expense.amountMinor, digits),
      tax: rawMajor(expense.taxMinor || 0, digits),
      currency: String(expense.currency || "USD"),
      category: String(expense.category || "uncategorized"),
      paymentMethod: String(expense.paymentMethod || ""),
      lines: (Array.isArray(expense.itemLines) ? expense.itemLines : []).map(
        (line: any) =>
          newLine({
            description: String(line.description || ""),
            quantity: rawQuantity(line.quantityMicros),
            unitAmount: rawMajor(line.unitAmountMinor, digits),
            category: String(line.category || "")
          })
      ),
      notes: String(expense.notes || "")
    };
    const receiptAssetId = String(expense.receiptAssetId || "").trim();
    const receiptAttachmentIds = receiptAssetId ? [receiptAssetId] : [];
    setSelected(record);
    setTitle(next.title);
    setMerchant(next.merchant);
    setOccurredAt(next.occurredAt);
    setAmount(next.amount);
    setTax(next.tax);
    setCurrency(next.currency);
    setCategory(next.category);
    setPaymentMethod(next.paymentMethod);
    setLines(next.lines);
    setNotes(next.notes);
    setAttachmentDraft((current) => ({
      workspaceKey,
      ids: receiptAttachmentIds,
      editVersion: 0,
      session: current.session + 1,
      blocking: false
    }));
    setReadyAttachmentState({ workspaceKey, ids: [] });
    setArchiveReason("");
    setSavedContentFingerprint(
      JSON.stringify({
        ...next,
        lines: next.lines.map(({ id: _id, ...line }: ExpenseLineDraft) => line),
        receiptAttachmentIds,
        attachmentEditVersion: 0
      })
    );
    setFormError("");
    setFeedback(`Loaded ${record.status} revision ${record.version}.`);
  };

  const buildExpense = () => {
    if (activeAttachmentDraft.blocking) {
      throw new Error(
        "Finish, cancel, or remove the pending protected receipt before saving."
      );
    }
    if (!title.trim()) throw new Error("Give this expense a clear record title.");
    const date = localDateToIso(occurredAt);
    if (!date) throw new Error("Choose the date shown on the receipt or expense record.");
    const context = resolveCurrencyContext(currency);
    const amountMinor = parseMoneyInput(amount, context, { label: "Expense amount" });
    if (amountMinor === null) throw new Error("Enter the expense amount.");
    const taxMinor =
      parseMoneyInput(tax, context, { label: "Shown tax", allowBlank: true }) || 0;
    if (taxMinor > amountMinor) {
      throw new Error("Shown tax cannot exceed the full expense amount.");
    }
    const itemLines = lines.map((line, index) => {
      if (!line.description.trim())
        throw new Error(`Item ${index + 1} needs a description.`);
      const quantityMicros = parseQuantityInput(line.quantity, {
        label: `Item ${index + 1} quantity`
      });
      if (!quantityMicros)
        throw new Error(`Item ${index + 1} quantity must be positive.`);
      const unitAmountMinor = parseMoneyInput(line.unitAmount, context, {
        label: `Item ${index + 1} unit amount`
      });
      if (unitAmountMinor === null)
        throw new Error(`Item ${index + 1} needs a unit amount.`);
      return {
        description: line.description.trim(),
        quantityMicros,
        unitAmountMinor,
        lineTotalMinor: multiplyMoneyByQuantityMicros(
          unitAmountMinor,
          quantityMicros,
          `Item ${index + 1}`
        ),
        category: line.category.trim()
      };
    });
    const itemTotal = itemLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);
    if (!Number.isSafeInteger(itemTotal) || itemTotal > amountMinor) {
      throw new Error("Item line totals cannot exceed the full expense amount.");
    }
    return {
      merchant: merchant.trim(),
      occurredAt: date,
      amountMinor,
      taxMinor,
      ...context,
      category: category.trim() || "uncategorized",
      paymentMethod: paymentMethod.trim(),
      receiptAssetId: activeAttachmentDraft.ids[0] || "",
      itemLines,
      extractionProvenance: {
        origin: "manual",
        provider: "",
        model: "",
        sourceAssetId: "",
        extractedAt: null,
        confidenceBasisPoints: null
      },
      review: { status: "draft", reviewedByUserId: "", reviewedAt: null, notes: "" },
      notes: notes.trim()
    };
  };

  const saveDraft = async () => {
    setFormError("");
    setFeedback("");
    try {
      const expense = buildExpense();
      const record = await collection.save(
        {
          title: title.trim(),
          status: "draft",
          payload: { expense }
        },
        selected
      );
      open(record);
      setFeedback(
        `Expense draft revision ${record.version} saved. Review the exact unchanged draft separately.`
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The expense could not be saved."
      );
    }
  };

  const transitionExpense = async (status: ExpenseTransitionStatus) => {
    setFormError("");
    setFeedback("");
    try {
      if (!selected || selected.status !== "draft") {
        throw new Error("Save the expense as a draft before changing its review state.");
      }
      if (contentFingerprint !== savedContentFingerprint) {
        throw new Error(
          "Save this exact content as a draft before changing its review state."
        );
      }
      const record = await collection.transition(selected, { status });
      open(record);
      setFeedback(
        status === "reviewed"
          ? `Exact expense revision ${record.version} reviewed. This is a business record, not tax or bookkeeping advice.`
          : status === "correction_required"
            ? `Exact expense revision ${record.version} marked as needing correction.`
            : `Exact expense revision ${record.version} rejected.`
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The expense review state could not be changed."
      );
    }
  };

  const startExtraction = async () => {
    const requestWorkspaceKey = workspaceKey;
    setFormError("");
    setFeedback("");
    try {
      if (providerCapabilities.loading) {
        throw new Error("Wait while GrowPathAI checks provider availability.");
      }
      if (!extractionCapability?.enabled) {
        throw new Error(businessDeskCapabilityCopy(extractionCapability?.code));
      }
      if (!selected || !businessDeskRecordId(selected)) {
        throw new Error(
          "Save this receipt as a draft first. Extraction can only apply through an exact saved revision."
        );
      }
      if (!formMatchesSelectedRevision) {
        throw new Error(
          "Save or discard the current edits before starting extraction for this exact revision."
        );
      }
      if (!readyReceiptId || selectedSavedReceiptId !== readyReceiptId) {
        throw new Error(
          "The saved receipt source must finish protected checks and show READY before extraction."
        );
      }
      const signature = JSON.stringify({
        workspaceKey,
        operation: "expense_receipt_extraction",
        attachmentId: readyReceiptId
      });
      await extractionOperation.start(signature, (clientOperationKey, signal) =>
        startExpenseReceiptExtraction(
          workspace,
          { clientOperationKey, attachmentId: readyReceiptId },
          { signal }
        )
      );
    } catch (error) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setFormError(
          businessDeskProviderErrorMessage(
            error instanceof Error
              ? error
              : new Error("Receipt extraction could not start.")
          )
        );
      }
    }
  };

  const applyReviewedExtraction = async (reviewedExpense: ReviewedExpenseExtraction) => {
    if (applyBusy) return;
    const requestWorkspaceKey = workspaceKey;
    setFormError("");
    setFeedback("");
    setApplyBusyState({ workspaceKey: requestWorkspaceKey, value: true });
    try {
      const operation = extractionOperation.operation;
      const recordId = businessDeskRecordId(selected);
      if (
        !operation ||
        operation.state !== "succeeded" ||
        !extractionResult ||
        !recordId ||
        !selected ||
        !extractionAppliesToCurrentReceipt
      ) {
        throw new Error(
          "Reload the exact saved expense revision and matching READY receipt before applying this staged result."
        );
      }
      const signature = JSON.stringify({
        workspaceKey: requestWorkspaceKey,
        operation: "expense_receipt_apply",
        operationId: operation.id,
        resultDigestSha256: extractionResult.resultDigestSha256,
        recordId,
        expectedVersion: selected.version,
        reviewedExpense
      });
      const identity = await getOrCreatePersistedProviderIdentity({
        scopeKey: providerPersistenceScopeKey,
        slot: "expense_receipt_apply",
        signature,
        keyPrefix: "expense-receipt-apply"
      });
      const packet = await applyExpenseReceiptExtraction(workspace, operation.id, {
        recordId,
        expectedVersion: selected.version,
        idempotencyKey: identity.clientOperationKey,
        reviewedExpense
      });
      if (activeWorkspaceKey.current !== requestWorkspaceKey) return;
      let metadataWarning = "";
      try {
        await rememberPersistedProviderOperation(identity, packet.operation.id);
      } catch {
        metadataWarning =
          " Safe retry metadata could not be retained on this device; do not repeat Apply without refreshing the saved record.";
      }
      open(packet.record);
      void collection.reload();
      setFeedback(
        `${
          packet.idempotentReplay
            ? "Recovered the same reviewed apply"
            : "Applied the reviewed extraction"
        } as expense revision ${packet.record.version}. The source, provider provenance, field confidence, validation, and reviewer-change digests remain server-attested.${metadataWarning}`
      );
    } catch (error) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setFormError(
          businessDeskProviderErrorMessage(
            error instanceof Error
              ? error
              : new Error("The reviewed receipt extraction could not be applied.")
          )
        );
      }
    } finally {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setApplyBusyState({ workspaceKey: requestWorkspaceKey, value: false });
      }
    }
  };

  const archive = async () => {
    setFormError("");
    try {
      if (!selected) return;
      if (archiveReason.trim().length < 3) {
        throw new Error("Enter an archive reason with at least three characters.");
      }
      await collection.archive(selected, archiveReason.trim());
      reset();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The expense could not be archived."
      );
    }
  };

  return (
    <RecordToolScaffold
      title="Expense / Receipt Helper"
      workspaceLabel={workspaceLabel}
      basePath={basePath}
      description="Record and review business expenses without turning GrowPathAI into bookkeeping or tax software. Only saved records appear in totals and exports."
      records={filteredRecords}
      selectedRecord={selected}
      loading={collection.loading}
      error={collection.error}
      onRetry={() => void collection.reload()}
      onNew={reset}
      onSelect={open}
      recordsToolbar={
        <>
          <View style={styles.fieldGrid}>
            <LabeledInput
              label="Search saved expenses"
              value={search}
              onChangeText={setSearch}
              placeholder="Title, merchant, or category"
            />
            <LabeledInput
              label="Exact category filter"
              value={categoryFilter}
              onChangeText={setCategoryFilter}
              placeholder="Leave blank for all"
            />
            <View style={styles.dateField}>
              <CalendarDateField
                label="From date"
                accessibilityLabel="Expense filter from date"
                value={fromDate}
                onChange={setFromDate}
                optional
              />
            </View>
            <View style={styles.dateField}>
              <CalendarDateField
                label="Through date"
                accessibilityLabel="Expense filter through date"
                value={throughDate}
                onChange={setThroughDate}
                optional
              />
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {filteredRecords.length} matching saved record
              {filteredRecords.length === 1 ? "" : "s"}
            </Text>
            <Text style={styles.summaryText}>
              {reviewedFilteredRecords.length} reviewed revision
              {reviewedFilteredRecords.length === 1 ? "" : "s"} eligible for this export
            </Text>
            {totalsByCurrency.map((total) => (
              <Text key={total.currency} style={styles.summaryText}>
                {formatMoneyMinor(total.amount, {
                  currency: total.currency,
                  minorUnitDigits: total.digits
                })}{" "}
                total
              </Text>
            ))}
            {reviewedFilteredRecords.length > 100 ? (
              <Text style={styles.errorText}>
                Narrow the filters to 100 or fewer reviewed revisions. GrowPathAI will not
                silently export a partial set.
              </Text>
            ) : null}
          </View>
          <ReviewedArtifactPanel
            workspace={workspace}
            artifactKind="expense_csv_batch"
            revisionSelections={artifactRevisionSelections}
            expectedRedactionProfile={
              BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.expense_csv_batch
            }
            title="Reviewed filtered Expense CSV"
            selectionLabel={
              reviewedFilteredRecords.length >= 1 && reviewedFilteredRecords.length <= 100
                ? `Pinned to ${reviewedFilteredRecords.length} exact reviewed Expense revision${reviewedFilteredRecords.length === 1 ? "" : "s"} matching the current filters.`
                : "Choose filters that match between 1 and 100 reviewed Expense revisions."
            }
            disclosure="This private workspace CSV can include merchant, date, amount, explicitly recorded tax, readable line items, category, payment method, related-record references, and reviewed notes. Receipt source files are not embedded. It is formula-safe but is not bookkeeping, a tax-deductibility decision, payment evidence, or a public copy."
            contextNotice={
              selected && !formMatchesSelectedRevision
                ? "The selected Expense editor contains unsaved changes. This batch remains pinned to the exact saved reviewed revisions matching the filters; those edits are not included."
                : undefined
            }
            disabled={
              collection.loading ||
              reviewedFilteredRecords.length < 1 ||
              reviewedFilteredRecords.length > 100
            }
            disabledReason="Only 1–100 exact saved Expense revisions whose record and field review states are both reviewed can be previewed. Narrow the filters when needed."
            previewButtonLabel="Preview filtered reviewed Expense CSV"
            prepareButtonLabel="Confirm and export reviewed Expense CSV"
            stalenessKey={artifactRevisionSelections
              .map((selection) => `${selection.recordId}:${selection.revisionNumber}`)
              .join("|")}
          />
        </>
      }
    >
      <AppCard
        title="Receipt intake"
        titleLevel={2}
        subtitle={
          providerCapabilities.loading
            ? "Secure upload is available while GrowPathAI checks whether review-gated extraction is configured."
            : extractionCapability?.enabled
              ? "Secure upload and review-gated receipt extraction are available. AI output remains staged until you explicitly apply it to an exact saved revision."
              : "Secure photo and PDF upload is available. Provider extraction is unavailable, so review and enter the receipt facts yourself."
        }
      >
        <Text style={styles.notice}>
          Uploading alone does not send a source to AI or fill business fields. Only an
          explicit extraction request can send the selected READY source, and only an
          explicit reviewed Apply can create a new saved revision.
        </Text>
        <ProtectedAttachmentField
          key={`${workspaceKey}:${activeAttachmentDraft.session}`}
          workspace={workspace}
          purpose="expense_receipt"
          maxCount={1}
          attachmentIds={activeAttachmentDraft.ids}
          title="Protected receipt source"
          hint="Attach one receipt photo, invoice image, or PDF. It remains private to this workspace."
          onReadyAttachmentIdsChange={(ids) =>
            setReadyAttachmentState({ workspaceKey, ids })
          }
          onChange={(ids) =>
            setAttachmentDraft((current) => ({
              ...(current.workspaceKey === workspaceKey
                ? current
                : {
                    workspaceKey,
                    ids: [] as string[],
                    editVersion: 0,
                    session: current.session,
                    blocking: false
                  }),
              workspaceKey,
              ids
            }))
          }
          onUserEdit={() =>
            setAttachmentDraft((current) => ({
              ...(current.workspaceKey === workspaceKey
                ? current
                : {
                    workspaceKey,
                    ids: [] as string[],
                    editVersion: 0,
                    session: current.session,
                    blocking: false
                  }),
              workspaceKey,
              editVersion:
                (current.workspaceKey === workspaceKey ? current.editVersion : 0) + 1
            }))
          }
          onBlockingChange={(blocking) =>
            setAttachmentDraft((current) =>
              current.workspaceKey === workspaceKey ? { ...current, blocking } : current
            )
          }
        />
        {providerCapabilities.error ? (
          <View style={styles.providerNotice}>
            <Text style={styles.errorText}>
              Provider availability could not be verified. No receipt will be sent.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry receipt extraction availability check"
              onPress={() => void providerCapabilities.reload()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Retry availability check</Text>
            </Pressable>
          </View>
        ) : !providerCapabilities.loading && !extractionCapability?.enabled ? (
          <Text accessibilityLiveRegion="polite" style={styles.notice}>
            {businessDeskCapabilityCopy(extractionCapability?.code)}
          </Text>
        ) : null}
        <View style={styles.providerNotice}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Extract a review draft from the saved READY receipt"
            accessibilityState={{
              busy: extractionOperation.busy === "starting",
              disabled:
                providerCapabilities.loading ||
                !extractionCapability?.enabled ||
                Boolean(extractionOperation.busy) ||
                !selected ||
                !formMatchesSelectedRevision ||
                !readyReceiptId ||
                selectedSavedReceiptId !== readyReceiptId
            }}
            disabled={
              providerCapabilities.loading ||
              !extractionCapability?.enabled ||
              Boolean(extractionOperation.busy) ||
              !selected ||
              !formMatchesSelectedRevision ||
              !readyReceiptId ||
              selectedSavedReceiptId !== readyReceiptId
            }
            onPress={() => void startExtraction()}
            style={[
              styles.primaryProviderButton,
              (providerCapabilities.loading ||
                !extractionCapability?.enabled ||
                Boolean(extractionOperation.busy) ||
                !selected ||
                !formMatchesSelectedRevision ||
                !readyReceiptId ||
                selectedSavedReceiptId !== readyReceiptId) &&
                styles.disabled
            ]}
          >
            <Text style={styles.primaryProviderButtonText}>
              {extractionOperation.busy === "starting"
                ? "Starting extraction…"
                : `Extract review draft${
                    extractionCapability?.creditCost
                      ? ` · ${extractionCapability.creditCost} AI credit${
                          extractionCapability.creditCost === 1 ? "" : "s"
                        }`
                      : ""
                  }`}
            </Text>
          </Pressable>
          <Text style={styles.notice}>
            First save the READY receipt on this expense. Extraction never decides tax
            deductibility, changes inventory, sends a document, or approves its own
            result.
          </Text>
        </View>
        <ProviderOperationStatus
          operation={extractionOperation.operation}
          busy={extractionOperation.busy}
          error={extractionOperation.error}
          notice={extractionOperation.notice}
          onRefresh={() => void extractionOperation.refresh().catch(() => undefined)}
          onCancel={() => void extractionOperation.cancel().catch(() => undefined)}
          onRecoverRecent={() =>
            void extractionOperation.recoverRecent().catch(() => undefined)
          }
          onStartNewAttempt={() =>
            void extractionOperation.startNewAttempt().catch((error) => {
              if (activeWorkspaceKey.current === workspaceKey) {
                setFormError(
                  error instanceof Error
                    ? error.message
                    : "A new extraction attempt could not be prepared."
                );
              }
            })
          }
        />
      </AppCard>

      {extractionResult ? (
        <ReceiptExtractionReview
          key={`${extractionOperation.operation?.id}:${extractionResult.resultDigestSha256}`}
          result={extractionResult}
          selectedRecordVersion={selected?.version || null}
          initialRecordTitle={selected?.title || ""}
          applicable={extractionAppliesToCurrentReceipt}
          applying={applyBusy}
          onApply={(reviewedExpense) => void applyReviewedExtraction(reviewedExpense)}
        />
      ) : null}

      <AppCard
        title={selected ? `Edit revision ${selected.version}` : "New manual expense"}
        titleLevel={2}
        subtitle="Tax is only the amount explicitly shown in your source. GrowPathAI does not decide deductibility."
      >
        <View style={styles.fieldGrid}>
          <LabeledInput
            label="Record title"
            value={title}
            onChangeText={setTitle}
            placeholder="August supply receipt"
          />
          <LabeledInput
            label="Merchant or vendor"
            value={merchant}
            onChangeText={setMerchant}
            placeholder="As shown on the source"
          />
          <View style={styles.dateField}>
            <CalendarDateField
              label="Expense date"
              accessibilityLabel="Expense date"
              value={occurredAt}
              onChange={setOccurredAt}
            />
          </View>
          <LabeledInput
            label="Currency"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            value={currency}
            onChangeText={setCurrency}
            placeholder="USD"
          />
          <LabeledInput
            label="Full amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
          />
          <LabeledInput
            label="Tax shown on source"
            keyboardType="decimal-pad"
            value={tax}
            onChangeText={setTax}
            placeholder="0.00"
            hint="Do not estimate tax."
          />
          <LabeledInput
            label="Category"
            value={category}
            onChangeText={setCategory}
            placeholder="Supplies"
          />
          <LabeledInput
            label="Payment method (optional)"
            value={paymentMethod}
            onChangeText={setPaymentMethod}
            placeholder="Card, cash, provider…"
          />
        </View>
        <Text style={styles.statusText}>
          Saved state: {selected ? selected.status.replace(/_/g, " ") : "not saved"}.
          Content saves always create a draft revision; review-state changes are separate.
        </Text>
      </AppCard>

      <AppCard
        title="Readable item lines"
        titleLevel={2}
        subtitle="Optional reviewed details. Line totals may be less than the full receipt, but never more."
      >
        <View style={styles.stack}>
          {lines.map((line, index) => (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineTitle}>Item {index + 1}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove expense item ${index + 1}`}
                  onPress={() =>
                    setLines((current) =>
                      current.filter((candidate) => candidate.id !== line.id)
                    )
                  }
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
              <View style={styles.fieldGrid}>
                <LabeledInput
                  label="Description"
                  accessibilityLabel={`Expense item ${index + 1} description`}
                  value={line.description}
                  onChangeText={(value) =>
                    setLines((current) =>
                      current.map((candidate) =>
                        candidate.id === line.id
                          ? { ...candidate, description: value }
                          : candidate
                      )
                    )
                  }
                />
                <LabeledInput
                  label="Quantity"
                  accessibilityLabel={`Expense item ${index + 1} quantity`}
                  keyboardType="decimal-pad"
                  value={line.quantity}
                  onChangeText={(value) =>
                    setLines((current) =>
                      current.map((candidate) =>
                        candidate.id === line.id
                          ? { ...candidate, quantity: value }
                          : candidate
                      )
                    )
                  }
                />
                <LabeledInput
                  label="Unit amount"
                  accessibilityLabel={`Expense item ${index + 1} unit amount`}
                  keyboardType="decimal-pad"
                  value={line.unitAmount}
                  onChangeText={(value) =>
                    setLines((current) =>
                      current.map((candidate) =>
                        candidate.id === line.id
                          ? { ...candidate, unitAmount: value }
                          : candidate
                      )
                    )
                  }
                />
                <LabeledInput
                  label="Item category"
                  accessibilityLabel={`Expense item ${index + 1} category`}
                  value={line.category}
                  onChangeText={(value) =>
                    setLines((current) =>
                      current.map((candidate) =>
                        candidate.id === line.id
                          ? { ...candidate, category: value }
                          : candidate
                      )
                    )
                  }
                />
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add expense item line"
            onPress={() => setLines((current) => [...current, newLine()])}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Add item line</Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard title="Notes and confirmation" titleLevel={2}>
        <LabeledInput
          label="Expense notes"
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Facts from the source or your reviewed context"
        />
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
        <View style={styles.transitionBox}>
          <Text style={styles.statusText}>
            Review actions apply only to the exact unchanged saved draft.
          </Text>
          <View style={styles.transitionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Review saved expense draft"
              accessibilityState={{
                busy: collection.saving,
                disabled: !exactSavedDraft || collection.saving
              }}
              disabled={!exactSavedDraft || collection.saving}
              onPress={() => void transitionExpense("reviewed")}
              style={[
                styles.transitionButton,
                (!exactSavedDraft || collection.saving) && styles.disabled
              ]}
            >
              <Text style={styles.transitionButtonText}>Mark reviewed</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mark saved expense needs correction"
              accessibilityState={{
                busy: collection.saving,
                disabled: !exactSavedDraft || collection.saving
              }}
              disabled={!exactSavedDraft || collection.saving}
              onPress={() => void transitionExpense("correction_required")}
              style={[
                styles.transitionButton,
                (!exactSavedDraft || collection.saving) && styles.disabled
              ]}
            >
              <Text style={styles.transitionButtonText}>Needs correction</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reject saved expense draft"
              accessibilityState={{
                busy: collection.saving,
                disabled: !exactSavedDraft || collection.saving
              }}
              disabled={!exactSavedDraft || collection.saving}
              onPress={() => void transitionExpense("rejected")}
              style={[
                styles.rejectButton,
                (!exactSavedDraft || collection.saving) && styles.disabled
              ]}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </Pressable>
          </View>
        </View>
        <RecordSaveArchiveActions
          saving={collection.saving}
          hasRecord={Boolean(businessDeskRecordId(selected))}
          saveLabel="Save expense draft"
          archiveReason={archiveReason}
          onArchiveReasonChange={setArchiveReason}
          onSave={() => void saveDraft()}
          onArchive={() => void archive()}
        />
      </AppCard>
    </RecordToolScaffold>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    dateField: { flexBasis: 230, flexGrow: 1, minWidth: 210 },
    disabled: { opacity: 0.55 },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedbackText: { color: palette.success, fontSize: 13, fontWeight: "800" },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    lineCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    lineHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    lineTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    notice: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    primaryProviderButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryProviderButtonText: {
      color: palette.accentText,
      fontSize: 13,
      fontWeight: "900"
    },
    providerNotice: { gap: 8 },
    removeText: { color: palette.danger, fontSize: 12, fontWeight: "900" },
    rejectButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    rejectButtonText: { color: palette.danger, fontSize: 13, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    stack: { gap: 10 },
    statusText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    summaryRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
    summaryText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    transitionBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    transitionButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    transitionButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    transitionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
  });
}
