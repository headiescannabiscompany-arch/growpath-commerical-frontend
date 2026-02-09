function windowParams(run: any) {
  const start = run?.createdAt;
  const end = run?.completedAt;
  if (!start || !end) return null;
  return { start, end };
}
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";
import { saveComparisonPreset } from "@/utils/comparisonPresets";
const [savingPreset, setSavingPreset] = useState(false);

const handleSavePreset = async () => {
  if (!facilityId || !runAId || !runBId) return;

  setSavingPreset(true);
  setError(null);

  try {
    const labelA = computed?.titleA ? String(computed.titleA) : String(runAId);
    const labelB = computed?.titleB ? String(computed.titleB) : String(runBId);

    const preset = {
      id: `${String(runAId)}__${String(runBId)}`,
      label: `${labelA} vs ${labelB}`,
      runA: String(runAId),
      runB: String(runBId),
      createdAt: new Date().toISOString()
    };

    await saveComparisonPreset(facilityId, preset);
  } catch (e) {
    setError(handleApiError(e));
  } finally {
    setSavingPreset(false);
  }
};

function normalizeRun(res: any) {
  if (!res) return null;
  if (res.run) return res.run;
  if (res.sopRun) return res.sopRun;
  return res;
}

function normalizeTasks(res: any) {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.tasks)) return res.tasks;
  if (Array.isArray(res)) return res;
  return [];
}

function ms(x?: string) {
  if (!x) return 0;
  const t = new Date(x).getTime();
  return Number.isFinite(t) ? t : 0;
}

