import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  SafeAreaView
} from "react-native";
import AppShell from "../components/AppShell.js";
import { colors, spacing, radius, Typography } from "../theme/theme.js";
import { useAuth } from "../context/AuthContext.js";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getPlants } from "../api/plants.js";
import { listGrows } from "../api/grows.js";
import { getFeed } from "../api/posts.js";
import { getTrendingPosts } from "../api/forum.js";
import { normalizePostList } from "../utils/posts.js";
import {
  flattenGrowInterests,
  filterPostsByInterests,
  getTier1Metadata
} from "../utils/growInterests.js";
import { getTasks } from "../api/tasks.js";
import { FEATURES, getEntitlement } from "../utils/entitlements.js";

const { width } = Dimensions.get("window");
const tierOneConfig = getTier1Metadata();
const DASHBOARD_TIER1_TAGS = new Set(tierOneConfig?.options || []);

function getCategoryIcon(category) {
  const icons = {
    nutrients: "💧",
    lighting: "💡",
    water: "💦",
    substrate: "🌱",
    soil: "🪴",
    hydro: "🌊",
    training: "✂️",
    harvest: "🏆",
    diagnosis: "🔍"
  };
  return icons[category?.toLowerCase()] || "📝";
}

function getCategoryColor(index) {
  const palette = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444"];
  return palette[index % palette.length];
}

function summarizeTasks(tasks = []) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  let dueToday = 0;
  let overdue = 0;
  let completedToday = 0;

  tasks.forEach((task) => {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (!task.completed && dueDate instanceof Date && !Number.isNaN(dueDate)) {
      const normalizedDue = new Date(dueDate);
      normalizedDue.setHours(0, 0, 0, 0);
      if (normalizedDue < startOfDay) {
        overdue += 1;
      } else if (normalizedDue.getTime() === startOfDay.getTime()) {
        dueToday += 1;
      }
    }

    if (task.completed && task.completedAt) {
      const completedAt = new Date(task.completedAt);
      if (
        completedAt instanceof Date &&
        !Number.isNaN(completedAt) &&
        completedAt >= startOfDay &&
        completedAt <= endOfDay
      ) {
        completedToday += 1;
      }
    }
  });

  return {
    dueToday,
    overdue,
    completedToday,
    total: dueToday + overdue + completedToday
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing(4),
    paddingTop: spacing(4),
    paddingBottom: spacing(2)
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(0.5)
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSoft
  },
  logoutButton: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    minWidth: 90,
    alignItems: "center"
  },
  logoutText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14
  },
  section: {
    marginTop: spacing(4),
    paddingHorizontal: spacing(4)
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing(3)
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(3)
  },
  feedCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    minHeight: 120
  },
  feedCardEmpty: {
    minHeight: 0
  },
  seeAll: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600"
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  quickAction: {
    flex: 1,
    marginHorizontal: spacing(1),
    paddingVertical: spacing(3),
    borderRadius: radius.card,
    alignItems: "center",
    boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
    elevation: 3
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: spacing(1)
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing(1)
  },
  statCard: {
    width: (width - spacing(4) * 2 - spacing(2)) / 2,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(3),
    marginHorizontal: spacing(1),
    marginBottom: spacing(2),
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
    elevation: 2
  },
  statCardDisabled: {
    backgroundColor: "#f1f1f1"
  },
  statIcon: {
    fontSize: 32,
    marginRight: spacing(2)
  },
  statContent: {
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text
  },
  statValueDisabled: {
    color: colors.textSoft
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: spacing(0.5)
  },
  statLabelDisabled: {
    color: "#9CA3AF"
  },
  statSubLabel: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: spacing(0.5)
  },
  plantsScroll: {
    marginHorizontal: -spacing(4),
    paddingHorizontal: spacing(4)
  },
  plantCard: {
    width: 180,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginRight: spacing(3),
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    elevation: 4
  },
  plantImagePlaceholder: {
    height: 140,
    backgroundColor: colors.accent + "20",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    alignItems: "center",
    justifyContent: "center"
  },
  plantImageEmoji: {
    fontSize: 64
  },
  plantCardContent: {
    padding: spacing(3)
  },
  plantName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(0.5)
  },
  plantStrain: {
    fontSize: 13,
    color: colors.textSoft,
    marginBottom: spacing(2)
  },
  plantMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  plantMetaText: {
    fontSize: 12,
    color: colors.textSoft
  },
  plantStage: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
    backgroundColor: colors.accent + "20",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill
  },
  growCard: {
    width: 210,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    marginRight: spacing(3),
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    elevation: 4,
    overflow: "hidden"
  },
  growImagePlaceholder: {
    height: 130,
    backgroundColor: colors.accent + "15",
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  growImageEmoji: {
    fontSize: 62
  },
  growDaysBadge: {
    position: "absolute",
    bottom: spacing(2),
    right: spacing(2),
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.card
  },
  growDaysValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700"
  },
  growDaysLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    opacity: 0.8
  },
  growCardBody: {
    padding: spacing(3)
  },
  growCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(1)
  },
  growCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    marginRight: spacing(2)
  },
  growStageBadge: {
    backgroundColor: colors.accent + "20",
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.5),
    borderRadius: radius.pill
  },
  growStageText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent
  },
  growCardMeta: {
    fontSize: 12,
    color: colors.textSoft
  },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(6),
    alignItems: "center"
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: spacing(2)
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(1)
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSoft,
    textAlign: "center",
    marginBottom: spacing(3)
  },
  emptyStateButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: radius.pill
  },
  emptyStateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"
  },
  trendingCard: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(4),
    marginRight: spacing(3),
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
    elevation: 4
  },
  trendingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2)
  },
  trendingIconEmoji: {
    fontSize: 32
  },
  trendingCategory: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(0.5)
  },
  trendingCount: {
    fontSize: 12,
    color: colors.textSoft,
    marginBottom: spacing(2)
  },
  proBanner: {
    backgroundColor: "#667eea",
    borderRadius: radius.card,
    padding: spacing(4),
    boxShadow: "0px 8px 16px rgba(102, 126, 234, 0.3)",
    elevation: 6
  },
  proContent: {
    flexDirection: "row",
    alignItems: "center"
  },
  proIcon: {
    fontSize: 32,
    marginRight: spacing(3)
  },
  proText: {
    flex: 1
  },
  proTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: spacing(0.5)
  },
  proSubtitle: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9
  },
  proArrow: {
    fontSize: 24,
    color: "#FFFFFF"
  },
  feedItem: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing(3),
    marginBottom: spacing(3),
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
    elevation: 2
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing(2)
  },
  feedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing(2)
  },
  feedUsername: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text
  },
  feedTime: {
    fontSize: 12,
    color: colors.textSoft
  },
  feedText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing(2)
  },
  feedImage: {
    width: "100%",
    height: 160,
    borderRadius: radius.card,
    backgroundColor: colors.bg
  }
});

