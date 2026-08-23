import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  addHorticultureCareEvent,
  createHorticultureRecord,
  evaluateHorticultureFulfillment,
  listHorticultureRecords,
  updateHorticultureRecord,
  type HorticultureRecord
} from "@/api/horticulture";
import type { BusinessDeskWorkspace } from "@/api/businessDesk";
import {
  getBusinessInventoryItem,
  listBusinessInventory,
  type BusinessInventoryItem,
  type BusinessInventoryLot
} from "@/api/businessInventory";
import { listEvidenceAssets } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Props = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
};

const emptyDraft = {
  title: "",
  commonName: "",
  scientificName: "",
  environment: "",
  batchCode: "",
  benchZone: ""
};

export default function HorticultureOperationsScreen({
  workspace,
  workspaceLabel
}: Props) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [records, setRecords] = useState<HorticultureRecord[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [careNotes, setCareNotes] = useState<Record<string, string>>({});
  const [inventoryItems, setInventoryItems] = useState<BusinessInventoryItem[]>([]);
  const [inventoryLots, setInventoryLots] = useState<
    Record<string, BusinessInventoryLot[]>
  >({});
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);

  const inventoryWorkspace = useMemo(
    () =>
      workspace.workspaceType === "facility" ? { facilityId: workspace.facilityId } : {},
    [workspace]
  );

  const load = useCallback(async () => {
    try {
      const [nextRecords, nextInventory, nextEvidence] = await Promise.all([
        listHorticultureRecords(workspace),
        listBusinessInventory(inventoryWorkspace),
        listEvidenceAssets(
          workspace.workspaceType === "facility"
            ? { workspaceType: "facility", facilityId: workspace.facilityId }
            : { workspaceType: "commercial" }
        )
      ]);
      setRecords(nextRecords);
      setInventoryItems(nextInventory);
      setEvidenceAssets(
        nextEvidence.filter((asset: EvidenceAsset) =>
          ["photo", "video"].includes(String(asset.assetType))
        )
      );
      setMessage("");
    } catch (error: any) {
      setMessage(error?.message || "Horticulture records could not be loaded.");
    }
  }, [inventoryWorkspace, workspace]);

  useEffect(() => void load(), [load]);

  async function createRecord() {
    if (!draft.title.trim()) return setMessage("Add a clear record title first.");
    setBusy(true);
    try {
      const record = await createHorticultureRecord(workspace, {
        title: draft.title.trim(),
        recordType: "nursery_batch",
        lifecycleStatus: "draft",
        crop: {
          commonName: draft.commonName.trim(),
          scientificName: draft.scientificName.trim(),
          environment: draft.environment.trim(),
          observedSymptoms: []
        },
        inventoryItemId: null,
        inventoryLotId: null,
        nursery: {
          propagationBatchCode: draft.batchCode.trim(),
          benchZone: draft.benchZone.trim(),
          stage: "",
          quarantineStatus: "not_assessed"
        },
        productLabel: {
          present: false,
          reviewed: false,
          productName: "",
          guaranteedAnalysis: "",
          ingredients: "",
          cropUseConstraints: "",
          reviewedAt: null
        },
        fulfillment: {
          mediaComplete: false,
          careCardComplete: false,
          packingReviewComplete: false
        },
        evidenceLinks: []
      });
      setRecords((current) => [record, ...current]);
      setDraft(emptyDraft);
      setMessage(
        "Nursery record created. Link evidence and B-02 inventory before readiness review."
      );
    } catch (error: any) {
      setMessage(error?.message || "The nursery record could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function patchRecord(record: HorticultureRecord, patch: any) {
    setBusy(true);
    try {
      const updated = await updateHorticultureRecord(workspace, record, patch);
      setRecords((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setMessage("Reviewed record saved.");
    } catch (error: any) {
      setMessage(
        error?.message ||
          "The record changed or could not be saved. Reload and review it again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addCare(record: HorticultureRecord) {
    const notes = careNotes[record._id]?.trim();
    if (!notes) return setMessage("Add care or inspection notes first.");
    setBusy(true);
    try {
      const updated = await addHorticultureCareEvent(workspace, record, {
        eventType: "inspection",
        occurredAt: new Date().toISOString(),
        notes
      });
      setRecords((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setCareNotes((current) => ({ ...current, [record._id]: "" }));
      setMessage("Care history added with server-recorded actor and time.");
    } catch (error: any) {
      setMessage(error?.message || "Care history could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function evaluate(record: HorticultureRecord) {
    setBusy(true);
    try {
      const updated = await evaluateHorticultureFulfillment(workspace, record);
      setRecords((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      setMessage("Readiness rechecked against the current linked B-02 records.");
    } catch (error: any) {
      setMessage(error?.message || "Readiness could not be evaluated.");
    } finally {
      setBusy(false);
    }
  }

  async function linkInventory(record: HorticultureRecord, item: BusinessInventoryItem) {
    setBusy(true);
    try {
      const id = String(item.id || item._id || "");
      const detail = await getBusinessInventoryItem(inventoryWorkspace, id);
      setInventoryLots((current) => ({ ...current, [id]: detail.lots || [] }));
      await patchRecord(record, { inventoryItemId: id, inventoryLotId: null });
    } catch (error: any) {
      setMessage(error?.message || "The inventory item could not be linked.");
    } finally {
      setBusy(false);
    }
  }

  async function linkEvidence(record: HorticultureRecord, asset: EvidenceAsset) {
    const alreadyLinked = record.evidenceLinks.some((link) => link.id === asset.id);
    const evidenceLinks = alreadyLinked
      ? record.evidenceLinks.filter((link) => link.id !== asset.id)
      : [
          ...record.evidenceLinks,
          {
            type: asset.assetType as "photo" | "video",
            id: asset.id,
            label: asset.fileName || `${asset.purpose} ${asset.assetType}`,
            observedAt: asset.sourceCaptureMetadata?.capturedAt || asset.createdAt || null
          }
        ];
    await patchRecord(record, { evidenceLinks });
  }

  return (
    <AppPage
      routeKey="horticulture-operations"
      longContent
      backFallbackHref={
        workspaceLabel === "Facility" ? "/home/facility/more" : "/home/commercial/more"
      }
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} workspace</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Horticulture Operations
          </Text>
          <Text style={styles.subtitle}>
            Review plant and product evidence, nursery care history, holds, and
            fulfillment readiness without creating a second inventory ledger.
          </Text>
        </View>
      }
    >
      <AppCard
        title="New nursery or plant-help record"
        titleLevel={2}
        subtitle="Names remain owner-reviewed. GrowPath does not invent a species, label direction, pesticide rate, or stock balance."
      >
        <View style={styles.grid}>
          {(
            [
              ["Record title", "title"],
              ["Common name", "commonName"],
              ["Scientific name", "scientificName"],
              ["Environment / observations", "environment"],
              ["Propagation batch code", "batchCode"],
              ["Bench / zone", "benchZone"]
            ] as const
          ).map(([label, key]) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                accessibilityLabel={label}
                value={draft[key]}
                onChangeText={(value) =>
                  setDraft((current) => ({ ...current, [key]: value }))
                }
                style={styles.input}
                multiline={key === "environment"}
              />
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={createRecord}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Working…" : "Create reviewed workspace record"}
          </Text>
        </Pressable>
      </AppCard>

      {message ? (
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {records.length === 0 ? (
        <AppCard
          title="No horticulture records yet"
          titleLevel={2}
          subtitle="Create the first record above. Existing plant IDs and diagnoses remain separate evidence until the owner links them."
        />
      ) : null}
      {records.map((record) => {
        const ready = record.fulfillment?.readiness === "ready_for_human_confirmation";
        return (
          <AppCard
            key={record._id}
            title={record.title}
            titleLevel={2}
            subtitle={`${record.crop?.commonName || "Plant/product not named"}${record.crop?.scientificName ? ` · ${record.crop.scientificName}` : ""}`}
          >
            <Text style={[styles.status, ready ? styles.ready : styles.blocked]}>
              {ready
                ? "Ready for human fulfillment confirmation"
                : record.fulfillment?.readiness === "blocked"
                  ? "Readiness blocked"
                  : "Readiness not evaluated"}
            </Text>
            {(record.fulfillment?.reasons || []).map((reason) => (
              <Text key={reason} style={styles.reason}>
                • {reason}
              </Text>
            ))}
            <View style={styles.toggleRow}>
              <Pressable
                disabled={busy}
                onPress={() =>
                  patchRecord(record, {
                    nursery: {
                      ...record.nursery,
                      quarantineStatus:
                        record.nursery.quarantineStatus === "clear" ? "held" : "clear"
                    }
                  })
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Quarantine: {record.nursery.quarantineStatus}
                </Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() =>
                  patchRecord(record, {
                    productLabel: {
                      ...record.productLabel,
                      present: true,
                      reviewed: !record.productLabel.reviewed,
                      reviewedAt: new Date().toISOString()
                    }
                  })
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  Label reviewed: {record.productLabel.reviewed ? "Yes" : "No"}
                </Text>
              </Pressable>
              {(
                ["mediaComplete", "careCardComplete", "packingReviewComplete"] as const
              ).map((key) => (
                <Pressable
                  key={key}
                  disabled={busy}
                  onPress={() =>
                    patchRecord(record, {
                      fulfillment: {
                        ...record.fulfillment,
                        [key]: !record.fulfillment[key]
                      }
                    })
                  }
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {key.replace(/([A-Z])/g, " $1")}:{" "}
                    {record.fulfillment[key] ? "Yes" : "No"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Link current B-02 inventory</Text>
            <View style={styles.toggleRow}>
              {inventoryItems.length === 0 ? (
                <Text style={styles.reason}>
                  No inventory items are available in this workspace.
                </Text>
              ) : (
                inventoryItems.map((item) => {
                  const id = String(item.id || item._id || "");
                  const selected = String(record.inventoryItemId || "") === id;
                  return (
                    <Pressable
                      key={id}
                      disabled={busy}
                      onPress={() => linkInventory(record, item)}
                      style={[styles.secondaryButton, selected && styles.selectedButton]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {selected ? "Linked: " : "Link "}
                        {item.name} · {item.quantityOnHand ?? item.quantity} {item.unit}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
            {record.inventoryItemId &&
            inventoryLots[String(record.inventoryItemId)]?.length ? (
              <View style={styles.toggleRow}>
                {inventoryLots[String(record.inventoryItemId)].map((lot) => {
                  const lotId = String(lot.id || lot._id || "");
                  const selected = String(record.inventoryLotId || "") === lotId;
                  return (
                    <Pressable
                      key={lotId}
                      disabled={busy}
                      onPress={() => patchRecord(record, { inventoryLotId: lotId })}
                      style={[styles.secondaryButton, selected && styles.selectedButton]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {selected ? "Linked lot: " : "Link lot "}
                        {lot.lotCode} · {lot.quantityOnHand ?? 0} {lot.unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <Text style={styles.sectionLabel}>Link private photo or video evidence</Text>
            <View style={styles.toggleRow}>
              {evidenceAssets.length === 0 ? (
                <Text style={styles.reason}>
                  No retained workspace photo or video evidence is available.
                </Text>
              ) : (
                evidenceAssets.slice(0, 24).map((asset) => {
                  const selected = record.evidenceLinks.some(
                    (link) => link.id === asset.id
                  );
                  return (
                    <Pressable
                      key={asset.id}
                      disabled={busy}
                      onPress={() => linkEvidence(record, asset)}
                      style={[styles.secondaryButton, selected && styles.selectedButton]}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {selected ? "Linked: " : "Link "}
                        {asset.fileName || `${asset.purpose} ${asset.assetType}`}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
            <View style={styles.careRow}>
              <TextInput
                accessibilityLabel={`Care notes for ${record.title}`}
                placeholder="Inspection or care notes"
                placeholderTextColor={palette.textMuted}
                value={careNotes[record._id] || ""}
                onChangeText={(value) =>
                  setCareNotes((current) => ({ ...current, [record._id]: value }))
                }
                style={[styles.input, styles.careInput]}
              />
              <Pressable
                disabled={busy}
                onPress={() => addCare(record)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Add inspection</Text>
              </Pressable>
            </View>
            <Text style={styles.history}>
              {record.careHistory?.length || 0} care-history entries ·{" "}
              {record.evidenceLinks?.length || 0} linked evidence items
            </Text>
            <Pressable
              disabled={busy}
              onPress={() => evaluate(record)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Evaluate current readiness</Text>
            </Pressable>
            <Text style={styles.disclaimer}>
              This check does not reserve inventory, promise availability, choose a
              substitute, or complete an order.
            </Text>
          </AppCard>
        );
      })}
    </AppPage>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    blocked: { color: palette.warning },
    careInput: { flex: 1, minWidth: 220 },
    careRow: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14
    },
    disclaimer: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 10 },
    field: { flexBasis: 240, flexGrow: 1 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    header: { gap: 6 },
    history: { color: palette.textMuted, fontSize: 13, marginTop: 10 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    label: { color: palette.text, fontSize: 13, fontWeight: "800", marginBottom: 5 },
    message: { color: palette.text, fontSize: 14, fontWeight: "700" },
    primaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 14,
      paddingHorizontal: 15,
      paddingVertical: 11
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    ready: { color: palette.success },
    reason: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 3 },
    secondaryButton: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 9
    },
    secondaryButtonText: {
      color: palette.text,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "capitalize"
    },
    sectionLabel: { color: palette.text, fontSize: 13, fontWeight: "900", marginTop: 16 },
    selectedButton: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    status: { fontSize: 14, fontWeight: "900", marginBottom: 5 },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 820 },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" },
    toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }
  });
}