function fmtDuration(msVal: number) {
  const msSafe = Number.isFinite(msVal) ? msVal : 0;
  const totalSeconds = Math.max(0, Math.floor(msSafe / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function countByStatus(steps: any[], status: string) {
  const s = status.toLowerCase();
  return steps.filter((x) => String(x.status || "pending").toLowerCase() === s).length;
}

function StatRow({ label, a, b }: { label: string; a: any; b: any }) {
  const same = String(a) === String(b);
  return (
    <View
      style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}
    >
      <Text style={{ fontWeight: "900" }}>{label}</Text>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}
      >
        <Text style={{ fontWeight: "800" }}>A: {String(a)}</Text>
        <Text style={{ fontWeight: "800" }}>B: {String(b)}</Text>
      </View>
      {!same ? (
        <Text style={{ marginTop: 4, opacity: 0.7 }}>Difference detected</Text>
      ) : (
        <Text style={{ marginTop: 4, opacity: 0.7 }}>Same</Text>
      )}
    </View>
  );
}

export default function SOPRunCompareResultScreen({ route, navigation }: any) {
  const runAId = route?.params?.runA;
  const runBId = route?.params?.runB;

  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const [runA, setRunA] = useState<any | null>(null);
  const [runB, setRunB] = useState<any | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  // Enrichment overlays
  const [deviations, setDeviations] = useState<any[]>([]);
  const [deviationsError, setDeviationsError] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLogsError, setAuditLogsError] = useState<any>(null);
  const [greenWaste, setGreenWaste] = useState<any[]>([]);
  const [greenWasteError, setGreenWasteError] = useState<any>(null);

  const load = async () => {
    if (!facilityId || !runAId || !runBId) return;
    setLoading(true);
    setError(null);
    setDeviationsError(null);
    setAuditLogsError(null);
    setGreenWasteError(null);
    try {
      const [aRes, bRes, tRes, devRes, auditRes, gwRes] = await Promise.all([
        apiRequest(endpoints.sopRun(facilityId, String(runAId))),
        apiRequest(endpoints.sopRun(facilityId, String(runBId))),
        apiRequest(endpoints.tasks(facilityId)),
        apiRequest(endpoints.deviations(facilityId)).catch((e) => {
          setDeviationsError(handleApiError(e));
          return { items: [] };
        }),
        apiRequest(endpoints.auditLogs(facilityId)).catch((e) => {
          setAuditLogsError(handleApiError(e));
          return { items: [] };
        }),
        apiRequest(endpoints.greenWaste(facilityId)).catch((e) => {
          setGreenWasteError(handleApiError(e));
          return { items: [] };
        })
      ]);
      setRunA(normalizeRun(aRes));
      setRunB(normalizeRun(bRes));
      setTasks(normalizeTasks(tRes));
      setDeviations(Array.isArray(devRes?.items) ? devRes.items : []);
      setAuditLogs(Array.isArray(auditRes?.items) ? auditRes.items : []);
      setGreenWaste(Array.isArray(gwRes?.items) ? gwRes.items : []);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId, runAId, runBId]);

  const computed = useMemo(() => {
    const aSteps = Array.isArray(runA?.steps) ? runA.steps : [];
    const bSteps = Array.isArray(runB?.steps) ? runB.steps : [];
    const aDuration = ms(runA?.completedAt) - ms(runA?.createdAt);
    const bDuration = ms(runB?.completedAt) - ms(runB?.createdAt);
    const aDone = countByStatus(aSteps, "done");
    const bDone = countByStatus(bSteps, "done");
    const aSkipped = countByStatus(aSteps, "skipped");
    const bSkipped = countByStatus(bSteps, "skipped");
    const aTotal = aSteps.length;
    const bTotal = bSteps.length;
    const linkedTasksA = tasks.filter(
      (t) => String(t?.sopRunId || "") === String(runA?._id || runAId)
    );
    const linkedTasksB = tasks.filter(
      (t) => String(t?.sopRunId || "") === String(runB?._id || runBId)
    );
    const aTaskCount = linkedTasksA.length;
    const bTaskCount = linkedTasksB.length;
    const avgLag = (arr: any[]) => {
      const lags = arr
        .map((t) => ms(t?.completedAt) - ms(t?.createdAt))
        .filter((x) => Number.isFinite(x) && x > 0);
      if (lags.length === 0) return null;
      const sum = lags.reduce((acc, x) => acc + x, 0);
      return sum / lags.length;
    };
    const aAvgLag = avgLag(linkedTasksA);
    const bAvgLag = avgLag(linkedTasksB);
    const titleA =
      runA?.sopTemplateTitleSnapshot || runA?.sopTemplateId || String(runAId || "");
    const titleB =
      runB?.sopTemplateTitleSnapshot || runB?.sopTemplateId || String(runBId || "");

    // Enrichment overlays
    // If completedAt missing, show N/A
    const validA = ms(runA?.createdAt) > 0 && ms(runA?.completedAt) > 0;
    const validB = ms(runB?.createdAt) > 0 && ms(runB?.completedAt) > 0;
    // Deviations
    const devCountA = validA
      ? deviations.filter(
          (d) =>
            ms(d.createdAt) >= ms(runA?.createdAt) &&
            ms(d.createdAt) <= ms(runA?.completedAt)
        ).length
      : "N/A";
    const devCountB = validB
      ? deviations.filter(
          (d) =>
            ms(d.createdAt) >= ms(runB?.createdAt) &&
            ms(d.createdAt) <= ms(runB?.completedAt)
        ).length
      : "N/A";
    // Audit logs
    const auditCountA = validA
      ? auditLogs.filter(
          (a) =>
            ms(a.createdAt) >= ms(runA?.createdAt) &&
            ms(a.createdAt) <= ms(runA?.completedAt)
        ).length
      : "N/A";
    const auditCountB = validB
      ? auditLogs.filter(
          (a) =>
            ms(a.createdAt) >= ms(runB?.createdAt) &&
            ms(a.createdAt) <= ms(runB?.completedAt)
        ).length
      : "N/A";
    // Green waste
    const gwCountA = validA
      ? greenWaste.filter(
          (g) =>
            ms(g.createdAt) >= ms(runA?.createdAt) &&
            ms(g.createdAt) <= ms(runA?.completedAt)
        ).length
      : "N/A";
    const gwCountB = validB
      ? greenWaste.filter(
          (g) =>
            ms(g.createdAt) >= ms(runB?.createdAt) &&
            ms(g.createdAt) <= ms(runB?.completedAt)
        ).length
      : "N/A";

    return {
      titleA,
      titleB,
      aDuration,
      bDuration,
      aTotal,
      bTotal,
      aDone,
      bDone,
      aSkipped,
      bSkipped,
      aTaskCount,
      bTaskCount,
      aAvgLag,
      bAvgLag,
      devCountA,
      devCountB,
      auditCountA,
      auditCountB,
      gwCountA,
      gwCountB
    };
  }, [runA, runB, tasks, runAId, runBId, deviations, auditLogs, greenWaste]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Run Comparison</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity onPress={load}>
            <Text style={{ fontWeight: "800" }}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSavePreset} disabled={savingPreset}>
            <Text style={{ fontWeight: "800", opacity: savingPreset ? 0.6 : 1 }}>
              {savingPreset ? "Saving..." : "Save Preset"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <InlineError error={error} />
      {/* InlineError for enrichment overlays */}
      <InlineError error={deviationsError} />
      <InlineError error={auditLogsError} />
      <InlineError error={greenWasteError} />
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontWeight: "900" }}>A: {computed.titleA}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("SOPRunDetail", { id: String(runAId) })}
          style={{ marginTop: 6 }}
        >
          <Text style={{ fontWeight: "800" }}>Open Run A →</Text>
        </TouchableOpacity>
        {runA && windowParams(runA) ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AuditLogs", {
                  start: windowParams(runA)!.start,
                  end: windowParams(runA)!.end
                })
              }
            >
              <Text style={{ fontWeight: "800" }}>Audit (A window)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Deviations", {
                  start: windowParams(runA)!.start,
                  end: windowParams(runA)!.end
                })
              }
            >
              <Text style={{ fontWeight: "800" }}>Deviations (A)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("GreenWaste", {
                  start: windowParams(runA)!.start,
                  end: windowParams(runA)!.end
                })
              }
            >
              <Text style={{ fontWeight: "800" }}>Green Waste (A)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ marginTop: 6, opacity: 0.7 }}>
            Run A window unavailable (missing completedAt)
          </Text>
        )}
        <Text style={{ fontWeight: "900", marginTop: 10 }}>B: {computed.titleB}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("SOPRunDetail", { id: String(runBId) })}
          style={{ marginTop: 6 }}
        >
          <Text style={{ fontWeight: "800" }}>Open Run B →</Text>
        </TouchableOpacity>
        {runB && windowParams(runB) ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AuditLogs", {
                  start: windowParams(runB)!.start,
                  end: windowParams(runB)!.end
                })
              }
            >
              <Text style={{ fontWeight: "800" }}>Audit (B window)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Deviations", {
                  start: windowParams(runB)!.start,
                  end: windowParams(runB)!.end
                })
              }
            >
              <Text style={{ fontWeight: "800" }}>Deviations (B)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("GreenWaste", {
                  start: windowParams(runB)!.start,
                  end: windowParams(runB)!.end
                })
              }
            >
              <Text style={{ fontWeight: "800" }}>Green Waste (B)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ marginTop: 6, opacity: 0.7 }}>
            Run B window unavailable (missing completedAt)
          </Text>
        )}
      </View>
      <StatRow
        label="Duration"
        a={fmtDuration(computed.aDuration)}
        b={fmtDuration(computed.bDuration)}
      />
      <StatRow label="Total Steps" a={computed.aTotal} b={computed.bTotal} />
      <StatRow label="Done Steps" a={computed.aDone} b={computed.bDone} />
      <StatRow label="Skipped Steps" a={computed.aSkipped} b={computed.bSkipped} />
      <StatRow label="Linked Tasks" a={computed.aTaskCount} b={computed.bTaskCount} />
      <StatRow
        label="Avg Task Close Lag (if timestamps exist)"
        a={computed.aAvgLag ? fmtDuration(computed.aAvgLag) : "N/A"}
        b={computed.bAvgLag ? fmtDuration(computed.bAvgLag) : "N/A"}
      />
      {/* Enrichment overlays */}
      <StatRow
        label="Deviations during run"
        a={computed.devCountA}
        b={computed.devCountB}
      />
      <StatRow
        label="Audit events during run"
        a={computed.auditCountA}
        b={computed.auditCountB}
      />
      <StatRow
        label="Green waste logs during run"
        a={computed.gwCountA}
        b={computed.gwCountB}
      />
      {/* Optional link buttons */}
      <View style={{ marginTop: 14 }}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AuditLogExplorer", {
              facilityId,
              start: runA?.createdAt,
              end: runA?.completedAt
            })
          }
          style={{ marginBottom: 6 }}
        >
          <Text style={{ color: "#2563eb", fontWeight: "800" }}>
            Open Audit Explorer (A window)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AuditLogExplorer", {
              facilityId,
              start: runB?.createdAt,
              end: runB?.completedAt
            })
          }
          style={{ marginBottom: 6 }}
        >
          <Text style={{ color: "#2563eb", fontWeight: "800" }}>
            Open Audit Explorer (B window)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("Deviations", { facilityId })}
          style={{ marginBottom: 6 }}
        >
          <Text style={{ color: "#059669", fontWeight: "800" }}>Open Deviations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("GreenWaste", { facilityId })}
        >
          <Text style={{ color: "#059669", fontWeight: "800" }}>Open Green Waste</Text>
        </TouchableOpacity>
        <Text style={{ opacity: 0.7, marginTop: 10 }}>
          Notes: Task lag requires tasks to include createdAt and completedAt timestamps.
          If your tasks do not include these, the field remains N/A deterministically.
          Deviations, audit logs, and green waste overlays are computed deterministically
          within each run window. If completedAt is missing, overlays show N/A.
        </Text>
      </View>
    </View>
  );
}
