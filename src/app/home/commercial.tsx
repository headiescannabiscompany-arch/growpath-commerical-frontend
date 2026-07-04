import { Redirect, Link, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { InlineError } from "@/components/InlineError";

type Action = {
  label: string;
  href: string;
};

type DashboardSection = {
  title: string;
  description: string;
  metrics?: Array<{ label: string; key: string }>;
  actions: Action[];
  status?: "Live" | "Active" | "Needs backend";
};

type DashboardModel = {
  storefront?: any;
  counts?: Record<string, number>;
  metrics?: Record<string, number>;
  sections?: Record<string, any[]>;
  actionItems?: Array<{
    type?: string;
    title?: string;
    priority?: string;
    productId?: string;
    inventoryId?: string;
  }>;
  guidance?: string[];
};

const QUICK_ACTIONS: Action[] = [
  { label: "Create Grow / Trial", href: "/home/commercial/grows/new" },
  { label: "Create Product", href: "/home/commercial/products/new" },
  { label: "Create Product Line", href: "/home/commercial/product-lines" },
  { label: "Open Batch Planner", href: "/home/commercial/batch-planner" },
  { label: "Create Feed Post", href: "/home/commercial/feed" },
  { label: "Create Course", href: "/home/commercial/courses" },
  { label: "Add Inventory Item", href: "/home/commercial/inventory-create" }
];

const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    title: "Grows & Trials",
    description:
      "Commercial users keep the Pro grow workspace, then link grows to products, formulas, batches, public reports, and trial outcomes.",
    status: "Active",
    metrics: [
      { label: "Active trials", key: "activeTrials" },
      { label: "Completed trials", key: "completedTrials" },
      { label: "Products needing trials", key: "productsMissingCompletedTrials" },
      { label: "Batches", key: "batches" }
    ],
    actions: [
      { label: "Open Grows", href: "/home/commercial/grows" },
      { label: "Create Grow", href: "/home/commercial/grows/new" },
      { label: "Product Trials", href: "/home/commercial/trials" }
    ]
  },
  {
    title: "Products & Storefront",
    description:
      "Product lines and products drive storefront, feed posts, courses, inventory, and external purchase links.",
    status: "Active",
    metrics: [
      { label: "Product lines", key: "productLines" },
      { label: "Products", key: "products" },
      { label: "Missing batches", key: "productsMissingBatches" },
      { label: "Store views", key: "storefrontViews" }
    ],
    actions: [
      { label: "Products", href: "/home/commercial/products" },
      { label: "Product Lines", href: "/home/commercial/product-lines" },
      { label: "Storefront", href: "/home/commercial/storefront" }
    ]
  },
  {
    title: "Soil / Nutrient / Formula Work",
    description:
      "Design formulas, scale batches, track guaranteed analysis, model release timing, and connect batches to trial grows.",
    status: "Active",
    metrics: [
      { label: "Recent batches", key: "batches" },
      { label: "Missing batches", key: "productsMissingBatches" },
      { label: "Active trials", key: "activeTrials" },
      { label: "Completed trials", key: "completedTrials" }
    ],
    actions: [
      { label: "Batch Planner", href: "/home/commercial/batch-planner" },
      { label: "Products", href: "/home/commercial/products" },
      { label: "Trials", href: "/home/commercial/trials" }
    ]
  },
  {
    title: "Inventory / Catalog",
    description:
      "Track plant, product, ingredient, packaging, genetics, equipment, course, and retail inventory. Inventory supports product and batch workflows; it is not the whole commercial app.",
    status: "Live",
    metrics: [
      { label: "Inventory items", key: "inventory" },
      { label: "Low stock", key: "lowStock" },
      { label: "External leads", key: "externalLeads" },
      { label: "Orders/leads", key: "orders" }
    ],
    actions: [
      { label: "Inventory", href: "/home/commercial/inventory" },
      { label: "Add Item", href: "/home/commercial/inventory-create" }
    ]
  },
  {
    title: "Content & Community",
    description:
      "Publish product updates, grow trial updates, course announcements, support answers, and seasonal education as the brand.",
    status: "Active",
    metrics: [
      { label: "Draft posts", key: "draftPosts" },
      { label: "Course drafts", key: "draftCourses" },
      { label: "Courses", key: "courses" },
      { label: "Posts", key: "posts" }
    ],
    actions: [
      { label: "Feed", href: "/home/commercial/feed" },
      { label: "Community", href: "/home/commercial/community" },
      { label: "Courses", href: "/home/commercial/courses" },
      { label: "Marketing Planner", href: "/home/commercial/marketing" }
    ]
  },
  {
    title: "Analytics Snapshot",
    description:
      "Start with simple, useful counts: ad clicks, storefront views, product views, external link clicks, inquiries, course starts, forum replies, and trial outcomes.",
    status: "Live",
    metrics: [
      { label: "Ad clicks", key: "adClicks" },
      { label: "External clicks", key: "externalClicks" },
      { label: "Product views", key: "productViews" },
      { label: "Trial outcomes", key: "completedTrials" }
    ],
    actions: [{ label: "Analytics", href: "/home/commercial/analytics" }]
  },
  {
    title: "Business Profile & Billing",
    description:
      "Manage business identity, storefront settings, public slug, logo/banner, support email, forum identity, social links, and billing.",
    status: "Active",
    metrics: [
      { label: "Storefront status", key: "storefrontConfigured" },
      { label: "Products", key: "products" },
      { label: "External leads", key: "externalLeads" },
      { label: "Low stock", key: "lowStock" }
    ],
    actions: [{ label: "Profile & Billing", href: "/home/commercial/profile" }]
  }
];

