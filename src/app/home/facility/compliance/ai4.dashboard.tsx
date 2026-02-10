import React from "react";
import { View, Text } from "react-native";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";

export default function ComplianceAi4DashboardScreen() {
  const { selectedId: facilityId } = useFacility();

  return (
    <ScreenBoundary name="facility.compliance.ai4.dashboard">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>
          Compliance Dashboard (AI4)
        </Text>

        {!facilityId ? (
          <Text>Select a facility first.</Text>
        ) : (
          <Text style={{ opacity: 0.75 }}>
            Stub screen (safe mount). Wire AI4 dashboard model + API calls next.
          </Text>
        )}
      </View>
    </ScreenBoundary>
  );
}
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { exampleAI4DashboardData, AI4DashboardData } from "./ai4.dashboard.contract";

// AI4 Dashboard Screen (v1)
// Contract-locked widgets, placeholder data
export default function AI4Dashboard({ data }: { data?: AI4DashboardData }) {


  import { buildDashboardModel } from "@/features/compliance/ai4/dashboard/buildDashboardModel";
  import { savedComparisonsStore } from "@/features/compliance/ai3/comparisons/savedComparisonsStore";
  import { fetchDeviationsSummary, fetchSopsRecommended } from "@/features/compliance/ai4/dashboard/complianceDashboardApi";
  import type {
    DeviationsSummaryResponse,
    SopsRecommendedResponse,
  } from "@/features/compliance/ai4/dashboard/complianceDashboardApi.contract";

    const router = useRouter();
    const facility = useFacility();
    const facilityId = facility.selectedId;
    const [comparisons, setComparisons] = React.useState([]);
    const [deviationsSummary, setDeviationsSummary] = React.useState<DeviationsSummaryResponse | null>(null);
    const [sopsRecommended, setSopsRecommended] = React.useState<SopsRecommendedResponse | null>(null);
    const [backendLoading, setBackendLoading] = React.useState<boolean>(false);

    useEffect(() => {
      if (!facilityId) {
        router.replace("/home/facility/select");
        return;
      }
      // Load comparisons for facility
      savedComparisonsStore.list().then(all => {
        setComparisons(all.filter(c => c.facilityId === facilityId));
      });
    }, [facilityId, router]);

    // Backend compliance fetch
    useEffect(() => {
      let cancelled = false;

      async function loadBackend() {
        if (!facilityId) return;

        setBackendLoading(true);
        try {
          const [dev, sops] = await Promise.all([
            fetchDeviationsSummary(facilityId),
            fetchSopsRecommended(facilityId),
          ]);

          if (cancelled) return;
          setDeviationsSummary(dev);
          setSopsRecommended(sops);
        } catch (e) {
          if (cancelled) return;
          // handleError is assumed to exist in scope; if not, add your error handler
          if (typeof handleError === "function") handleError(e);
          setDeviationsSummary(null);
          setSopsRecommended(null);
        } finally {
          if (!cancelled) setBackendLoading(false);
        }
      }

      loadBackend();
      return () => {
        cancelled = true;
      };
    }, [facilityId, typeof handleError === "function" ? handleError : undefined]);

    if (!facilityId) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusLabel}>Redirecting to facility selection...</Text>
        </View>
      );
    }

    // Pull weekly reports for facility
    const weeklyReports = getWeeklyReportsForFacility(facilityId);
    // Use deterministic builder
    const nowISO = new Date().toISOString();
    const model = buildDashboardModel({
      facilityId,
      nowISO,
      reports: weeklyReports,
      comparisons,
      deviationsSummary,
      sopsRecommended,
    });

    return (
      <ScrollView style={styles.container}>
        {/* Compliance Status Widget */}
        <View style={styles.widget}>
          <Text style={styles.title}>Compliance Status</Text>
          <Text style={styles.statusLabel}>
            {model.complianceStatus.level === "green" ? "✅" : model.complianceStatus.level === "yellow" ? "⚠️" : "❌"} {model.complianceStatus.summary}
          </Text>
          <TouchableOpacity
            style={styles.link}
            disabled={!model.complianceStatus.latestReportId}
            onPress={() => {
              if (model.complianceStatus.latestReportId) {
                router.push(`/home/facility/compliance/report-detail?reportId=${model.complianceStatus.latestReportId}`);
              }
            }}
          >
            <Text style={[styles.linkText, !model.complianceStatus.latestReportId && styles.disabled]}>View Latest Weekly Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.link}
            onPress={() => router.push("/home/facility/compliance/reports")}
          >
            <Text style={styles.linkText}>View All Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Trend Signals Widget */}
        <View style={styles.widget}>
          <Text style={styles.title}>Trend Signals</Text>
          {model.trendSignals.length === 0 ? (
            <Text style={styles.trendLabel}>Not enough history (need 2+ reports).</Text>
          ) : (
            model.trendSignals.map((t, i) => (
              <Text key={i} style={styles.trendLabel}>
                {t.type === "improvement" ? "📈" : t.type === "decline" ? "📉" : "🔁"} {t.label}: {t.value}
              </Text>
            ))
          )}
        </View>

        {/* Recurring Deviations Widget */}
        <View style={styles.widget}>
          <Text style={styles.title}>Recurring Deviations</Text>
          {model.actionQueue.length === 0 ? (
            <Text style={styles.trendLabel}>No high severity recurring deviations.</Text>
          ) : (
            model.actionQueue.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.actionItem}
                onPress={() => router.push(`/home/facility/compliance/deviation-detail?code=${a.targetId}`)}
              >
                <Text style={styles.actionLabel}>🚩 {a.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* AI Comparison Highlights Widget (stub, to be wired) */}
        <View style={styles.widget}>
          <Text style={styles.title}>AI Comparison Highlights</Text>
          {model.aiComparisonHighlights.length === 0 ? (
            <Text style={styles.trendLabel}>No saved comparisons yet.</Text>
          ) : (
            model.aiComparisonHighlights.map((h, i) => (
              <TouchableOpacity
                key={i}
                style={styles.actionItem}
                onPress={() => h.sourceReportId && router.push(`/home/facility/sop-runs/compare-result?reportId=${h.sourceReportId}`)}
                disabled={!h.sourceReportId}
              >
                <Text style={styles.actionLabel}>📝 {h.summary}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f8f9fa",
      padding: 16
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#fff"
    },
    widget: {
      marginBottom: 24,
      backgroundColor: "#fff",
      borderRadius: 8,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 8
    },
    statusLabel: {
      fontSize: 16,
      marginBottom: 8
    },
    link: {
      marginTop: 4
    },
    linkText: {
      color: "#007bff",
      fontSize: 15
    },
    disabled: {
      color: "#aaa"
    },
    trendLabel: {
      fontSize: 15,
      marginBottom: 4
    },
    actionItem: {
      marginBottom: 6
    },
    actionLabel: {
      fontSize: 15,
      color: "#222"
    }
  });
});
