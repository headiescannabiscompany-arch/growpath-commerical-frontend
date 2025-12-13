import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { spacing } from "../theme/theme";
import { getMyEarnings, requestPayout } from "../api/earnings";

export default function EarningsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadEarnings() {
    try {
      setLoading(true);
      const result = await getMyEarnings();
      setData(result);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEarnings();
  }, []);

  const handleRequestPayout = async () => {
    const pendingAmount = parseFloat(data?.stats?.pendingPayout || 0);

    if (pendingAmount < 50) {
      Alert.alert(
        "Minimum Not Met",
        `You need at least $50 to request a payout. Current balance: $${pendingAmount.toFixed(2)}`
      );
      return;
    }

    Alert.alert(
      "Request Payout",
      `Request payout of $${pendingAmount.toFixed(2)} via Stripe?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request",
          onPress: async () => {
            try {
              const result = await requestPayout("stripe");
              Alert.alert("Success!", result.message);
              loadEarnings(); // Refresh
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to request payout");
            }
          }
        }
      ]
    );
  };

  if (loading || !data) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading earnings...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const { earnings, stats } = data;

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Creator Earnings</Text>
        <Text style={styles.subtitle}>Track your course revenue</Text>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statValue}>${stats.totalEarned}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statValue}>{stats.totalSales}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statValue}>${stats.totalPaidOut}</Text>
            <Text style={styles.statLabel}>Paid Out</Text>
          </View>

          <View style={[styles.statCard, styles.statCardPending]}>
            <Text style={styles.statIcon}>⏳</Text>
            <Text style={styles.statValue}>${stats.pendingPayout}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        {/* Payout Button */}
        <TouchableOpacity
          style={[
            styles.payoutBtn,
            parseFloat(stats.pendingPayout) < 50 && styles.payoutBtnDisabled
          ]}
          onPress={handleRequestPayout}
          disabled={parseFloat(stats.pendingPayout) < 50}
        >
          <Text style={styles.payoutBtnText}>
            Request Payout{" "}
            {parseFloat(stats.pendingPayout) >= 50
              ? `($${stats.pendingPayout})`
              : "(Min $50)"}
          </Text>
        </TouchableOpacity>

        {/* Revenue Split Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 Revenue Split</Text>
          <Text style={styles.infoText}>
            You earn <Text style={styles.infoBold}>85%</Text> of every course sale.
          </Text>
          <Text style={styles.infoText}>
            Platform takes 15% for hosting, payment processing, and infrastructure.
          </Text>
        </View>

        {/* Recent Sales */}
        <Text style={styles.sectionTitle}>Recent Sales</Text>

        {earnings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyTitle}>No sales yet</Text>
            <Text style={styles.emptyText}>
              Create courses and start earning when students enroll
            </Text>
            <TouchableOpacity
              style={styles.createCourseBtn}
              onPress={() => navigation.navigate("CreateCourse")}
            >
              <Text style={styles.createCourseBtnText}>Create a Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={earnings}
            scrollEnabled={false}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <Text style={styles.saleTitle} numberOfLines={1}>
                    {item.course?.title || "Course"}
                  </Text>
                  <Text style={styles.saleAmount}>
                    +${item.creatorEarning.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.saleFooter}>
                  <Text style={styles.saleBuyer}>{item.buyer?.name || "Student"}</Text>
                  <Text style={styles.saleDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                {item.paidOut && (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Paid Out</Text>
                  </View>
                )}
              </View>
            )}
          />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: spacing(4),
    paddingBottom: 100
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280"
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: spacing(3),
    alignItems: "center"
  },
  statCardPrimary: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981"
  },
  statCardPending: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B"
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600"
  },
  payoutBtn: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginVertical: 16
  },
  payoutBtnDisabled: {
    backgroundColor: "#9CA3AF"
  },
  payoutBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  infoCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: spacing(3),
    marginBottom: 24
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8
  },
  infoText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 4
  },
  infoBold: {
    fontWeight: "700",
    color: "#10B981"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16
  },
  saleCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: spacing(3),
    marginBottom: 12
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  saleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginRight: 12
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10B981"
  },
  saleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  saleBuyer: {
    fontSize: 13,
    color: "#6B7280"
  },
  saleDate: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  paidBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981"
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24
  },
  createCourseBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  createCourseBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600"
  }
});
