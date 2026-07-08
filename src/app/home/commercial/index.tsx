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
    sourceId?: string;
    productId?: string;
    productBatchId?: string;
    productTrialId?: string;
    courseId?: string;
    liveId?: string;
    feedCampaignId?: string;
    storefrontId?: string;
    inventoryId?: string;
    orderId?: string;
    alertId?: string;
  }>;
  guidance?: string[];
};

let commercialDashboardCache: DashboardModel | null = null;
let commercialDashboardPromise: Promise<DashboardModel> | null = null;
let commercialDashboardFetchedAt = 0;
const COMMERCIAL_DASHBOARD_CACHE_MS = 30000;

async function loadCommercialDashboard() {
  const now = Date.now();
  if (
    commercialDashboardCache &&
    now - commercialDashboardFetchedAt < COMMERCIAL_DASHBOARD_CACHE_MS
  ) {
    return commercialDashboardCache;
  }

  if (!commercialDashboardPromise) {
    commercialDashboardPromise = apiRequest("/api/commercial/dashboard")
      .then((res: any) => res?.dashboard ?? res?.data?.dashboard ?? res ?? {})
      .catch((error: any) => {
        if (error?.status === 404) return {};
        throw error;
      })
      .then((dashboard: DashboardModel) => {
        commercialDashboardCache = dashboard;
        commercialDashboardFetchedAt = Date.now();
        return dashboard;
      })
      .finally(() => {
        commercialDashboardPromise = null;
      });
  }

  return commercialDashboardPromise;
}

const QUICK_ACTIONS: Action[] = [
  { label: "View Storefront", href: "/home/commercial/storefront" },
  { label: "Edit Storefront", href: "/home/commercial/storefront/edit" },
  { label: "Add Product", href: "/home/commercial/products/new" },
  { label: "Create Course", href: "/home/commercial/courses" },
  { label: "Schedule Live", href: "/home/commercial/lives" },
  { label: "Create Feed Campaign", href: "/home/commercial/feed" },
  { label: "View Orders", href: "/home/commercial/orders" },
  { label: "View Analytics", href: "/home/commercial/analytics" }
];

