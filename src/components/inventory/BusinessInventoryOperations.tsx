import React, { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  applyBusinessInventoryMovement,
  BusinessInventoryLot,
  BusinessInventoryMovement,
  createBusinessInventoryLot,
  InventoryWorkspace
} from "@/api/businessInventory";
import CalendarDateField from "@/components/forms/CalendarDateField";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type MovementType = BusinessInventoryMovement["movementType"];

const MOVEMENTS: Array<{ value: MovementType; label: string; help: string }> = [
  { value: "receive", label: "Receive", help: "Add verified received stock." },
  { value: "consume", label: "Consume", help: "Record stock used or fulfilled." },
  { value: "adjust", label: "Adjust", help: "Correct a count with a signed change." },
  { value: "move", label: "Move", help: "Move an item or lot to another location." },
  {
    value: "transfer",
    label: "Transfer",
    help: "Record an authorized location transfer."
  },
  { value: "hold", label: "Hold", help: "Prevent available use pending review." },
  { value: "release", label: "Release", help: "Return held stock to active use." }
];

function recordId(record: { id?: string; _id?: string }) {
  return String(record.id || record._id || "");
}

function uniqueKey(itemId: string, action: string) {
  return `inventory-ui:${itemId}:${action}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function isStrictIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function movementHistoryLabel(movement: BusinessInventoryMovement) {
  const type = String(movement.movementType || "movement").replace(/_/g, " ");
  if (movement.movementType === "move" || movement.movementType === "transfer") {
    const quantity = Number(movement.quantity || 0);
    const from = String(movement.fromLocationId || "source not recorded");
    const to = String(movement.toLocationId || "destination not recorded");
    return `${type} · ${Number.isFinite(quantity) ? quantity : 0} relocated · ${from} → ${to}`;
  }
  if (movement.movementType === "hold" || movement.movementType === "release") {
    return `${type} · status action`;
  }
  const delta = Number(movement.quantityDelta || 0);
  return `${type} · ${delta >= 0 ? "+" : ""}${delta}`;
}

export function BusinessInventoryOperations({
  canWrite,
  itemId,
  itemQuantity,
  lots,
  loadingOlderMovements = false,
  movements,
  hasMoreMovements = false,
  onLoadOlderMovements,
  onReload,
  workspace
}: {
  canWrite: boolean;
  itemId: string;
  itemQuantity: number;
  lots: BusinessInventoryLot[];
  loadingOlderMovements?: boolean;
  movements: BusinessInventoryMovement[];
  hasMoreMovements?: boolean;
  onLoadOlderMovements?: () => Promise<void> | void;
  onReload: () => Promise<void> | void;
  workspace: InventoryWorkspace;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const inFlight = useRef(false);
  const retryIdentity = useRef<{ signature: string; key: string } | null>(null);
  const [movementType, setMovementType] = useState<MovementType>("receive");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [selectedLotId, setSelectedLotId] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [lotLocation, setLotLocation] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const movementDefinition = MOVEMENTS.find((entry) => entry.value === movementType)!;
  const locationAction = ["move", "transfer"].includes(movementType);
  const statusAction = ["hold", "release"].includes(movementType);
  const hasStockedLots = lots.some(
    (lot) => Number.isFinite(Number(lot.quantityOnHand)) && Number(lot.quantityOnHand) > 0
  );
  const wholeItemRelocationBlocked = Boolean(
    locationAction && !selectedLotId && hasStockedLots
  );
  const selectedScopeQuantity = selectedLotId
    ? Number(lots.find((lot) => recordId(lot) === selectedLotId)?.quantityOnHand ?? 0)
    : Number(itemQuantity);
  const relocationQuantity = Number.isFinite(selectedScopeQuantity)
    ? selectedScopeQuantity
    : 0;

  async function submitMovement() {
    if (!canWrite || !itemId || inFlight.current) return;
    if (wholeItemRelocationBlocked) {
      setError(
        "Select a stocked lot before relocating inventory with active lot balances."
      );
      return;
    }
    // Hold/Release change the status of the selected item or lot, so their
    // immutable movement must describe that same full selected balance.
    const parsed = locationAction || statusAction ? relocationQuantity : Number(quantity);
    if (locationAction && parsed <= 0) {
      setError("The selected item or lot has no positive on-hand quantity to relocate.");
      return;
    }
    if (!statusAction && (!Number.isFinite(parsed) || parsed === 0)) {
      setError(
        movementType === "adjust"
          ? "Enter a non-zero signed adjustment."
          : "Enter a quantity greater than zero."
      );
      return;
    }
    if (movementType !== "adjust" && parsed < 0) {
      setError("Quantity cannot be negative for this action.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required for the audit history.");
      return;
    }
    if (locationAction && !toLocationId.trim()) {
      setError("Choose or enter the destination location.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      const signature = JSON.stringify({
        itemId,
        movementType,
        quantity: parsed,
        reason: reason.trim(),
        selectedLotId,
        toLocationId: toLocationId.trim()
      });
      if (!retryIdentity.current || retryIdentity.current.signature !== signature) {
        retryIdentity.current = {
          signature,
          key: uniqueKey(itemId, movementType)
        };
      }
      await applyBusinessInventoryMovement(workspace, itemId, {
        movementType,
        quantity: Math.abs(parsed),
        ...(movementType === "adjust" ? { adjustment: parsed } : {}),
        reason: reason.trim(),
        idempotencyKey: retryIdentity.current.key,
        lotId: selectedLotId || null,
        toLocationId: toLocationId.trim() || null
      });
      setQuantity("");
      setReason("");
      setToLocationId("");
      retryIdentity.current = null;
      setFeedback(`${movementDefinition.label} recorded.`);
      await onReload();
    } catch (caught: any) {
      setError(String(caught?.message || caught || "Inventory movement failed."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function createLot() {
    if (!canWrite || !itemId || inFlight.current) return;
    if (!lotCode.trim()) {
      setError("Lot code is required.");
      return;
    }
    if (expiresAt.trim() && !isStrictIsoDate(expiresAt.trim())) {
      setError("Expiration must be a valid calendar date.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      await createBusinessInventoryLot(workspace, itemId, {
        lotCode: lotCode.trim(),
        batchCode: batchCode.trim() || undefined,
        locationId: lotLocation.trim() || undefined,
        expiresAt: expiresAt.trim() || undefined
      });
      setLotCode("");
      setBatchCode("");
      setLotLocation("");
      setExpiresAt("");
      setFeedback("Lot created. Use Receive to add its verified quantity.");
      await onReload();
    } catch (caught: any) {
      setError(String(caught?.message || caught || "Lot creation failed."));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={2} style={styles.title}>
          Lots and batches
        </Text>
        <Text style={styles.help}>
          Create traceable lots first, then receive, hold, move or consume against the
          selected lot.
        </Text>
        {lots.length ? (
          <View
            style={styles.choiceRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Inventory lot selection"
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !selectedLotId }}
              onPress={() => setSelectedLotId("")}
              style={[styles.choice, !selectedLotId && styles.choiceSelected]}
            >
              <Text style={styles.choiceText}>Whole item</Text>
            </Pressable>
            {lots.map((lot) => {
              const id = recordId(lot);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedLotId === id }}
                  onPress={() => setSelectedLotId(id)}
                  style={[styles.choice, selectedLotId === id && styles.choiceSelected]}
                >
                  <Text style={styles.choiceText}>
                    {lot.lotCode} · {Number(lot.quantityOnHand || 0)} {lot.unit || ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>
            No lots yet. Whole-item stock can still be tracked.
          </Text>
        )}

        {canWrite ? (
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="New inventory lot code"
              placeholder="Lot code"
              placeholderTextColor={palette.textMuted}
              value={lotCode}
              onChangeText={setLotCode}
              editable={!busy}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="New inventory batch code"
              placeholder="Batch code (optional)"
              placeholderTextColor={palette.textMuted}
              value={batchCode}
              onChangeText={setBatchCode}
              editable={!busy}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="New inventory lot location"
              placeholder="Location (optional)"
              placeholderTextColor={palette.textMuted}
              value={lotLocation}
              onChangeText={setLotLocation}
              editable={!busy}
              style={styles.input}
            />
            <CalendarDateField
              accessibilityLabel="New inventory lot expiration"
              disabled={busy}
              label="Expiration (optional)"
              onChange={setExpiresAt}
              placeholder="Choose expiration date"
              value={expiresAt}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create inventory lot"
              accessibilityState={{ disabled: busy || !lotCode.trim(), busy }}
              disabled={busy || !lotCode.trim()}
              onPress={createLot}
              style={[styles.primary, (busy || !lotCode.trim()) && styles.disabled]}
            >
              <Text style={styles.primaryText}>Create Lot</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={2} style={styles.title}>
          Inventory movement
        </Text>
        <View
          style={styles.choiceRow}
          accessibilityRole="radiogroup"
          accessibilityLabel="Inventory movement type"
        >
          {MOVEMENTS.map((entry) => (
            <Pressable
              key={entry.value}
              accessibilityRole="radio"
              accessibilityState={{
                checked: movementType === entry.value,
                disabled: !canWrite || busy
              }}
              disabled={!canWrite || busy}
              onPress={() => setMovementType(entry.value)}
              style={[
                styles.choice,
                movementType === entry.value && styles.choiceSelected,
                (!canWrite || busy) && styles.disabled
              ]}
            >
              <Text style={styles.choiceText}>{entry.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.help}>{movementDefinition.help}</Text>
        {canWrite ? (
          <View style={styles.form}>
            {locationAction ? (
              <View style={styles.quantityField}>
                <TextInput
                  accessibilityLabel="Inventory movement quantity"
                  accessibilityState={{ disabled: true }}
                  editable={false}
                  keyboardType="numeric"
                  value={relocationQuantity > 0 ? String(relocationQuantity) : ""}
                  style={[styles.input, styles.readOnlyInput]}
                />
                <Text style={styles.help}>
                  Move and transfer relocate the full on-hand quantity for the selected
                  item or lot. Partial location moves are not supported yet.
                </Text>
                {wholeItemRelocationBlocked ? (
                  <Text accessibilityRole="alert" style={styles.error}>
                    Select a stocked lot above. Whole-item relocation is unavailable while
                    active lot balances exist, so each lot location stays auditable.
                  </Text>
                ) : null}
              </View>
            ) : statusAction ? (
              <View style={styles.quantityField}>
                <TextInput
                  accessibilityLabel="Inventory movement quantity"
                  accessibilityState={{ disabled: true }}
                  editable={false}
                  keyboardType="numeric"
                  value={String(relocationQuantity)}
                  style={[styles.input, styles.readOnlyInput]}
                />
                <Text style={styles.help}>
                  Hold and release apply to the full on-hand balance for the selected item
                  or lot, so the status and immutable history describe the same stock.
                </Text>
              </View>
            ) : (
              <TextInput
                accessibilityLabel="Inventory movement quantity"
                keyboardType="numeric"
                placeholder={
                  movementType === "adjust" ? "Signed change, e.g. -2 or 4" : "Quantity"
                }
                placeholderTextColor={palette.textMuted}
                value={quantity}
                onChangeText={setQuantity}
                editable={!busy}
                style={styles.input}
              />
            )}
            {locationAction ? (
              <TextInput
                accessibilityLabel="Inventory movement destination"
                placeholder="Destination location"
                placeholderTextColor={palette.textMuted}
                value={toLocationId}
                onChangeText={setToLocationId}
                editable={!busy}
                style={styles.input}
              />
            ) : null}
            <TextInput
              accessibilityLabel="Inventory movement reason"
              placeholder="Required reason"
              placeholderTextColor={palette.textMuted}
              value={reason}
              onChangeText={setReason}
              editable={!busy}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Record inventory ${movementDefinition.label.toLowerCase()}`}
              accessibilityState={{
                disabled: busy || wholeItemRelocationBlocked,
                busy
              }}
              disabled={busy || wholeItemRelocationBlocked}
              onPress={submitMovement}
              style={[
                styles.primary,
                (busy || wholeItemRelocationBlocked) && styles.disabled
              ]}
            >
              <Text style={styles.primaryText}>
                {busy ? "Saving…" : `Record ${movementDefinition.label}`}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.empty}>
            Your role can review this history but cannot change inventory.
          </Text>
        )}
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

      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={2} style={styles.title}>
          Movement history
        </Text>
        {movements.length ? (
          movements.map((movement, index) => (
            <View
              key={String(movement.id || movement._id || index)}
              style={styles.historyRow}
            >
              <Text style={styles.historyTitle}>{movementHistoryLabel(movement)}</Text>
              <Text style={styles.help}>{movement.reason || "No reason recorded"}</Text>
              <Text style={styles.meta}>
                {movement.occurredAt
                  ? new Date(movement.occurredAt).toLocaleString()
                  : "Date not recorded"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No audited movements yet.</Text>
        )}
        {hasMoreMovements ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Load older inventory movements"
            accessibilityState={{
              busy: loadingOlderMovements,
              disabled: loadingOlderMovements || !onLoadOlderMovements
            }}
            disabled={loadingOlderMovements || !onLoadOlderMovements}
            onPress={onLoadOlderMovements}
            style={[
              styles.historyButton,
              (loadingOlderMovements || !onLoadOlderMovements) && styles.disabled
            ]}
          >
            <Text style={styles.historyButtonText}>
              {loadingOlderMovements ? "Loading older…" : "Load older movements"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    title: { color: palette.text, fontSize: 16, fontWeight: "900" },
    help: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
    empty: { color: palette.textMuted, fontStyle: "italic" },
    form: { gap: 8 },
    quantityField: { gap: 5 },
    input: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 10
    },
    readOnlyInput: { opacity: 0.7 },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    choice: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    choiceSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    choiceText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    primary: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.5 },
    error: { color: palette.danger, fontWeight: "800" },
    success: { color: palette.success, fontWeight: "800" },
    historyRow: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      gap: 3,
      paddingTop: 8
    },
    historyTitle: { color: palette.text, fontWeight: "900", textTransform: "capitalize" },
    historyButton: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    historyButtonText: { color: palette.text, fontWeight: "900" },
    meta: { color: palette.textMuted, fontSize: 11 }
  });
}