export default function DashboardScreen() {
  const { user, mode } = useAuth();
  // Entitlement checks for dashboard actions
  const analyticsEnt = getEntitlement(FEATURES.DASHBOARD_ANALYTICS, user?.role || "free");
  const exportEnt = getEntitlement(FEATURES.DASHBOARD_EXPORT, user?.role || "free");
  const teamToolsEnt = getEntitlement("rooms_equipment_staff", user?.role || "free");
  const addPlantEnt = getEntitlement(FEATURES.GROWLOGS_MULTI, user?.role || "free");

  return (
    <AppShell style={styles.container} contentContainerStyle={null}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome to GrowPath!</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.subtitle}>
          Your dashboard is ready. Start adding your plants, grows, and tasks!
        </Text>
        {/* Analytics (always rendered, gated) */}
        <TouchableOpacity
          style={[styles.logoutButton, analyticsEnt !== "enabled" && { opacity: 0.5 }]}
          disabled={analyticsEnt !== "enabled"}
        >
          <Text style={styles.logoutText}>
            {analyticsEnt === "cta"
              ? "Upgrade for Analytics"
              : analyticsEnt === "enabled"
                ? "View Analytics"
                : "Analytics (Locked)"}
          </Text>
        </TouchableOpacity>
        {/* Export (always rendered, gated) */}
        <TouchableOpacity
          style={[styles.logoutButton, exportEnt !== "enabled" && { opacity: 0.5 }]}
          disabled={exportEnt !== "enabled"}
        >
          <Text style={styles.logoutText}>
            {exportEnt === "cta"
              ? "Upgrade for Export"
              : exportEnt === "enabled"
                ? "Export Data"
                : "Export (Locked)"}
          </Text>
        </TouchableOpacity>
        {/* Team Tools (always rendered, gated) */}
        <TouchableOpacity
          style={[styles.logoutButton, teamToolsEnt !== "enabled" && { opacity: 0.5 }]}
          disabled={teamToolsEnt !== "enabled"}
        >
          <Text style={styles.logoutText}>
            {teamToolsEnt === "cta"
              ? "Upgrade for Team Tools"
              : teamToolsEnt === "enabled"
                ? "Team Tools"
                : "Team Tools (Locked)"}
          </Text>
        </TouchableOpacity>
        {/* Add Plant (always rendered, gated) */}
        <TouchableOpacity
          style={[styles.logoutButton, addPlantEnt !== "enabled" && { opacity: 0.5 }]}
          disabled={addPlantEnt !== "enabled"}
        >
          <Text style={styles.logoutText}>
            {addPlantEnt === "cta"
              ? "Upgrade to Add Plants"
              : addPlantEnt === "enabled"
                ? "Add Plant"
                : "Add Plant (Locked)"}
          </Text>
        </TouchableOpacity>
      </View>
    </AppShell>
  );
}
