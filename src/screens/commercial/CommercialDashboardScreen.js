import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { apiRequest } from "../../api/apiRequest";
import { fetchCampaigns } from "../../api/campaigns";
import { getMyCourses } from "../../api/courses";
import { fetchLinks } from "../../api/links";
import { fetchOrders } from "../../api/orders";
import { fetchProducts } from "../../api/products";
import { fetchStorefront } from "../../api/storefront";
import {
  fetchProductTrialEvidenceRuns,
  fetchCommercialLives
} from "../../api/commercialWorkflows";
import ScreenContainer from "../../components/ScreenContainer";

function rows(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function money(value) {
  const n = Number(value || 0);
  if (!n) return "$0.00";
  return `$${n.toFixed(2)}`;
}

async function fetchInventory() {
  const res = await apiRequest("/api/commercial/inventory", { method: "GET" });
  return rows(res, "inventory");
}

function isPublished(item) {
  return item?.status === "published" || item?.isPublished === true;
}

function StatCard({ label, value, detail, route, navigation }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.statCard}
      onPress={() => route && navigation.navigate(route)}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </Pressable>
  );
}

function ActionRow({ title, subtitle, route, navigation }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={styles.actionRow}
      onPress={() => navigation.navigate(route)}
    >
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.actionArrow}>Open</Text>
    </Pressable>
  );
}

