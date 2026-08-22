import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  calculateBusinessDesk,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import {
  getBusinessInventoryItem,
  listBusinessInventory,
  mergeBusinessInventoryMovements,
  type BusinessInventoryItem,
  type BusinessInventoryMovement
} from "@/api/businessInventory";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import {
  LabeledInput,
  RecordSaveArchiveActions,
  StatusSelector
} from "@/features/businessDesk/RecordFormControls";
import RecordToolScaffold from "@/features/businessDesk/RecordToolScaffold";
import {
  formatMoneyMinor,
  formatQuantityMicros,
  isSupportedCurrencyCode,
  parseMoneyInput,
  parsePercentInput,
  parseQuantityInput,
  resolveCurrencyContext,
  type CurrencyContext
} from "@/features/businessDesk/money";
import {
  businessDeskRecordId,
  isoToLocalDateTime,
  localDateTimeToIso,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Availability = "unknown" | "in_stock" | "backorder" | "out_of_stock";
type PurchaseStatus =
  | "needed"
  | "reviewing"
  | "approved"
  | "ordered"
  | "received"
  | "cancelled";

type OfferDraft = {
  id: string;
  vendorName: string;
  unitPrice: string;
  minimumQuantity: string;
  shipping: string;
  fees: string;
  discountPercent: string;
  discountFixed: string;
  discountReviewed: boolean;
  tax: string;
  duty: string;
  availability: Availability;
  expiresAt: string;
  leadTimeDays: string;
  terms: string;
  notes: string;
};

type VendorOfferResult = {
  index: number;
  orderedQuantityMicros: number;
  productCostMinor: number | null;
  proposedDiscountMinor: number | null;
  discountMinor: number | null;
  discountReviewed: boolean;
  knownSubtotalMinor: number;
  taxMinor: number | null;
  dutyMinor: number | null;
  landedCostMinor: number | null;
  effectiveUnitCostMinor: number | null;
  availability: Availability;
  expiresAt: string | null;
  expired: boolean;
  eligibleForRecommendation: boolean;
  complete: boolean;
  incompleteReasons: string[];
};

type VendorCalculationResult = {
  calculator: "vendor";
  currency: string;
  minorUnitDigits: number;
  asOf: string | null;
  requestedQuantityMicros: number;
  offers: VendorOfferResult[];
  recommendedOfferIndex: number | null;
  complete: boolean;
};

type VendorCompareToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

const AVAILABILITY_OPTIONS: Array<{ value: Availability; label: string }> = [
  { value: "unknown", label: "Unknown" },
  { value: "in_stock", label: "In stock" },
  { value: "backorder", label: "Backorder" },
  { value: "out_of_stock", label: "Out of stock" }
];

const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  needed: "Needed",
  reviewing: "Reviewing",
  approved: "Approved",
  ordered: "Ordered off-platform (unverified)",
  received: "Received from verified B-02 evidence",
  cancelled: "Cancelled"
};

const REASON_LABELS: Record<string, string> = {
  UNIT_PRICE_UNKNOWN: "unit price is unknown",
  SHIPPING_UNKNOWN: "shipping is unknown",
  FEES_UNKNOWN: "fees are unknown",
  TAX_UNKNOWN: "tax is unknown",
  DUTY_UNKNOWN: "duty is unknown",
  DISCOUNT_REVIEW_REQUIRED: "the proposed discount is not reviewed"
};

let offerSequence = 0;

function nowLocalDateTime() {
  return isoToLocalDateTime(new Date().toISOString());
}

function newOffer(overrides: Partial<OfferDraft> = {}): OfferDraft {
  offerSequence += 1;
  return {
    id: "vendor-offer-" + offerSequence,
    vendorName: "",
    unitPrice: "",
    minimumQuantity: "0",
    shipping: "",
    fees: "",
    discountPercent: "0",
    discountFixed: "0",
    discountReviewed: false,
    tax: "",
    duty: "",
    availability: "unknown",
    expiresAt: "",
    leadTimeDays: "",
    terms: "",
    notes: "",
    ...overrides
  };
}

function payloadOf(record: BusinessDeskRecord | null) {
  return (record?.payload?.vendorComparison || {}) as any;
}

function recordSourceInventoryId(record: BusinessDeskRecord | null) {
  const source = record?.sourceLinks?.find(
    (candidate) => candidate.entityType === "inventory_item"
  );
  return String(source?.entityId || payloadOf(record).inventoryItemId || "");
}

function majorInput(value: unknown, digits: number) {
  if (!Number.isSafeInteger(value)) return "";
  return (Number(value) / 10 ** digits).toFixed(digits);
}

function quantityInput(value: unknown, fallback = "0") {
  return Number.isSafeInteger(value) ? String(Number(value) / 1_000_000) : fallback;
}

function percentInput(value: unknown) {
  return Number.isSafeInteger(value) ? String(Number(value) / 100) : "0";
}

function inventoryId(item: BusinessInventoryItem) {
  return String(item.id || item._id || "");
}

function movementId(movement: BusinessInventoryMovement) {
  return String(movement.id || movement._id || "");
}

function isPositiveReceipt(movement: BusinessInventoryMovement) {
  const quantity = Number(
    movement.quantityDelta === undefined ? movement.quantity : movement.quantityDelta
  );
  return movement.movementType === "receive" && Number.isFinite(quantity) && quantity > 0;
}

function cleanOfferForFingerprint(offer: OfferDraft) {
  const { id: _id, ...content } = offer;
  return content;
}

