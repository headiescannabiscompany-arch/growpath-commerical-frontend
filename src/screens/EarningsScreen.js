import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import StripeConnectPayoutCard from "../components/account/StripeConnectPayoutCard";
import { getEarningsByCourse, getMyEarnings } from "../api/earnings";
import ScreenContainer from "../components/ScreenContainer";
import { radius, spacing } from "../theme/theme";

function normalize(payload) {
  const data = payload?.data ?? payload ?? {};
  return {
    earnings: Array.isArray(data.earnings)
      ? data.earnings
      : Array.isArray(data.items)
        ? data.items
        : [],
    stats: data.stats || data.summary || data,
    courses: Array.isArray(data.courses) ? data.courses : [],
    payoutManagement: data.payoutManagement || null
  };
}

function money(value) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "Unavailable";
}

function earningStatus(item) {
  if (item.legacyLocalPaidMarker) return "Legacy local paid marker — unverified";
  switch (item.earningStatus) {
    case "available":
      return "Recorded seller earning";
    case "held":
      return "Held during payment review";
    case "adjustment_pending":
      return "Adjustment pending";
    case "refunded":
      return "Refunded";
    default:
      return item.earningStatus || "Recorded seller earning";
  }
}

export default function EarningsScreen({ navigation }) {
  const entitlements = useEntitlements();
  const canView = entitlements.can(CAPABILITY_KEYS.CREATOR_EARNINGS_VIEW);
  const canRequest = entitlements.can(CAPABILITY_KEYS.CREATOR_PAYOUT_REQUEST);
  const [data, setData] = useState(null);
  const [byCourse, setByCourse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  const stats = useMemo(() => data?.stats || {}, [data]);
  const earnings = data?.earnings || [];

  const loadEarnings = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const [earningsResult, courseResult] = await Promise.all([
        getMyEarnings(),
        getEarningsByCourse().catch(() => [])
      ]);
      setData(normalize(earningsResult));
      const coursePayload = courseResult?.data ?? courseResult;
      setByCourse(
        Array.isArray(coursePayload) ? coursePayload : coursePayload?.courses || []
      );
    } catch (error) {
      setFeedback(error?.message || "Failed to load earnings.");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    void loadEarnings();
  }, [loadEarnings]);

  const totals = useMemo(
    () => ({
      estimatedSellerNet: stats.estimatedSellerNet,
      totalSales: stats.totalSales ?? stats.sales ?? earnings.length,
      heldOrAdjustmentPending: stats.heldOrAdjustmentPending
    }),
    [earnings.length, stats]
  );

  if (!canView) {
    return (
      <ScreenContainer>
        <View style={styles.locked}>
          <Text style={styles.title}>Creator Earnings</Text>
          <Text style={styles.subtitle}>
            This account does not have `CREATOR_EARNINGS_VIEW`.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (loading || !data) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Creator Earnings</Text>
        <Text style={styles.subtitle}>
          Track recorded course and marketplace seller earnings. Verify balances and bank
          payouts in Stripe.
        </Text>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statValue}>{money(totals.estimatedSellerNet)}</Text>
            <Text style={styles.statLabel}>Estimated Seller Net</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totals.totalSales}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Stripe</Text>
            <Text style={styles.statLabel}>Bank Payout Status</Text>
          </View>
          <View style={[styles.statCard, styles.statCardPending]}>
            <Text style={styles.statValue}>{money(totals.heldOrAdjustmentPending)}</Text>
            <Text style={styles.statLabel}>Held / Adjustment</Text>
          </View>
        </View>

        {canRequest ? (
          <StripeConnectPayoutCard title="Stripe payout readiness" titleLevel={2} />
        ) : (
          <Text style={styles.subtitle}>
            This account does not have permission to manage seller payouts.
          </Text>
        )}

        <Text style={styles.sectionTitle}>Recorded seller net by course</Text>
        {byCourse.length ? (
          byCourse.map((course) => (
            <View
              key={String(course._id || course.id || course.courseId)}
              style={styles.saleCard}
            >
              <Text style={styles.saleTitle}>
                {course.title || course.courseTitle || "Course"}
              </Text>
              <Text style={styles.saleFooter}>
                {course.sales || course.totalSales || 0} sales |{" "}
                {money(course.earnings || course.totalEarned)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No course sales returned.</Text>
        )}

        <Text style={styles.sectionTitle}>Recent Sales</Text>
        {earnings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No sales yet</Text>
            <Text style={styles.emptyText}>
              Create courses and start earning when students enroll.
            </Text>
            <TouchableOpacity
              style={styles.createCourseBtn}
              onPress={() => navigation?.navigate?.("CreateCourse")}
            >
              <Text style={styles.createCourseBtnText}>Create a Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={earnings}
            scrollEnabled={false}
            keyExtractor={(item) => String(item._id || item.id || item.createdAt)}
            renderItem={({ item }) => (
              <View style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <Text style={styles.saleTitle} numberOfLines={1}>
                    {item.course?.title || item.courseTitle || "Course"}
                  </Text>
                  <Text style={styles.saleAmount}>
                    {money(item.creatorEarning ?? item.amount)}
                  </Text>
                </View>
                <View style={styles.saleFooterRow}>
                  <Text style={styles.saleFooter}>{item.buyer?.name || "Student"}</Text>
                  <Text style={styles.saleFooter}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>
                <Text style={styles.pending}>{earningStatus(item)}</Text>
                <Text style={styles.saleFooter}>Bank payout: verify in Stripe</Text>
              </View>
            )}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing(4), paddingBottom: 100 },
  locked: { padding: spacing(4) },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40
  },
  loadingText: { fontSize: 16, color: "#6B7280", marginTop: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.card,
    padding: spacing(3),
    alignItems: "center"
  },
  statCardPrimary: { backgroundColor: "#ECFDF5", borderColor: "#10B981" },
  statCardPending: { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" },
  statValue: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  saleCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: radius.card,
    padding: spacing(3),
    marginBottom: 12
  },
  saleHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  saleTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#111827" },
  saleAmount: { fontSize: 16, fontWeight: "800", color: "#10B981" },
  saleFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8
  },
  saleFooter: { fontSize: 13, color: "#6B7280" },
  pending: { marginTop: 8, color: "#B45309", fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 20 },
  createCourseBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.card
  },
  createCourseBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    padding: 8,
    marginBottom: 10
  }
});