export default function CommercialDashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState({
    storefront: null,
    products: [],
    courses: [],
    links: [],
    campaigns: [],
    orders: [],
    grows: [],
    lives: [],
    inventory: []
  });

  const load = useCallback(async (opts = {}) => {
    if (opts.refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [
        storefront,
        products,
        coursesRes,
        links,
        campaigns,
        orders,
        grows,
        lives,
        inventory
      ] = await Promise.all([
        fetchStorefront(),
        fetchProducts(),
        getMyCourses(),
        fetchLinks(),
        fetchCampaigns(),
        fetchOrders(),
        fetchProductTrialEvidenceRuns().catch(() => []),
        fetchCommercialLives().catch(() => []),
        fetchInventory()
      ]);

      setModel({
        storefront,
        products,
        courses: rows(coursesRes, "courses"),
        links,
        campaigns,
        orders,
        grows,
        lives,
        inventory
      });
    } catch (err) {
      setError(err?.message || "Unable to load commercial dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const publishedProducts = model.products.filter(isPublished).length;
    const activeMarketingPlans = model.campaigns.filter((c) =>
      ["active", "launched", "scheduled"].includes(String(c?.status || "").toLowerCase())
    ).length;
    const openExternalTracking = model.orders.filter(
      (o) =>
        !["complete", "completed", "fulfilled", "cancelled"].includes(
          String(o?.status || "").toLowerCase()
        )
    ).length;
    const revenue = model.orders.reduce(
      (sum, order) => sum + Number(order?.total || order?.totalAmount || 0),
      0
    );
    const lowStock = model.inventory.filter((item) => {
      const qty = Number(item?.qty ?? item?.quantity ?? item?.onHand ?? 0);
      const reorder = Number(item?.reorderPoint ?? item?.lowStockThreshold ?? 0);
      return reorder > 0 && qty <= reorder;
    }).length;

    return {
      publishedProducts,
      activeMarketingPlans,
      openExternalTracking,
      revenue,
      lowStock
    };
  }, [model]);

  return (
    <ScreenContainer scroll={false}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Commercial</Text>
            <Text style={styles.header}>Dashboard</Text>
            <Text style={styles.subtitle}>
              Storefront, products, product trial evidence, feed campaigns, courses,
              lives, inventory, analytics, and external tracking.
            </Text>
          </View>
          <Pressable style={styles.refreshButton} onPress={() => load({ refresh: true })}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.meta}>Loading commercial modules...</Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>
                {model.storefront?.name || "Storefront not configured"}
              </Text>
              <Text style={styles.meta}>
                {model.storefront?.slug
                  ? `/${model.storefront.slug}`
                  : "Add storefront name and slug before publishing products."}
              </Text>
              <View style={styles.heroActions}>
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate("Storefront")}
                >
                  <Text style={styles.primaryButtonText}>Manage Storefront</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate("NewCommercialProduct")}
                >
                  <Text style={styles.secondaryButtonText}>Add Product</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate("Courses")}
                >
                  <Text style={styles.secondaryButtonText}>Create Course</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate("CommercialLives")}
                >
                  <Text style={styles.secondaryButtonText}>Schedule Live</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.grid}>
              <StatCard
                label="Products"
                value={model.products.length}
                detail={`${summary.publishedProducts} published`}
                route="CommercialProducts"
                navigation={navigation}
              />
              <StatCard
                label="Courses"
                value={model.courses.length}
                detail="creator catalog"
                route="Courses"
                navigation={navigation}
              />
              <StatCard
                label="Lives"
                value={model.lives.length}
                detail="demos, Q&A, replays"
                route="CommercialLives"
                navigation={navigation}
              />
              <StatCard
                label="Product Evidence"
                value={model.grows.length}
                detail="trials and proof records"
                route="CommercialEvidenceRuns"
                navigation={navigation}
              />
              <StatCard
                label="Feed Campaigns"
                value={model.campaigns.length}
                detail={`${summary.activeMarketingPlans} active or scheduled`}
                route="Feed"
                navigation={navigation}
              />
              <StatCard
                label="Orders"
                value={model.orders.length}
                detail={`${summary.openExternalTracking} open`}
                route="CommercialOrders"
                navigation={navigation}
              />
              <StatCard
                label="Inventory Support"
                value={model.inventory.length}
                detail={`${summary.lowStock} low stock`}
                route="CommercialInventory"
                navigation={navigation}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Orders</Text>
              <Text style={styles.revenue}>{money(summary.revenue)}</Text>
              <Text style={styles.meta}>
                Use this for internal orders only when checkout exists. Otherwise track
                product views, external purchase clicks, inquiries, and leads.
              </Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Workflows</Text>
              <ActionRow
                title="Storefront"
                subtitle="Manage the public brand profile, featured products, courses, lives, campaigns, and setup checklist."
                route="Storefront"
                navigation={navigation}
              />
              <ActionRow
                title="Products and product support records"
                subtitle="Create products with photos, text, links, usage guidance, and trial evidence."
                route="CommercialProducts"
                navigation={navigation}
              />
              <ActionRow
                title="Soil & Nutrient Batch Planner"
                subtitle="Design, scale, cost, and test formulas before publishing product claims."
                route="CommercialBatchPlanner"
                navigation={navigation}
              />
              <ActionRow
                title="Courses"
                subtitle="Create free or paid education tied to products, grows, and support."
                route="Courses"
                navigation={navigation}
              />
              <ActionRow
                title="Lives"
                subtitle="Schedule Twitch demos, Q&A, reminders, replays, and related product/course links."
                route="CommercialLives"
                navigation={navigation}
              />
              <ActionRow
                title="Feed campaigns"
                subtitle="Publish ad and outreach campaigns linked to products, courses, lives, storefronts, and forum Q&A."
                route="Feed"
                navigation={navigation}
              />
              <ActionRow
                title="Marketing Planner"
                subtitle="Plan launches, product drops, course announcements, ads, feed campaigns, and tracked clicks."
                route="MarketingPlanner"
                navigation={navigation}
              />
              <ActionRow
                title="Orders / external tracking"
                subtitle="Review internal orders when available, plus external leads and click tracking."
                route="CommercialOrders"
                navigation={navigation}
              />
              <ActionRow
                title="Inventory support"
                subtitle="Track stock, ingredients, packaging, genetics, and retail counts that support products, batches, orders, and storefront availability."
                route="CommercialInventory"
                navigation={navigation}
              />
              <ActionRow
                title="Analytics"
                subtitle="Review ad clicks, storefront views, product clicks, course starts, replies, and trial counts."
                route="CommercialAnalytics"
                navigation={navigation}
              />
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 80 },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14
  },
  eyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  header: { color: "#111827", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#64748B", marginTop: 4, maxWidth: 620 },
  refreshButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  refreshText: { color: "#334155", fontWeight: "800" },
  error: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    marginBottom: 10,
    padding: 10
  },
  loading: { alignItems: "center", gap: 8, padding: 32 },
  hero: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16
  },
  heroTitle: { color: "#111827", fontSize: 20, fontWeight: "900" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  secondaryButton: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryButtonText: { color: "#334155", fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "31%",
    flexGrow: 1,
    minWidth: 150,
    padding: 14
  },
  statValue: { color: "#111827", fontSize: 26, fontWeight: "900" },
  statLabel: { color: "#334155", fontWeight: "800", marginTop: 4 },
  statDetail: { color: "#64748B", marginTop: 4 },
  panel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14
  },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "900" },
  revenue: { color: "#166534", fontSize: 28, fontWeight: "900", marginTop: 6 },
  actionRow: {
    alignItems: "center",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12
  },
  actionText: { flex: 1 },
  actionTitle: { color: "#111827", fontWeight: "900" },
  actionSubtitle: { color: "#64748B", marginTop: 3 },
  actionArrow: { color: "#166534", fontWeight: "900" },
  meta: { color: "#64748B", marginTop: 4 }
});
