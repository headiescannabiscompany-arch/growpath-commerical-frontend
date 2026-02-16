import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView
} from "react-native";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";
import { useRouter } from "expo-router";

// --- Helper UI ---
function StatCard({ title, value, status, hint, onPress }: any) {
  const color =
    status === "red" ? "#ef4444" : status === "yellow" ? "#f59e0b" : "#10b981";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: color,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "#fff"
      }}
      activeOpacity={0.85}
    >
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 2 }}>{title}</Text>
      <Text style={{ fontSize: 22, color, fontWeight: "700" }}>{value}</Text>
      {hint && <Text style={{ marginTop: 4, opacity: 0.7, fontSize: 13 }}>{hint}</Text>}
    </TouchableOpacity>
  );
}

// --- Status/Trend helpers ---
function getStatus(count: number) {
  return count > 0 ? "red" : "green";
}
function getYellowStatus(isYellow: boolean) {
  return isYellow ? "yellow" : "green";
}
function trendArrow(delta: number) {
  if (delta > 0) return "â†‘";
  if (delta < 0) return "â†“";
  return "â†’";
}

// --- Main Dashboard ---
export default function ComplianceDashboard() {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();
  const router = useRouter();

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<any>({});

  // Fetch all required data in parallel
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!facilityId) return;
      setLoading(true);
      setError(null);
      try {
        // Parallel fetches
        const [deviations, verifications, greenWaste, auditLogs, inventory] =
          await Promise.all([
            apiRequest(endpoints.deviations(facilityId)),
            apiRequest(endpoints.verification(facilityId)),
            apiRequest(endpoints.greenWaste(facilityId)),
            apiRequest(endpoints.auditLogs(facilityId)),
            apiRequest(endpoints.inventory(facilityId))
          ]);

        // Deviations
        const openDeviations = Array.isArray(deviations)
          ? deviations.filter((d: any) => d.status !== "closed").length
          : Array.isArray(deviations?.items)
            ? deviations.items.filter((d: any) => d.status !== "closed").length
            : 0;

        // Verifications
        const pendingVerifications = Array.isArray(verifications?.records)
          ? verifications.records.filter((v: any) => v.status !== "approved").length
          : Array.isArray(verifications)
            ? verifications.filter((v: any) => v.status !== "approved").length
            : 0;

        // Green Waste (trend)
        const greenWasteLogs = Array.isArray(greenWaste?.logs)
          ? greenWaste.logs
          : Array.isArray(greenWaste)
            ? greenWaste
            : [];
        const now = Date.now();
        const ms7d = 7 * 24 * 60 * 60 * 1000;
        const ms30d = 30 * 24 * 60 * 60 * 1000;
        const last7d = greenWasteLogs.filter(
          (g: any) => g.date && now - new Date(g.date).getTime() <= ms7d
        );
        const last30d = greenWasteLogs.filter(
          (g: any) => g.date && now - new Date(g.date).getTime() <= ms30d
        );
        const greenWaste7d = last7d.length;
        const greenWaste30dAvg = last30d.length ? last30d.length / 4.2857 : 0; // 30/7 â‰ˆ 4.2857
        const greenWasteDelta = Math.round(greenWaste7d - greenWaste30dAvg);

        // Inventory adjustments (trend)
        const inventoryAdjusts = Array.isArray(inventory)
          ? inventory
              .filter((i) => i.adjustments && Array.isArray(i.adjustments))
              .flatMap((i) => i.adjustments)
          : [];
        const invAdj7d = inventoryAdjusts.filter(
          (a) => a.date && now - new Date(a.date).getTime() <= ms7d
        ).length;
        const invAdj30d = inventoryAdjusts.filter(
          (a) => a.date && now - new Date(a.date).getTime() <= ms30d
        ).length;
        const invAdj30dAvg = invAdj30d ? invAdj30d / 4.2857 : 0;
        const invAdjDelta = Math.round(invAdj7d - invAdj30dAvg);

        // Audit activity (trend)
        const auditItems = Array.isArray(auditLogs?.items)
          ? auditLogs.items
          : Array.isArray(auditLogs)
            ? auditLogs
            : [];
        const audit7d = auditItems.filter(
          (a: any) => a.createdAt && now - new Date(a.createdAt).getTime() <= ms7d
        ).length;
        const audit30d = auditItems.filter(
          (a: any) => a.createdAt && now - new Date(a.createdAt).getTime() <= ms30d
        ).length;
        const audit30dAvg = audit30d ? audit30d / 4.2857 : 0;
        const auditDelta = Math.round(audit7d - audit30dAvg);

        // SOP Health (active SOPs)
        // For demo: if no SOPs, yellow; else green (no backend change)
        const activeSops = 1; // TODO: wire to real SOPs if endpoint available

        setData({
          openDeviations,
          pendingVerifications,
          greenWaste7d,
          greenWasteDelta,
          invAdj7d,
          invAdjDelta,
          audit7d,
          auditDelta,
          activeSops
        });
      } catch (e) {
        if (mounted) setError(handleApiError(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [facilityId, handleApiError]);

  // --- UI ---
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ padding: 16 }}
    >
      <InlineError error={error} />

      {/* Deviations */}
      <StatCard
        title="Open Deviations"
        value={data.openDeviations}
        status={getStatus(data.openDeviations)}
        hint={
          data.openDeviations > 0
            ? `${data.openDeviations} open deviation${data.openDeviations > 1 ? "s" : ""} require review`
            : "No open deviations"
        }
        onPress={() => router.push("/app/home/facility/(tabs)/deviations")}
      />

      {/* Verifications */}
      <StatCard
        title="Pending Verifications"
        value={data.pendingVerifications}
        status={getStatus(data.pendingVerifications)}
        hint={
          data.pendingVerifications > 0
            ? `${data.pendingVerifications} verification${data.pendingVerifications > 1 ? "s" : ""} pending approval`
            : "No pending verifications"
        }
        onPress={() => router.push("/app/home/facility/(tabs)/verifications")}
      />

      {/* Green Waste (trend) */}
      <StatCard
        title="Green Waste (7d)"
        value={`${data.greenWaste7d} ${trendArrow(data.greenWasteDelta)}`}
        status={getYellowStatus(data.greenWasteDelta > 0)}
        hint={
          data.greenWasteDelta > 0
            ? "Waste volume up vs 30-day avg"
            : data.greenWasteDelta < 0
              ? "Waste volume down vs 30-day avg"
              : "Flat vs 30-day avg"
        }
        onPress={() => router.push("/app/home/facility/(tabs)/green-waste")}
      />

      {/* Inventory Adjustments (trend) */}
      <StatCard
        title="Inventory Adjustments (7d)"
        value={`${data.invAdj7d} ${trendArrow(data.invAdjDelta)}`}
        status={getYellowStatus(data.invAdjDelta > 0)}
        hint={
          data.invAdjDelta > 0
            ? "Adjustments up vs 30-day avg"
            : data.invAdjDelta < 0
              ? "Adjustments down vs 30-day avg"
              : "Flat vs 30-day avg"
        }
        onPress={() => router.push("/app/home/facility/inventory")}
      />

      {/* Audit Activity (trend) */}
      <StatCard
        title="Audit Activity (7d)"
        value={`${data.audit7d} ${trendArrow(data.auditDelta)}`}
        status={getYellowStatus(data.auditDelta > 0)}
        hint={
          data.auditDelta > 0
            ? "Audit activity up vs 30-day avg"
            : data.auditDelta < 0
              ? "Audit activity down vs 30-day avg"
              : "Flat vs 30-day avg"
        }
        onPress={() => router.push("/app/home/facility/(tabs)/audit-logs")}
      />

      {/* SOP Health */}
      <StatCard
        title="Active SOPs"
        value={data.activeSops}
        status={getYellowStatus(data.activeSops === 0)}
        hint={data.activeSops === 0 ? "No active SOPs configured" : "SOPs are active"}
        onPress={() => router.push("/app/home/facility/(tabs)/sop-templates")}
      />
    </ScrollView>
  );
}