export default function VendorCompareTool({
  workspace,
  workspaceLabel,
  basePath
}: VendorCompareToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const collection = useBusinessDeskRecordCollection(workspace, "vendor_comparison");
  const workspaceType = workspace.workspaceType;
  const workspaceFacilityId = workspaceType === "facility" ? workspace.facilityId : "";
  const inventoryWorkspace = useMemo(
    () => (workspaceType === "facility" ? { facilityId: workspaceFacilityId } : {}),
    [workspaceFacilityId, workspaceType]
  );
  const [selected, setSelected] = useState<BusinessDeskRecord | null>(null);
  const [title, setTitle] = useState("");
  const [itemName, setItemName] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("1");
  const [currency, setCurrency] = useState("");
  const [asOf, setAsOf] = useState(nowLocalDateTime);
  const [offers, setOffers] = useState<OfferDraft[]>([newOffer()]);
  const [notes, setNotes] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("needed");
  const [selectedOfferIndex, setSelectedOfferIndex] = useState<number | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [manualOrderReference, setManualOrderReference] = useState("");
  const [inventoryReceiptMovementId, setInventoryReceiptMovementId] = useState("");
  const [receiptMovements, setReceiptMovements] = useState<BusinessInventoryMovement[]>(
    []
  );
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [receiptReloadEpoch, setReceiptReloadEpoch] = useState(0);
  const [archiveReason, setArchiveReason] = useState("");
  const [savedContentFingerprint, setSavedContentFingerprint] = useState("");
  const [result, setResult] = useState<VendorCalculationResult | null>(null);
  const [resultFingerprint, setResultFingerprint] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [inventoryItems, setInventoryItems] = useState<BusinessInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState("");

  const contentFingerprint = JSON.stringify({
    title,
    itemName,
    inventoryItemId,
    requestedQuantity,
    currency,
    asOf,
    offers: offers.map(cleanOfferForFingerprint),
    notes,
    selectedOfferIndex,
    reviewReason
  });
  const calculationFingerprint = JSON.stringify({
    requestedQuantity,
    currency,
    asOf,
    offers: offers.map(cleanOfferForFingerprint)
  });
  const visibleResult = resultFingerprint === calculationFingerprint ? result : null;
  const currencyReady = isSupportedCurrencyCode(currency);
  const contentDirty =
    Boolean(selected) && contentFingerprint !== savedContentFingerprint;

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError("");
    try {
      setInventoryItems(await listBusinessInventory(inventoryWorkspace));
    } catch (error) {
      setInventoryError(
        error instanceof Error
          ? error.message
          : "Inventory references could not be loaded."
      );
    } finally {
      setInventoryLoading(false);
    }
  }, [inventoryWorkspace]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    if (!inventoryItemId || !new Set(["ordered", "received"]).has(purchaseStatus)) {
      return;
    }
    let active = true;
    const loadReceipts = async () => {
      setReceiptLoading(true);
      setReceiptError("");
      try {
        let detail = await getBusinessInventoryItem(inventoryWorkspace, inventoryItemId, {
          movementLimit: 100
        });
        let movements = detail.movements;
        const seenCursors = new Set<string>();
        let pages = 0;
        while (detail.movementPage?.hasMore && detail.movementPage.nextCursor) {
          const cursor = detail.movementPage.nextCursor;
          if (seenCursors.has(cursor) || pages >= 100) {
            throw new Error("Receipt history pagination did not complete safely.");
          }
          seenCursors.add(cursor);
          pages += 1;
          detail = await getBusinessInventoryItem(inventoryWorkspace, inventoryItemId, {
            movementLimit: 100,
            movementCursor: cursor
          });
          movements = mergeBusinessInventoryMovements(movements, detail.movements);
        }
        if (active) {
          setReceiptMovements(
            movements.filter(
              (movement) => movementId(movement) && isPositiveReceipt(movement)
            )
          );
        }
      } catch (error) {
        if (active) {
          setReceiptMovements([]);
          setReceiptError(
            error instanceof Error
              ? error.message
              : "Verified B-02 receipt evidence could not be loaded."
          );
        }
      } finally {
        if (active) setReceiptLoading(false);
      }
    };
    void loadReceipts();
    return () => {
      active = false;
    };
  }, [inventoryItemId, inventoryWorkspace, purchaseStatus, receiptReloadEpoch]);

  const reset = () => {
    setSelected(null);
    setTitle("");
    setItemName("");
    setInventoryItemId("");
    setRequestedQuantity("1");
    setCurrency("");
    setAsOf(nowLocalDateTime());
    setOffers([newOffer()]);
    setNotes("");
    setPurchaseStatus("needed");
    setSelectedOfferIndex(null);
    setReviewReason("");
    setManualOrderReference("");
    setInventoryReceiptMovementId("");
    setReceiptMovements([]);
    setReceiptLoading(false);
    setReceiptError("");
    setReceiptReloadEpoch(0);
    setArchiveReason("");
    setSavedContentFingerprint("");
    setResult(null);
    setResultFingerprint("");
    setFormError("");
    setFeedback("");
  };

  const open = (record: BusinessDeskRecord) => {
    const payload = payloadOf(record);
    const digits = Number.isInteger(payload.minorUnitDigits)
      ? Number(payload.minorUnitDigits)
      : 2;
    const nextOffers = Array.isArray(payload.offers)
      ? payload.offers.map((offer: any) =>
          newOffer({
            vendorName: String(offer.vendorName || ""),
            unitPrice: majorInput(offer.unitPriceMinor, digits),
            minimumQuantity: quantityInput(offer.minimumQuantityMicros),
            shipping: majorInput(offer.shippingCostMinor, digits),
            fees: majorInput(offer.feesMinor, digits),
            discountPercent: percentInput(offer.discount?.percentBasisPoints),
            discountFixed: majorInput(offer.discount?.fixedMinor, digits) || "0",
            discountReviewed: Boolean(offer.discountReviewed),
            tax: majorInput(offer.taxMinor, digits),
            duty: majorInput(offer.dutyMinor, digits),
            availability: (offer.availability || "unknown") as Availability,
            expiresAt: isoToLocalDateTime(offer.expiresAt),
            leadTimeDays:
              offer.leadTimeDays === null || offer.leadTimeDays === undefined
                ? ""
                : String(offer.leadTimeDays),
            terms: String(offer.terms || ""),
            notes: String(offer.notes || "")
          })
        )
      : [newOffer()];
    const request = payload.purchaseRequest || {};
    const next = {
      title: record.title || "",
      itemName: String(payload.itemName || ""),
      inventoryItemId: recordSourceInventoryId(record),
      requestedQuantity: quantityInput(payload.requestedQuantityMicros, "1"),
      currency: String(payload.currency || ""),
      asOf: isoToLocalDateTime(payload.asOf) || nowLocalDateTime(),
      offers: nextOffers.length ? nextOffers : [newOffer()],
      notes: String(payload.notes || ""),
      selectedOfferIndex: Number.isInteger(request.selectedOfferIndex)
        ? Number(request.selectedOfferIndex)
        : null,
      reviewReason: String(request.reviewReason || ""),
      manualOrderReference: String(request.externalOrderReference || ""),
      inventoryReceiptMovementId: String(request.inventoryReceiptMovementId || "")
    };
    setSelected(record);
    setTitle(next.title);
    setItemName(next.itemName);
    setInventoryItemId(next.inventoryItemId);
    setRequestedQuantity(next.requestedQuantity);
    setCurrency(next.currency);
    setAsOf(next.asOf);
    setOffers(next.offers);
    setNotes(next.notes);
    setPurchaseStatus(record.status as PurchaseStatus);
    setSelectedOfferIndex(next.selectedOfferIndex);
    setReviewReason(next.reviewReason);
    setManualOrderReference(next.manualOrderReference);
    setInventoryReceiptMovementId(next.inventoryReceiptMovementId);
    setArchiveReason("");
    setSavedContentFingerprint(
      JSON.stringify({
        title: next.title,
        itemName: next.itemName,
        inventoryItemId: next.inventoryItemId,
        requestedQuantity: next.requestedQuantity,
        currency: next.currency,
        asOf: next.asOf,
        offers: next.offers.map(cleanOfferForFingerprint),
        notes: next.notes,
        selectedOfferIndex: next.selectedOfferIndex,
        reviewReason: next.reviewReason
      })
    );
    setResult(null);
    setResultFingerprint("");
    setFormError("");
    setFeedback("Loaded saved " + record.status + " revision " + record.version + ".");
  };

  const updateOffer = (index: number, patch: Partial<OfferDraft>) => {
    setOffers((current) =>
      current.map((offer, offerIndex) =>
        offerIndex === index ? { ...offer, ...patch } : offer
      )
    );
  };

  const buildCalculationInput = () => {
    const context = resolveCurrencyContext(currency);
    const normalizedAsOf = localDateTimeToIso(asOf);
    if (!normalizedAsOf) throw new Error("Choose the comparison date and time.");
    const quantityMicros = parseQuantityInput(requestedQuantity, {
      label: "Requested quantity"
    });
    if (!quantityMicros || quantityMicros <= 0) {
      throw new Error("Requested quantity must be greater than zero.");
    }
    if (!offers.length) throw new Error("Add at least one vendor offer.");
    const normalizedOffers = offers.map((offer, index) => {
      if (!offer.vendorName.trim()) {
        throw new Error("Offer " + (index + 1) + " needs a vendor name.");
      }
      const leadTimeRaw = offer.leadTimeDays.trim();
      const leadTimeDays = leadTimeRaw ? Number(leadTimeRaw) : null;
      if (
        leadTimeDays !== null &&
        (!Number.isInteger(leadTimeDays) || leadTimeDays < 0 || leadTimeDays > 36_500)
      ) {
        throw new Error("Offer " + (index + 1) + " lead time must be whole days.");
      }
      return {
        vendorName: offer.vendorName.trim(),
        unitPriceMinor: parseMoneyInput(offer.unitPrice, context, {
          label: "Offer " + (index + 1) + " unit price",
          allowBlank: true
        }),
        currency: context.currency,
        minimumQuantityMicros:
          parseQuantityInput(offer.minimumQuantity, {
            label: "Offer " + (index + 1) + " minimum quantity"
          }) || 0,
        shippingCostMinor: parseMoneyInput(offer.shipping, context, {
          label: "Offer " + (index + 1) + " shipping",
          allowBlank: true
        }),
        feesMinor: parseMoneyInput(offer.fees, context, {
          label: "Offer " + (index + 1) + " fees",
          allowBlank: true
        }),
        discount: {
          order: "percent_then_fixed" as const,
          percentBasisPoints:
            parsePercentInput(offer.discountPercent, {
              label: "Offer " + (index + 1) + " discount"
            }) || 0,
          fixedMinor:
            parseMoneyInput(offer.discountFixed, context, {
              label: "Offer " + (index + 1) + " fixed discount"
            }) || 0,
          currency: context.currency
        },
        discountReviewed: offer.discountReviewed,
        taxMinor: parseMoneyInput(offer.tax, context, {
          label: "Offer " + (index + 1) + " tax",
          allowBlank: true
        }),
        dutyMinor: parseMoneyInput(offer.duty, context, {
          label: "Offer " + (index + 1) + " duty",
          allowBlank: true
        }),
        availability: offer.availability,
        expiresAt: localDateTimeToIso(offer.expiresAt),
        leadTimeDays,
        terms: offer.terms.trim(),
        notes: offer.notes.trim()
      };
    });
    return {
      calculator: "vendor" as const,
      currency: context.currency,
      minorUnitDigits: context.minorUnitDigits,
      requestedQuantityMicros: quantityMicros,
      asOf: normalizedAsOf,
      offers: normalizedOffers
    };
  };

  const calculate = async () => {
    if (busy) return;
    setBusy(true);
    setFormError("");
    setFeedback("");
    try {
      const calculated = await calculateBusinessDesk<VendorCalculationResult>(
        workspace,
        buildCalculationInput()
      );
      setResult(calculated);
      setResultFingerprint(calculationFingerprint);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Vendor offers could not be compared."
      );
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (busy || collection.saving) return;
    setFormError("");
    setFeedback("");
    try {
      if (!title.trim()) throw new Error("Give this comparison a clear record title.");
      if (!itemName.trim()) throw new Error("Enter the item being compared.");
      const calculatedInput = buildCalculationInput();
      const chosenItem = inventoryItems.find(
        (candidate) => inventoryId(candidate) === inventoryItemId
      );
      const createsNewNeededRevision = Boolean(selected && selected.status !== "needed");
      const saved = await collection.save(
        {
          title: title.trim(),
          status: "needed",
          payload: {
            vendorComparison: {
              itemName: itemName.trim(),
              inventoryItemId,
              requestedQuantityMicros: calculatedInput.requestedQuantityMicros,
              asOf: calculatedInput.asOf,
              currency: calculatedInput.currency,
              minorUnitDigits: calculatedInput.minorUnitDigits,
              offers: calculatedInput.offers,
              purchaseRequest: {
                status: "needed",
                selectedOfferIndex,
                reviewReason: reviewReason.trim(),
                orderOrigin: "none",
                externalOrderReference: "",
                orderRecordedAt: null,
                inventoryReceiptMovementId: "",
                inventoryReceiptRecordedAt: null
              },
              notes: notes.trim()
            }
          },
          sourceLinks: inventoryItemId
            ? [
                {
                  entityType: "inventory_item",
                  entityId: inventoryItemId,
                  label: chosenItem?.name || itemName.trim()
                }
              ]
            : []
        },
        selected
      );
      open(saved);
      setFeedback(
        createsNewNeededRevision
          ? "Edited content was saved as new Needed revision " +
              saved.version +
              ". Review and approval must be repeated for this exact revision."
          : "Vendor comparison Needed revision " + saved.version + " saved."
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The vendor comparison could not be saved."
      );
    }
  };

  const transitionPurchaseRequest = async (targetStatus: PurchaseStatus) => {
    if (busy || collection.saving) return;
    setBusy(true);
    setFormError("");
    setFeedback("");
    try {
      if (!selected) throw new Error("Save the comparison as Needed first.");
      if (contentDirty) {
        throw new Error(
          "Save the changed content as a new Needed revision before changing its state."
        );
      }
      const expectedCurrent: Partial<Record<PurchaseStatus, PurchaseStatus>> = {
        reviewing: "needed",
        approved: "reviewing",
        ordered: "approved",
        received: "ordered"
      };
      const expected = expectedCurrent[targetStatus];
      if (expected && selected.status !== expected) {
        throw new Error(
          "This action requires the exact unchanged " +
            PURCHASE_STATUS_LABELS[expected] +
            " revision."
        );
      }
      if (targetStatus === "cancelled") {
        if (
          !new Set(["needed", "reviewing", "approved", "ordered"]).has(selected.status)
        ) {
          throw new Error("This purchase request can no longer be cancelled.");
        }
      }
      if (
        new Set<PurchaseStatus>(["reviewing", "approved", "ordered", "received"]).has(
          targetStatus
        ) &&
        (selectedOfferIndex === null || !reviewReason.trim())
      ) {
        throw new Error(
          "Save a selected offer and a human review reason before continuing."
        );
      }
      if (targetStatus === "received" && !inventoryReceiptMovementId) {
        throw new Error("Select a successful positive B-02 receipt movement.");
      }
      const transitionEvidence =
        targetStatus === "ordered"
          ? {
              orderOrigin: "manual_off_platform" as const,
              ...(manualOrderReference.trim()
                ? { externalOrderReference: manualOrderReference.trim() }
                : {})
            }
          : targetStatus === "received"
            ? { inventoryReceiptMovementId }
            : undefined;
      const transitioned = await collection.transition(selected, {
        status: targetStatus,
        ...(transitionEvidence ? { transitionEvidence } : {})
      });
      open(transitioned);
      const feedbackByStatus: Record<PurchaseStatus, string> = {
        needed: "Purchase request returned to Needed.",
        reviewing: "The exact saved revision is now under review.",
        approved: "The exact reviewed revision is approved.",
        ordered:
          "Outside order recorded as unverified. GrowPathAI did not place or pay for it.",
        received:
          "Receipt verified against the selected positive B-02 movement. B-03 did not change inventory.",
        cancelled: "Purchase request cancelled."
      };
      setFeedback(feedbackByStatus[targetStatus]);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The purchase-request state could not be changed."
      );
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    setFormError("");
    setFeedback("");
    try {
      if (!selected) return;
      if (archiveReason.trim().length < 3) {
        throw new Error("Enter an archive reason with at least three characters.");
      }
      await collection.archive(selected, archiveReason.trim());
      reset();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The comparison could not be archived."
      );
    }
  };

  const selectedInventoryMissing = Boolean(
    inventoryItemId &&
    !inventoryLoading &&
    !inventoryItems.some((item) => inventoryId(item) === inventoryItemId)
  );

  return (
    <RecordToolScaffold
      title="Vendor Compare"
      workspaceLabel={workspaceLabel}
      basePath={basePath}
      description="Compare reviewed vendor inputs in one currency, then optionally prepare a human-reviewed purchase request without placing an order or changing inventory."
      records={collection.records}
      selectedRecord={selected}
      loading={collection.loading}
      error={collection.error}
      onRetry={() => void collection.reload()}
      onNew={reset}
      onSelect={open}
    >
      <AppCard
        title={
          selected
            ? "Edit comparison revision " + selected.version
            : "New vendor comparison"
        }
        titleLevel={2}
        subtitle="Blank unit price, tax, or duty remains unknown. Only complete, available, unexpired offers can be recommended."
      >
        <View style={styles.fieldGrid}>
          <LabeledInput
            label="Record title"
            accessibilityLabel="Vendor comparison record title"
            value={title}
            onChangeText={setTitle}
            placeholder="Spring soil supplier comparison"
          />
          <LabeledInput
            label="Item"
            accessibilityLabel="Vendor comparison item"
            value={itemName}
            onChangeText={setItemName}
            placeholder="Product, material, or service"
          />
          <LabeledInput
            label="Requested quantity"
            accessibilityLabel="Vendor requested quantity"
            keyboardType="decimal-pad"
            value={requestedQuantity}
            onChangeText={setRequestedQuantity}
            placeholder="1"
          />
          <LabeledInput
            label="Currency"
            accessibilityLabel="Vendor comparison currency"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            value={currency}
            onChangeText={setCurrency}
            placeholder="Three-letter ISO code"
            hint="Required for comparison and save. GrowPathAI assumes no currency and performs no FX."
          />
          <View style={styles.dateField}>
            <CalendarDateField
              label="Compared as of"
              accessibilityLabel="Vendor comparison as of date and time"
              mode="datetime"
              value={asOf}
              onChange={setAsOf}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optional B-02 inventory source</Text>
          <Text style={styles.bodyText}>
            This is a read-only source link. Saving or approving this comparison never
            changes stock, cost, location, lot, or receiving.
          </Text>
          {inventoryLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.bodyText}>Loading authorized inventory items…</Text>
            </View>
          ) : (
            <View style={styles.choiceRow}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel="No inventory item source"
                accessibilityState={{ checked: !inventoryItemId }}
                onPress={() => setInventoryItemId("")}
                style={[styles.choice, !inventoryItemId && styles.choiceSelected]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    !inventoryItemId && styles.choiceTextSelected
                  ]}
                >
                  No inventory link
                </Text>
              </Pressable>
              {inventoryItems.map((item) => {
                const id = inventoryId(item);
                const chosen = id === inventoryItemId;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="radio"
                    accessibilityLabel={"Link inventory item " + item.name}
                    accessibilityState={{ checked: chosen }}
                    onPress={() => {
                      setInventoryItemId(id);
                      if (!itemName.trim()) setItemName(item.name);
                    }}
                    style={[styles.choice, chosen && styles.choiceSelected]}
                  >
                    <Text
                      style={[styles.choiceText, chosen && styles.choiceTextSelected]}
                    >
                      {item.name}
                      {item.sku ? " · " + item.sku : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          {inventoryError ? (
            <View style={styles.inlineRow}>
              <Text style={styles.warningText}>{inventoryError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry inventory source list"
                onPress={() => void loadInventory()}
              >
                <Text style={styles.linkText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          {selectedInventoryMissing ? (
            <Text style={styles.warningText}>
              The saved inventory source is not in the current authorized list. It remains
              selected so the server can recheck it; remove it before saving if access
              changed.
            </Text>
          ) : null}
        </View>

        <View style={styles.offerStack}>
          {offers.map((offer, index) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <Text style={styles.offerTitle}>Offer {index + 1}</Text>
                {offers.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={"Remove vendor offer " + (index + 1)}
                    onPress={() => {
                      setOffers((current) => current.filter((_, i) => i !== index));
                      setSelectedOfferIndex((current) =>
                        current === index
                          ? null
                          : current !== null && current > index
                            ? current - 1
                            : current
                      );
                    }}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.fieldGrid}>
                <LabeledInput
                  label="Vendor"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " name"}
                  value={offer.vendorName}
                  onChangeText={(value) => updateOffer(index, { vendorName: value })}
                  placeholder="Vendor name"
                />
                <LabeledInput
                  label="Unit price"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " unit price"}
                  keyboardType="decimal-pad"
                  value={offer.unitPrice}
                  onChangeText={(value) => updateOffer(index, { unitPrice: value })}
                  placeholder="Unknown if blank"
                />
                <LabeledInput
                  label="Minimum order quantity"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " minimum quantity"}
                  keyboardType="decimal-pad"
                  value={offer.minimumQuantity}
                  onChangeText={(value) => updateOffer(index, { minimumQuantity: value })}
                  placeholder="0"
                />
                <LabeledInput
                  label="Shipping"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " shipping"}
                  keyboardType="decimal-pad"
                  value={offer.shipping}
                  onChangeText={(value) => updateOffer(index, { shipping: value })}
                  placeholder="0"
                />
                <LabeledInput
                  label="Fees"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " fees"}
                  keyboardType="decimal-pad"
                  value={offer.fees}
                  onChangeText={(value) => updateOffer(index, { fees: value })}
                  placeholder="0"
                />
                <LabeledInput
                  label="Discount percent"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " discount percent"}
                  keyboardType="decimal-pad"
                  value={offer.discountPercent}
                  onChangeText={(value) => updateOffer(index, { discountPercent: value })}
                  placeholder="0"
                />
                <LabeledInput
                  label="Discount fixed amount"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " fixed discount"}
                  keyboardType="decimal-pad"
                  value={offer.discountFixed}
                  onChangeText={(value) => updateOffer(index, { discountFixed: value })}
                  placeholder="0"
                />
                <LabeledInput
                  label="Tax explicitly supplied"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " tax"}
                  keyboardType="decimal-pad"
                  value={offer.tax}
                  onChangeText={(value) => updateOffer(index, { tax: value })}
                  placeholder="Unknown if blank"
                  hint="GrowPathAI never chooses tax or taxability."
                />
                <LabeledInput
                  label="Duty explicitly supplied"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " duty"}
                  keyboardType="decimal-pad"
                  value={offer.duty}
                  onChangeText={(value) => updateOffer(index, { duty: value })}
                  placeholder="Unknown if blank"
                />
                <LabeledInput
                  label="Lead time (whole days)"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " lead time"}
                  keyboardType="number-pad"
                  value={offer.leadTimeDays}
                  onChangeText={(value) => updateOffer(index, { leadTimeDays: value })}
                  placeholder="Unknown if blank"
                />
                <View style={styles.dateField}>
                  <CalendarDateField
                    label="Offer expires"
                    accessibilityLabel={
                      "Vendor offer " + (index + 1) + " expiry date and time"
                    }
                    mode="datetime"
                    value={offer.expiresAt}
                    onChange={(value) => updateOffer(index, { expiresAt: value })}
                    placeholder="No expiry supplied"
                  />
                </View>
              </View>
              <StatusSelector
                label={"Offer " + (index + 1) + " availability"}
                value={offer.availability}
                options={AVAILABILITY_OPTIONS}
                onChange={(value) => updateOffer(index, { availability: value })}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={"Vendor offer " + (index + 1) + " discount reviewed"}
                accessibilityState={{ checked: offer.discountReviewed }}
                onPress={() =>
                  updateOffer(index, { discountReviewed: !offer.discountReviewed })
                }
                style={styles.checkboxRow}
              >
                <View
                  style={[
                    styles.checkbox,
                    offer.discountReviewed && styles.checkboxChecked
                  ]}
                />
                <View style={styles.checkboxCopy}>
                  <Text style={styles.checkboxLabel}>Discount reviewed</Text>
                  <Text style={styles.checkboxHint}>
                    Required before a nonzero proposed discount contributes to complete
                    landed cost.
                  </Text>
                </View>
              </Pressable>
              <View style={styles.fieldGrid}>
                <LabeledInput
                  label="Terms"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " terms"}
                  multiline
                  value={offer.terms}
                  onChangeText={(value) => updateOffer(index, { terms: value })}
                  placeholder="Recorded vendor terms"
                />
                <LabeledInput
                  label="Offer notes"
                  accessibilityLabel={"Vendor offer " + (index + 1) + " notes"}
                  multiline
                  value={offer.notes}
                  onChangeText={(value) => updateOffer(index, { notes: value })}
                  placeholder="Availability, service, or user-stated tradeoffs"
                />
              </View>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add vendor offer"
          onPress={() => setOffers((current) => [...current, newOffer()])}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Add another offer</Text>
        </Pressable>
        <LabeledInput
          label="Comparison notes"
          accessibilityLabel="Vendor comparison notes"
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="User-stated priorities or tradeoffs"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate vendor comparison"
          accessibilityState={{ busy, disabled: busy || !currencyReady }}
          disabled={busy || !currencyReady}
          onPress={() => void calculate()}
          style={[styles.primaryButton, (busy || !currencyReady) && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>Compare exact costs</Text>
          )}
        </Pressable>
      </AppCard>

      <AppCard
        title="Deterministic comparison"
        titleLevel={2}
        subtitle="Landed cost = product extension + shipping + fees + explicit tax + explicit duty − reviewed discount."
      >
        {visibleResult ? (
          <View style={styles.resultStack}>
            <Text style={styles.bodyText}>
              Requested {formatQuantityMicros(visibleResult.requestedQuantityMicros)} ·{" "}
              {visibleResult.currency}
            </Text>
            {visibleResult.offers.map((offerResult) => {
              const sourceOffer = offers[offerResult.index];
              const context: CurrencyContext = {
                currency: visibleResult.currency,
                minorUnitDigits: visibleResult.minorUnitDigits
              };
              const recommended =
                visibleResult.recommendedOfferIndex === offerResult.index;
              return (
                <View
                  key={"vendor-result-" + offerResult.index}
                  style={[styles.resultCard, recommended && styles.resultRecommended]}
                >
                  <Text style={styles.resultTitle}>
                    {sourceOffer?.vendorName || "Offer " + (offerResult.index + 1)}
                    {recommended ? " · Recommended eligible cost" : ""}
                  </Text>
                  <Text style={styles.resultMetric}>
                    {offerResult.complete
                      ? "Complete landed cost: " +
                        formatMoneyMinor(offerResult.landedCostMinor, context)
                      : "Known-cost subtotal: " +
                        formatMoneyMinor(offerResult.knownSubtotalMinor, context)}
                  </Text>
                  <Text style={styles.bodyText}>
                    Ordered quantity:{" "}
                    {formatQuantityMicros(offerResult.orderedQuantityMicros)} · Effective
                    unit: {formatMoneyMinor(offerResult.effectiveUnitCostMinor, context)}
                  </Text>
                  <Text style={styles.bodyText}>
                    Availability: {offerResult.availability.replace(/_/g, " ")}
                    {offerResult.expired ? " · Expired" : ""}
                  </Text>
                  {offerResult.incompleteReasons.length ? (
                    <Text style={styles.warningText}>
                      Incomplete because{" "}
                      {offerResult.incompleteReasons
                        .map((reason) => REASON_LABELS[reason] || reason)
                        .join(", ")}
                      .
                    </Text>
                  ) : null}
                </View>
              );
            })}
            {visibleResult.recommendedOfferIndex === null ? (
              <Text style={styles.warningText}>
                No offer is both complete, available, and unexpired, so no recommendation
                is shown.
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.bodyText}>
            Compare the current inputs to see complete landed costs, known subtotals,
            missing reasons, and the lowest eligible complete offer. Changed inputs
            require a new calculation.
          </Text>
        )}
      </AppCard>

      <AppCard
        title="Optional purchase request"
        titleLevel={2}
        subtitle="This reviewed record never sends an order. An off-platform order remains unverified until B-02 separately records a successful receipt or movement."
      >
        <View style={styles.statusPanel}>
          <Text style={styles.statusLabel}>Current state</Text>
          <Text
            accessibilityLabel="Purchase request current state"
            style={styles.statusValue}
          >
            {PURCHASE_STATUS_LABELS[purchaseStatus]}
          </Text>
          {contentDirty ? (
            <Text style={styles.warningText}>
              The form differs from saved revision {selected?.version}. Saving creates a
              new Needed revision; it never carries forward review, approval, order, or
              receipt status.
            </Text>
          ) : null}
        </View>
        <Text style={styles.bodyText}>
          State changes apply only to the exact unchanged saved revision. Only the B-02
          inventory ledger can supply receipt evidence or change stock.
        </Text>
        <View accessibilityRole="radiogroup" style={styles.choiceRow}>
          {offers.map((offer, index) => {
            const chosen = selectedOfferIndex === index;
            return (
              <Pressable
                key={offer.id}
                accessibilityRole="radio"
                accessibilityLabel={"Select purchase offer " + (index + 1)}
                accessibilityState={{ checked: chosen }}
                onPress={() => setSelectedOfferIndex(index)}
                style={[styles.choice, chosen && styles.choiceSelected]}
              >
                <Text style={[styles.choiceText, chosen && styles.choiceTextSelected]}>
                  {offer.vendorName.trim() || "Offer " + (index + 1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <LabeledInput
          label="Human review reason"
          accessibilityLabel="Purchase request review reason"
          multiline
          value={reviewReason}
          onChangeText={setReviewReason}
          placeholder="Why this offer and state are appropriate"
        />
        {purchaseStatus === "approved" || purchaseStatus === "ordered" ? (
          <View style={styles.section}>
            <LabeledInput
              label="Outside order reference"
              accessibilityLabel="Outside order reference"
              value={manualOrderReference}
              onChangeText={setManualOrderReference}
              placeholder="Optional vendor confirmation or PO reference"
            />
            <Text style={styles.bodyText}>
              The server records the actor and time when Ordered is selected. This
              optional reference does not verify that a provider received the order.
            </Text>
          </View>
        ) : null}
        {purchaseStatus === "ordered" || purchaseStatus === "received" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>B-02 receipt evidence</Text>
            {!inventoryItemId ? (
              <Text style={styles.warningText}>
                Link this comparison to a B-02 inventory item before receipt can be
                verified.
              </Text>
            ) : receiptLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={palette.accent} />
                <Text style={styles.bodyText}>Loading complete receipt history…</Text>
              </View>
            ) : receiptError ? (
              <Text style={styles.errorText}>{receiptError}</Text>
            ) : receiptMovements.length ? (
              <View accessibilityRole="radiogroup" style={styles.receiptStack}>
                {receiptMovements.map((movement) => {
                  const id = movementId(movement);
                  const chosen = inventoryReceiptMovementId === id;
                  const quantity = Number(
                    movement.quantityDelta === undefined
                      ? movement.quantity
                      : movement.quantityDelta
                  );
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="radio"
                      accessibilityLabel={"Use B-02 receipt " + id}
                      accessibilityState={{ checked: chosen }}
                      disabled={purchaseStatus === "received"}
                      onPress={() => setInventoryReceiptMovementId(id)}
                      style={[styles.receiptChoice, chosen && styles.choiceSelected]}
                    >
                      <Text
                        style={[styles.choiceText, chosen && styles.choiceTextSelected]}
                      >
                        {movement.reason || "Inventory receipt"} · +{quantity}
                        {movement.occurredAt
                          ? " · " + new Date(movement.occurredAt).toLocaleString()
                          : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.warningText}>
                No positive Receive movements exist for this inventory item yet. Record
                the real receipt in B-02 Inventory first, then return here.
              </Text>
            )}
            {purchaseStatus === "ordered" && inventoryItemId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh B-02 receipt evidence"
                disabled={receiptLoading}
                onPress={() => setReceiptReloadEpoch((current) => current + 1)}
                style={[styles.secondaryButton, receiptLoading && styles.disabled]}
              >
                <Text style={styles.secondaryButtonText}>Refresh receipt evidence</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <View style={styles.lifecycleActions}>
          {purchaseStatus === "needed" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Move purchase request to reviewing"
              disabled={contentDirty || busy || collection.saving || !currencyReady}
              onPress={() => void transitionPurchaseRequest("reviewing")}
              style={[
                styles.primaryButton,
                (contentDirty || busy || collection.saving || !currencyReady) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.primaryButtonText}>Start exact-revision review</Text>
            </Pressable>
          ) : null}
          {purchaseStatus === "reviewing" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Approve purchase request"
              disabled={contentDirty || busy || collection.saving || !currencyReady}
              onPress={() => void transitionPurchaseRequest("approved")}
              style={[
                styles.primaryButton,
                (contentDirty || busy || collection.saving || !currencyReady) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.primaryButtonText}>Approve exact revision</Text>
            </Pressable>
          ) : null}
          {purchaseStatus === "approved" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Record off-platform order"
              disabled={contentDirty || busy || collection.saving || !currencyReady}
              onPress={() => void transitionPurchaseRequest("ordered")}
              style={[
                styles.primaryButton,
                (contentDirty || busy || collection.saving || !currencyReady) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.primaryButtonText}>Record off-platform order</Text>
            </Pressable>
          ) : null}
          {purchaseStatus === "ordered" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Verify received from B-02 receipt"
              disabled={
                contentDirty ||
                !inventoryReceiptMovementId ||
                busy ||
                collection.saving ||
                !currencyReady
              }
              onPress={() => void transitionPurchaseRequest("received")}
              style={[
                styles.primaryButton,
                (contentDirty ||
                  !inventoryReceiptMovementId ||
                  busy ||
                  collection.saving ||
                  !currencyReady) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.primaryButtonText}>Verify received from B-02</Text>
            </Pressable>
          ) : null}
          {new Set<PurchaseStatus>(["needed", "reviewing", "approved", "ordered"]).has(
            purchaseStatus
          ) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel purchase request"
              disabled={contentDirty || busy || collection.saving || !currencyReady}
              onPress={() => void transitionPurchaseRequest("cancelled")}
              style={[
                styles.secondaryButton,
                (contentDirty || busy || collection.saving || !currencyReady) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.removeText}>Cancel purchase request</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.warningText}>
          GrowPathAI does not place, transmit, receive, or pay for an order. Ordered is a
          user-recorded off-platform event; Received requires server-validated B-02
          evidence.
        </Text>
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
        <RecordSaveArchiveActions
          saving={collection.saving || busy}
          saveDisabled={!currencyReady}
          hasRecord={Boolean(businessDeskRecordId(selected))}
          saveLabel={
            selected && selected.status !== "needed"
              ? "Save new Needed revision"
              : "Save vendor comparison"
          }
          archiveReason={archiveReason}
          onArchiveReasonChange={setArchiveReason}
          onSave={() => void save()}
          onArchive={() => void archive()}
        />
      </AppCard>
    </RecordToolScaffold>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    bodyText: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    checkbox: {
      borderColor: palette.border,
      borderRadius: 4,
      borderWidth: 2,
      height: 19,
      marginTop: 2,
      width: 19
    },
    checkboxChecked: { backgroundColor: palette.accent, borderColor: palette.accent },
    checkboxCopy: { flex: 1, gap: 2 },
    checkboxHint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    checkboxLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
    checkboxRow: { alignItems: "flex-start", flexDirection: "row", gap: 9 },
    choice: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    choiceSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    choiceText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    choiceTextSelected: { color: palette.accentText },
    dateField: { flexBasis: 240, flexGrow: 1, minWidth: 220 },
    disabled: { opacity: 0.65 },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedbackText: { color: palette.success, fontSize: 13, fontWeight: "800" },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    inlineRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 9 },
    lifecycleActions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    },
    linkText: { color: palette.link, fontSize: 13, fontWeight: "900" },
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    offerCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      padding: 12
    },
    offerHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    offerStack: { gap: 12 },
    offerTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 14, fontWeight: "900" },
    receiptChoice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    receiptStack: { gap: 8 },
    removeText: { color: palette.danger, fontSize: 12, fontWeight: "900" },
    resultCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 12
    },
    resultMetric: { color: palette.text, fontSize: 15, fontWeight: "900" },
    resultRecommended: { borderColor: palette.success, borderWidth: 2 },
    resultStack: { gap: 10 },
    resultTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    section: { gap: 9 },
    sectionTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    statusLabel: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.7,
      textTransform: "uppercase"
    },
    statusPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 6,
      padding: 12
    },
    statusValue: { color: palette.text, fontSize: 16, fontWeight: "900" },
    warningText: {
      color: palette.warning,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 19
    }
  });
}