function ActionButton({ action }: { action: Action }) {
  return (
    <Link href={action.href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{action.label}</Text>
      </Pressable>
    </Link>
  );
}

function DashboardCard({
  section,
  counts
}: {
  section: DashboardSection;
  counts: Record<string, number>;
}) {
  return (
    <AppCard>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{section.title}</Text>
        {section.status ? <Text style={styles.statusPill}>{section.status}</Text> : null}
      </View>
      <Text style={styles.cardDesc}>{section.description}</Text>
      {section.metrics?.length ? (
        <View style={styles.metricGrid}>
          {section.metrics.map((metric) => (
            <View key={metric.key} style={styles.metric}>
              <Text style={styles.metricValue}>
                {(counts[metric.key] ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        {section.actions.map((action) => (
          <ActionButton key={`${section.title}-${action.href}`} action={action} />
        ))}
      </View>
    </AppCard>
  );
}

export default function CommercialHome() {
  const router = useRouter();
  const auth = useAuth();
  const ent = useEntitlements();
  const plan = ent.plan || "commercial";
  const [dashboard, setDashboard] = useState<DashboardModel>({});
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<any>(null);

  const logout = React.useCallback(async () => {
    await auth.logout();
    router.replace("/login");
  }, [auth, router]);

  useEffect(() => {
    if (!ent?.ready || ent.mode !== "commercial") return;
    let mounted = true;
    setLoadingDashboard(true);
    setDashboardError(null);
    apiRequest("/api/commercial/dashboard")
      .then((res: any) => {
        if (mounted) setDashboard(res?.dashboard ?? res?.data?.dashboard ?? res ?? {});
      })
      .catch((error) => {
        if (mounted) setDashboardError(error);
      })
      .finally(() => {
        if (mounted) setLoadingDashboard(false);
      });
    return () => {
      mounted = false;
    };
  }, [ent?.ready, ent.mode]);

  const counts = useMemo(() => {
    const raw = dashboard?.counts || dashboard?.metrics || {};
    return {
      ...raw,
      storefrontConfigured: dashboard?.storefront?.slug ? 1 : 0
    };
  }, [dashboard]);

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") {
    return <Redirect href="/home/personal" />;
  }

  return (
    <AppPage
      routeKey="home"
      longContent
      header={
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.headerTitle}>Brand Dashboard</Text>
            <Text style={styles.headerSubtitle}>
              {auth.user?.email} | {plan} plan
            </Text>
            <Text style={styles.headerDescription}>
              Pro grow workflow plus product lines, product trials, storefront,
              feed/content, course creation, inventory, and analytics.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            onPress={logout}
            style={styles.logoutButton}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      }
    >
      <AppCard style={styles.commandCard}>
        <Text style={styles.cardTitle}>Commercial command center</Text>
        <Text style={styles.cardDesc}>
          This account should operate like a serious Pro grower and a business at the same
          time. Start from grows/trials or products, then publish selected results through
          storefront, feed, forum, and courses.
        </Text>
        {dashboard?.storefront ? (
          <Text style={styles.dashboardMeta}>
            Storefront:{" "}
            {dashboard.storefront.name ||
              dashboard.storefront.businessName ||
              "Configured"}
            {dashboard.storefront.slug ? ` /${dashboard.storefront.slug}` : ""}
          </Text>
        ) : (
          <Text style={styles.dashboardMeta}>
            {loadingDashboard
              ? "Loading dashboard data..."
              : "Storefront not configured yet."}
          </Text>
        )}
        {dashboardError ? <InlineError error={dashboardError} /> : null}
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((action) => (
            <ActionButton key={`quick-${action.href}`} action={action} />
          ))}
        </View>
      </AppCard>

      {dashboard?.actionItems?.length ? (
        <AppCard>
          <Text style={styles.cardTitle}>Action Items</Text>
          <Text style={styles.cardDesc}>
            These come from products, batches, trials, leads, and inventory records.
          </Text>
          <View style={styles.actionItemList}>
            {dashboard.actionItems.slice(0, 8).map((item, index) => (
              <View
                key={`${item.type}-${item.productId || item.inventoryId || index}`}
                style={styles.actionItem}
              >
                <Text style={styles.actionItemTitle}>
                  {item.title || "Commercial task"}
                </Text>
                <Text style={styles.actionItemMeta}>
                  {item.type || "action"} | {item.priority || "normal"}
                </Text>
              </View>
            ))}
          </View>
        </AppCard>
      ) : null}

      {dashboard?.guidance?.length ? (
        <AppCard>
          <Text style={styles.cardTitle}>Dashboard Guidance</Text>
          {dashboard.guidance.map((line) => (
            <Text key={line} style={styles.guidance}>
              {line}
            </Text>
          ))}
        </AppCard>
      ) : null}

      <View style={styles.sectionGrid}>
        {DASHBOARD_SECTIONS.map((section) => (
          <DashboardCard key={section.title} section={section} counts={counts} />
        ))}
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  headerText: {
    flex: 1,
    minWidth: 280
  },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4
  },
  headerSubtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 4
  },
  headerDescription: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8
  },
  logoutButton: {
    backgroundColor: "#FEF2F2",
    borderColor: "#DC2626",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  logoutText: {
    color: "#991B1B",
    fontWeight: "900"
  },
  commandCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0"
  },
  sectionGrid: {
    gap: 14
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#0F172A",
    flex: 1,
    fontSize: 17,
    fontWeight: "900"
  },
  cardDesc: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  dashboardMeta: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 10
  },
  actionItemList: {
    gap: 8,
    marginTop: 12
  },
  actionItem: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  actionItemTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900"
  },
  actionItemMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  guidance: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  statusPill: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    color: "#075985",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  metric: {
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    padding: 9
  },
  metricValue: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "900"
  },
  metricLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#166534",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  actionText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  }
});