const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    title: "Storefront Launch",
    description:
      "Your storefront is the public brand profile. Users should be able to follow the brand, view products, browse courses, RSVP to lives, and buy through Stripe.",
    status: "Active",
    metrics: [
      { label: "Storefront status", key: "storefrontConfigured" },
      { label: "Products", key: "products" },
      { label: "Courses", key: "courses" },
      { label: "Campaigns", key: "posts" }
    ],
    actions: [
      { label: "Open Storefront", href: "/home/commercial/storefront" },
      { label: "Products", href: "/home/commercial/products" },
      { label: "Feed Campaigns", href: "/home/commercial/feed" }
    ]
  },
  {
    title: "Products & Storefront",
    description:
      "Products are the commercial source of truth. Product lines, batches/lots, trials, and inventory are supporting views that feed storefront cards, campaigns, courses, and purchase links.",
    status: "Active",
    metrics: [
      { label: "Product lines", key: "productLines" },
      { label: "Products", key: "products" },
      { label: "Missing batches", key: "productsMissingBatches" },
      { label: "Store views", key: "storefrontViews" }
    ],
    actions: [
      { label: "Products", href: "/home/commercial/products" },
      { label: "Storefront", href: "/home/commercial/storefront" },
      { label: "Manage Product Lines", href: "/home/commercial/product-lines" }
    ]
  },
  {
    title: "Product Formulas, Batches & Trials",
    description:
      "Design product formulas, scale product batches/lots, track guaranteed analysis and release timing, then attach trial evidence back to the related product.",
    status: "Active",
    metrics: [
      { label: "Recent batches", key: "batches" },
      { label: "Missing batches", key: "productsMissingBatches" },
      { label: "Active trials", key: "activeTrials" },
      { label: "Completed trials", key: "completedTrials" }
    ],
    actions: [
      { label: "Product Batch Planner", href: "/home/commercial/batch-planner" },
      { label: "Products", href: "/home/commercial/products" },
      { label: "Product Trials", href: "/home/commercial/trials" }
    ]
  },
  {
    title: "Product Inventory Support",
    description:
      "Use inventory as a support view for product stock, ingredients, packaging, genetics, equipment, courses, and retail records. It should not become a second product universe.",
    status: "Live",
    metrics: [
      { label: "Inventory items", key: "inventory" },
      { label: "Low stock", key: "lowStock" },
      { label: "External leads", key: "externalLeads" },
      { label: "Orders/leads", key: "orders" }
    ],
    actions: [
      { label: "Open Inventory Support", href: "/home/commercial/inventory" },
      { label: "Add Support Item", href: "/home/commercial/inventory-create" }
    ]
  },
  {
    title: "Content & Forum / Q&A",
    description:
      "Create outreach campaigns for products, courses, lives, and storefront visibility. Discussion and Q&A belong in Forum/Q&A, not inside feed ads.",
    status: "Active",
    metrics: [
      { label: "Draft campaigns", key: "draftPosts" },
      { label: "Course drafts", key: "draftCourses" },
      { label: "Courses", key: "courses" },
      { label: "Campaigns", key: "posts" }
    ],
    actions: [
      { label: "Feed Campaigns", href: "/home/commercial/feed" },
      { label: "Forum / Q&A", href: "/home/commercial/community" },
      { label: "Courses", href: "/home/commercial/courses" },
      { label: "Lives", href: "/home/commercial/lives" },
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
    title: "Brand Profile & Billing",
    description:
      "Manage brand identity, storefront settings, public slug, logo/banner, support email, Forum/Q&A identity, external links, and billing.",
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

function actionItemSource(item: NonNullable<DashboardModel["actionItems"]>[number]) {
  const type = String(item.type || "");
  if (
    item.productBatchId ||
    type === "product_batch" ||
    type.startsWith("product_batch_")
  ) {
    return {
      sourceType: "product_batch",
      sourceId: item.productBatchId || item.sourceId
    };
  }
  if (item.productTrialId || type.includes("trial")) {
    return {
      sourceType: "product_trial",
      sourceId: item.productTrialId || item.sourceId
    };
  }
  if (item.productId || type.startsWith("product_")) {
    return { sourceType: "product", sourceId: item.productId || item.sourceId };
  }
  if (item.courseId || type.includes("course")) {
    return { sourceType: "course", sourceId: item.courseId || item.sourceId };
  }
  if (item.liveId || type.includes("live")) {
    return { sourceType: "live", sourceId: item.liveId || item.sourceId };
  }
  if (item.feedCampaignId || type.includes("feed") || type.includes("campaign")) {
    return {
      sourceType: "feed_campaign",
      sourceId: item.feedCampaignId || item.sourceId
    };
  }
  if (item.storefrontId || type.includes("storefront")) {
    return { sourceType: "storefront", sourceId: item.storefrontId || item.sourceId };
  }
  if (item.orderId || type.includes("order")) {
    return { sourceType: "order", sourceId: item.orderId || item.sourceId };
  }
  if (item.alertId || type.includes("alert")) {
    return { sourceType: "alert", sourceId: item.alertId || item.sourceId };
  }
  if (item.inventoryId || type.includes("inventory") || type.includes("stock")) {
    return {
      sourceType: "inventory",
      sourceId: item.inventoryId || item.sourceId
    };
  }
  return { sourceType: type || "commercial_dashboard", sourceId: item.sourceId };
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
  const [creatingActionTask, setCreatingActionTask] = useState("");
  const [taskFeedback, setTaskFeedback] = useState("");

  const logout = React.useCallback(async () => {
    await auth.logout();
    router.replace("/login");
  }, [auth, router]);

  useEffect(() => {
    if (!ent?.ready || ent.mode !== "commercial") return;
    let mounted = true;
    setLoadingDashboard(true);
    setDashboardError(null);
    loadCommercialDashboard()
      .then((nextDashboard) => {
        if (mounted) setDashboard(nextDashboard);
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

  async function createActionItemTask(
    item: NonNullable<DashboardModel["actionItems"]>[number],
    index: number
  ) {
    const key = `${item.type || "dashboard"}-${item.sourceId || item.productId || item.inventoryId || index}`;
    if (creatingActionTask) return;
    const source = actionItemSource(item);
    setCreatingActionTask(key);
    setTaskFeedback("");
    try {
      await apiRequest("/api/tasks", {
        method: "POST",
        body: {
          workspaceType: "commercial",
          title: `Resolve dashboard action: ${item.title || "Commercial task"}`,
          description: [
            `Dashboard action type: ${item.type || "commercial_dashboard"}.`,
            "Created from the commercial command center so storefront, product, course, live, inventory, and campaign gaps become trackable work."
          ].join(" "),
          sourceType: source.sourceType,
          sourceId: source.sourceId || undefined,
          sourceObjectId: source.sourceId || undefined,
          actionItemType: item.type || "commercial_dashboard",
          actionItemTitle: item.title || "Commercial dashboard action",
          linkedProductId: item.productId || undefined,
          linkedProductBatchId: item.productBatchId || undefined,
          linkedProductTrialId: item.productTrialId || undefined,
          linkedTrialId: item.productTrialId || undefined,
          linkedCourseId: item.courseId || undefined,
          linkedLiveId: item.liveId || undefined,
          linkedFeedCampaignId: item.feedCampaignId || undefined,
          linkedFeedPostId: item.feedCampaignId || undefined,
          linkedStorefrontId: item.storefrontId || undefined,
          linkedInventoryId: item.inventoryId || undefined,
          linkedOrderId: item.orderId || undefined,
          linkedAlertId: item.alertId || undefined,
          priority: item.priority === "critical" ? "critical" : item.priority || "normal",
          status: "open",
          reminderPlan: { label: "24 hours before", channels: ["in_app"] }
        }
      });
      setTaskFeedback("Commercial dashboard task created.");
    } catch {
      setTaskFeedback("Unable to create dashboard task.");
    } finally {
      setCreatingActionTask("");
    }
  }

  if (!ent?.ready) return null;
  if (ent.mode !== "commercial") {
    return <Redirect href="/home/personal" />;
  }

  return (
    <AppPage
      routeKey="commercial_home"
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
              Brand profile and storefront plus products, courses, lives, feed campaigns,
              orders, Stripe readiness, and analytics.
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
        <View style={styles.commandHeader}>
          <View style={styles.commandCopy}>
            <Text style={styles.cardTitle}>Commercial command center</Text>
            <Text style={styles.cardDesc}>
              Start from the storefront. Add products and courses, schedule lives, create
              feed campaigns for outreach, and use Forum/Q&A for discussion and support.
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
          </View>
          <View style={styles.pulseStack}>
            <View style={styles.pulse}>
              <Text style={styles.pulseValue}>
                {dashboard?.storefront?.slug ? "Live" : "Draft"}
              </Text>
              <Text style={styles.pulseLabel}>Storefront</Text>
            </View>
            <View style={styles.pulse}>
              <Text style={styles.pulseValue}>
                {(counts.products ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.pulseLabel}>Products</Text>
            </View>
          </View>
        </View>
        {dashboardError ? <InlineError error={dashboardError} /> : null}
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((action) => (
            <ActionButton key={`quick-${action.label}-${action.href}`} action={action} />
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Create task for dashboard action ${item.title || index + 1}`}
                  style={styles.taskButton}
                  disabled={Boolean(creatingActionTask)}
                  onPress={() => void createActionItemTask(item, index)}
                >
                  <Text style={styles.taskButtonText}>
                    {creatingActionTask ? "Creating..." : "Create Task"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          {taskFeedback ? <Text style={styles.feedback}>{taskFeedback}</Text> : null}
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

      <AppCard style={styles.aiHelperCard}>
        <Text style={styles.cardTitle}>Commercial launch assistant</Text>
        <Text style={styles.cardDesc}>
          Turn storefront warnings, product gaps, course launch work, live prep, campaign
          follow-up, and analytics questions into reviewable tasks. The assistant explains
          the workflow and drafts action plans; Stripe, product, course, live, feed, task,
          and analytics records remain the source of truth.
        </Text>
        <View style={styles.actions}>
          <ActionButton
            action={{ label: "Open Commercial Tasks", href: "/home/commercial/tasks" }}
          />
          <ActionButton
            action={{
              label: "Plan Campaign Work",
              href: "/home/commercial/marketing"
            }}
          />
          <ActionButton
            action={{
              label: "Review Analytics",
              href: "/home/commercial/analytics"
            }}
          />
        </View>
      </AppCard>

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
  commandHeader: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  commandCopy: {
    flex: 1,
    minWidth: 260
  },
  pulseStack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  pulse: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BBF7D0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    padding: 10
  },
  pulseValue: {
    color: "#14532D",
    fontSize: 18,
    fontWeight: "900"
  },
  pulseLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase"
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
  taskButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  taskButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900"
  },
  feedback: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#166534",
    fontWeight: "800",
    marginTop: 10,
    padding: 10
  },
  guidance: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8
  },
  aiHelperCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1"
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
