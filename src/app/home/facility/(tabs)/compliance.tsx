import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { createAuditLog, listAuditLogs } from "@/api/audit";
import {
  createDeviation,
  getDeviations,
  resolveDeviation,
  type Deviation
} from "@/api/deviations";
import {
  approveVerification,
  getVerifications,
  rejectVerification,
  type VerificationRecord
} from "@/api/verification";
import { createSOPTemplate, getSOPTemplates, type SOPTemplate } from "@/api/sop";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import type { AuditLog } from "@/types/contracts";

function rowId(row: any) {
  return String(row?._id || row?.id || row?.logId || "");
}

function canWriteRole(role: unknown) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

function canResolveRole(role: unknown) {
  return role === "OWNER" || role === "MANAGER";
}

function statusOf(row: any) {
  return String(row?.status || row?.state || "open").toLowerCase();
}

function openDeviation(row: Deviation) {
  const status = statusOf(row);
  return status !== "resolved" && status !== "closed";
}

export default function FacilityComplianceTab() {
  const router = useRouter();
  const ent = useEntitlements();
  const { selectedId: facilityId } = useFacility();

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [sops, setSops] = useState<SOPTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [deviationTitle, setDeviationTitle] = useState("");
  const [deviationSeverity, setDeviationSeverity] = useState("minor");
  const [deviationDescription, setDeviationDescription] = useState("");
  const [sopTitle, setSopTitle] = useState("");
  const [sopContent, setSopContent] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const canReadCompliance = Boolean(ent?.can?.(CAPABILITY_KEYS.COMPLIANCE_READ));
  const canWriteCompliance =
    Boolean(ent?.can?.(CAPABILITY_KEYS.COMPLIANCE_WRITE)) &&
    canWriteRole(ent?.facilityRole);
  const canResolveCompliance = canWriteCompliance && canResolveRole(ent?.facilityRole);
  const canReadAudit = Boolean(ent?.can?.(CAPABILITY_KEYS.AUDIT_READ));

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        if (!canReadCompliance) {
          setDeviations([]);
          setVerifications([]);
          setSops([]);
          setAuditLogs([]);
          return;
        }
        const [deviationRows, verificationRows, sopRows, auditRes] = await Promise.all([
          getDeviations(facilityId),
          getVerifications(facilityId),
          getSOPTemplates(facilityId),
          canReadAudit ? listAuditLogs(facilityId) : Promise.resolve({ data: [] })
        ]);
        setDeviations(Array.isArray(deviationRows) ? deviationRows : []);
        setVerifications(Array.isArray(verificationRows) ? verificationRows : []);
        setSops(Array.isArray(sopRows) ? sopRows : []);
        setAuditLogs(Array.isArray(auditRes.data) ? auditRes.data : []);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canReadAudit, canReadCompliance, clearError, facilityId, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  async function writeAudit(action: string, details: string) {
    if (!facilityId || !canReadAudit) return;
    try {
      await createAuditLog(facilityId, {
        action,
        details
      });
    } catch {
      // Audit writes are best-effort; the primary compliance action already succeeded.
    }
  }

  async function addDeviation() {
    if (!facilityId || !canWriteCompliance || !deviationTitle.trim()) return;
    setSaving(true);
    setFeedback("");
    try {
      const created = await createDeviation(facilityId, {
        title: deviationTitle.trim(),
        description: deviationDescription.trim() || undefined,
        severity: deviationSeverity,
        status: "open",
        facilityId
      });
      await writeAudit(
        "COMPLIANCE_DEVIATION_CREATED",
        `Deviation ${rowId(created) || deviationTitle.trim()} created in facility ${facilityId}`
      );
      setDeviationTitle("");
      setDeviationDescription("");
      setFeedback("Deviation created.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function resolve(id: string) {
    if (!facilityId || !id || !canResolveCompliance) return;
    setSaving(true);
    setFeedback("");
    try {
      await resolveDeviation(facilityId, id, {
        resolution: "Resolved from compliance tab."
      });
      await writeAudit(
        "COMPLIANCE_DEVIATION_RESOLVED",
        `Deviation ${id} resolved in facility ${facilityId}`
      );
      setFeedback("Deviation resolved.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function addSop() {
    if (!facilityId || !canWriteCompliance || !sopTitle.trim()) return;
    setSaving(true);
    setFeedback("");
    try {
      const created = await createSOPTemplate(facilityId, {
        title: sopTitle.trim(),
        content: sopContent.trim() || "Procedure pending.",
        version: 1,
        facilityId
      });
      await writeAudit(
        "COMPLIANCE_SOP_CREATED",
        `SOP ${rowId(created) || sopTitle.trim()} created in facility ${facilityId}`
      );
      setSopTitle("");
      setSopContent("");
      setFeedback("SOP template created.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function verify(recordId: string) {
    if (!facilityId || !recordId || !canWriteCompliance) return;
    setSaving(true);
    setFeedback("");
    try {
      await approveVerification(facilityId, recordId);
      await writeAudit(
        "COMPLIANCE_RECORD_VERIFIED",
        `Verification record ${recordId} approved in facility ${facilityId}`
      );
      setFeedback("Verification approved.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  async function reject(recordId: string) {
    if (!facilityId || !recordId || !canWriteCompliance) return;
    setSaving(true);
    setFeedback("");
    try {
      await rejectVerification(facilityId, recordId, rejectReason.trim() || undefined);
      await writeAudit(
        "COMPLIANCE_RECORD_REJECTED",
        `Verification record ${recordId} rejected in facility ${facilityId}`
      );
      setRejectReason("");
      setFeedback("Verification rejected.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  const openDeviations = deviations.filter(openDeviation);
  const pendingVerifications = verifications.filter((record) => {
    const status = statusOf(record);
    return status !== "approved" && status !== "verified" && status !== "rejected";
  });

  return (
    <ScreenBoundary title="Compliance">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Compliance</Text>
            <Text style={styles.muted}>
              Facility-scoped primitives for deviations, SOPs, verification, and audit
              events.
            </Text>
            <Text style={styles.ownerLine}>Facility: {facilityId || "none"}</Text>
          </View>
          {loading ? <ActivityIndicator /> : null}
        </View>

        {!canReadCompliance ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No Compliance Access</Text>
            <Text style={styles.muted}>
              This account does not have the `COMPLIANCE_READ` capability for the selected
              facility.
            </Text>
          </View>
        ) : null}

        {canReadCompliance ? (
          <>
            <View style={styles.grid}>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{openDeviations.length}</Text>
                <Text style={styles.tileLabel}>Open deviations</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{pendingVerifications.length}</Text>
                <Text style={styles.tileLabel}>Pending verification</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{sops.length}</Text>
                <Text style={styles.tileLabel}>SOP templates</Text>
              </View>
              <View style={styles.tile}>
                <Text style={styles.tileValue}>{auditLogs.length}</Text>
                <Text style={styles.tileLabel}>Audit events</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Inspection workflow</Text>
              <Text style={styles.muted}>
                Use the current compliance counts to export evidence, run AI readiness,
                and keep SOP run proof current.
              </Text>
              <View style={styles.actionGrid}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open compliance export reports"
                  onPress={() => router.push("/home/facility/reports" as any)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>Export packet</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open AI inspection readiness"
                  onPress={() =>
                    router.push("/home/facility/ai-ask?preset=compliance" as any)
                  }
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>AI readiness</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open SOP runs"
                  onPress={() => router.push("/home/facility/sop-runs" as any)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>SOP runs</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start new SOP run"
                  onPress={() => router.push("/home/facility/sop-runs/start" as any)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionText}>Start SOP run</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create Deviation</Text>
              {!canWriteCompliance ? (
                <Text style={styles.muted}>
                  You do not have permission to create compliance records.
                </Text>
              ) : (
                <View style={styles.form}>
                  <TextInput
                    accessibilityLabel="Deviation title"
                    value={deviationTitle}
                    onChangeText={setDeviationTitle}
                    style={styles.input}
                    placeholder="Deviation title"
                  />
                  <TextInput
                    accessibilityLabel="Deviation severity"
                    value={deviationSeverity}
                    onChangeText={setDeviationSeverity}
                    style={styles.input}
                    placeholder="Severity"
                  />
                  <TextInput
                    accessibilityLabel="Deviation description"
                    value={deviationDescription}
                    onChangeText={setDeviationDescription}
                    style={[styles.input, styles.multiline]}
                    multiline
                    placeholder="Description"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create compliance deviation"
                    onPress={addDeviation}
                    disabled={saving || !deviationTitle.trim()}
                    style={[
                      styles.primaryBtn,
                      (saving || !deviationTitle.trim()) && styles.disabled
                    ]}
                  >
                    <Text style={styles.primaryText}>Create Deviation</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Open Deviations</Text>
              {openDeviations.length ? (
                openDeviations.map((item) => {
                  const id = rowId(item);
                  return (
                    <View key={id || item.title} style={styles.row}>
                      <Text style={styles.rowTitle}>
                        {item.title || item.description || "Deviation"}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {item.severity || "severity n/a"} | {item.status || "open"}
                      </Text>
                      {canResolveCompliance && id ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Resolve deviation ${item.title || id}`}
                          onPress={() => resolve(id)}
                          disabled={saving}
                          style={styles.secondaryBtn}
                        >
                          <Text style={styles.secondaryText}>Resolve</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.muted}>No open deviations.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Verification Queue</Text>
              {pendingVerifications.length ? (
                <>
                  <TextInput
                    accessibilityLabel="Verification reject reason"
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    style={styles.input}
                    placeholder="Reject reason, optional"
                  />
                  {pendingVerifications.map((record) => {
                    const id = rowId(record);
                    return (
                      <View key={id || record.name} style={styles.row}>
                        <Text style={styles.rowTitle}>
                          {record.name || record.description || "Verification record"}
                        </Text>
                        <Text style={styles.rowMeta}>{record.status || "pending"}</Text>
                        {canWriteCompliance && id ? (
                          <View style={styles.buttonRow}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Approve verification ${record.name || id}`}
                              onPress={() => verify(id)}
                              disabled={saving}
                              style={styles.primaryBtn}
                            >
                              <Text style={styles.primaryText}>Approve</Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Reject verification ${record.name || id}`}
                              onPress={() => reject(id)}
                              disabled={saving}
                              style={styles.dangerBtn}
                            >
                              <Text style={styles.dangerText}>Reject</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </>
              ) : (
                <Text style={styles.muted}>No pending verification records.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>SOP Templates</Text>
              {canWriteCompliance ? (
                <View style={styles.form}>
                  <TextInput
                    accessibilityLabel="SOP title"
                    value={sopTitle}
                    onChangeText={setSopTitle}
                    style={styles.input}
                    placeholder="SOP title"
                  />
                  <TextInput
                    accessibilityLabel="SOP procedure summary"
                    value={sopContent}
                    onChangeText={setSopContent}
                    style={[styles.input, styles.multiline]}
                    multiline
                    placeholder="Procedure summary"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create SOP template"
                    onPress={addSop}
                    disabled={saving || !sopTitle.trim()}
                    style={[
                      styles.primaryBtn,
                      (saving || !sopTitle.trim()) && styles.disabled
                    ]}
                  >
                    <Text style={styles.primaryText}>Create SOP</Text>
                  </Pressable>
                </View>
              ) : null}
              {sops.length ? (
                sops.slice(0, 8).map((sop) => {
                  const id = rowId(sop);
                  const title = sop.title || "SOP";
                  return (
                    <View key={id || title} style={styles.row}>
                      <Text style={styles.rowTitle}>{title}</Text>
                      <Text style={styles.rowMeta}>Version {sop.version || 1}</Text>
                      {id ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Start SOP run from ${title}`}
                          onPress={() =>
                            router.push({
                              pathname: "/home/facility/sop-runs/start",
                              params: { templateId: id, templateTitle: title }
                            } as any)
                          }
                          style={styles.secondaryBtn}
                        >
                          <Text style={styles.secondaryText}>Start run</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.muted}>No SOP templates yet.</Text>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Audit Events</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open audit logs"
                  onPress={() => router.push("/home/facility/audit-logs" as any)}
                >
                  <Text style={styles.link}>Open audit logs</Text>
                </Pressable>
              </View>
              {canReadAudit ? (
                auditLogs.slice(0, 5).map((log, index) => (
                  <View
                    key={`${log.timestamp || index}-${log.action}`}
                    style={styles.row}
                  >
                    <Text style={styles.rowTitle}>{log.action || "Audit event"}</Text>
                    <Text style={styles.rowMeta}>
                      {log.details || log.timestamp || ""}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>Audit visibility requires `AUDIT_READ`.</Text>
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, gap: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7, lineHeight: 19 },
  ownerLine: { color: "#166534", fontWeight: "800", marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "white"
  },
  tileValue: { fontSize: 22, fontWeight: "900" },
  tileLabel: { opacity: 0.7, fontWeight: "800" },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    gap: 10
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  actionText: { color: "white", fontWeight: "900" },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  multiline: { minHeight: 74, textAlignVertical: "top" },
  row: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.08)", paddingTop: 10, gap: 4 },
  rowTitle: { fontWeight: "900" },
  rowMeta: { opacity: 0.72 },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "white", fontWeight: "800" },
  secondaryBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryText: { fontWeight: "800" },
  dangerBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B91C1C",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  dangerText: { color: "#B91C1C", fontWeight: "800" },
  disabled: { opacity: 0.55 },
  link: { color: "#2563eb", fontWeight: "800" },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 9,
    padding: 9,
    fontWeight: "700"
  }
});
