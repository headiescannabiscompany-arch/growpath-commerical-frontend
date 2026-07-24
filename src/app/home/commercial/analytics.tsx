import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

import {
  fetchCommercialAnalyticsOverview,
  type CommercialAnalyticsBreakdownRow,
  type CommercialAnalyticsOverview
} from "@/api/commercialAnalytics";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { InlineError } from "@/components/InlineError";
import { radius } from "@/theme/theme";

function valueOf(metrics: CommercialAnalyticsOverview, keys: string[]) {
  for (const key of keys) {
    const value = (metrics as any)?.[key];
    if (value !== undefined && value !== null && value !== "") return Number(value) || 0;
  }
  return 0;
}

function rowsFor(
  metrics: CommercialAnalyticsOverview,
  key: keyof NonNullable<CommercialAnalyticsOverview["breakdowns"]>
): CommercialAnalyticsBreakdownRow[] {
  const rows = metrics.breakdowns?.[key];
  return Array.isArray(rows) ? rows : [];
}

function MetricCard({
  label,
  value,
  helper
}: {
  label: string;
  value: number;
  helper: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value.toLocaleString()}. ${helper}`}
      style={styles.metricCard}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value.toLocaleString()}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
    </View>
  );
}

function BreakdownList({
  title,
  rows,
  emptyText
}: {
  title: string;
  rows: CommercialAnalyticsBreakdownRow[];
  emptyText: string;
}) {
  return (
    <View style={styles.breakdownBox}>
      <Text accessibilityRole="header" style={styles.breakdownTitle}>
        {title}
      </Text>
      {rows.length ? (
        rows.slice(0, 5).map((row) => (
          <View key={row.key || row.label} style={styles.breakdownRow}>
            <View style={styles.breakdownCopy}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                {row.label || row.key}
              </Text>
              {row.eventTypes?.length ? (
                <Text style={styles.breakdownMeta} numberOfLines={1}>
                  {row.eventTypes.join(", ")}
                </Text>
              ) : null}
            </View>
            <Text style={styles.breakdownCount}>
              {Number(row.count || 0).toLocaleString()}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyBreakdown}>{emptyText}</Text>
      )}
    </View>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="link" style={styles.outlineButton}>
        <Text style={styles.outlineText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function formatCurrency(cents: number, currency: string) {
  try {
    return (Number(cents || 0) / 100).toLocaleString(undefined, {
      style: "currency",
      currency
    });
  } catch {
    return `${String(currency || "USD").toUpperCase()} ${(
      Number(cents || 0) / 100
    ).toFixed(2)}`;
  }
}

export default function CommercialAnalyticsRoute() {
  const [metrics, setMetrics] = useState<CommercialAnalyticsOverview>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchCommercialAnalyticsOverview();
      setMetrics(overview || {});
    } catch (err) {
      setError(err);
      setMetrics({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const normalized = useMemo(
    () => ({
      adClicks: valueOf(metrics, ["adClicks", "campaignClicks"]),
      marketingClicks: valueOf(metrics, ["marketingClicks", "linkClicks"]),
      storefrontViews: valueOf(metrics, ["storefrontViews"]),
      brandProfileViews: valueOf(metrics, ["brandProfileViews"]),
      productViews: valueOf(metrics, ["productViews"]),
      feedClicks: valueOf(metrics, ["feedClicks"]),
      courseStarts: valueOf(metrics, ["courseStarts"]),
      forumReplies: valueOf(metrics, ["forumReplies"]),
      activeTrials: valueOf(metrics, ["activeTrials"]),
      completedTrials: valueOf(metrics, ["completedTrials"]),
      feedImpressions: valueOf(metrics, ["feedImpressions"]),
      feedConversions: valueOf(metrics, ["feedConversions"]),
      liveViews: valueOf(metrics, ["liveViews"]),
      liveRsvps: valueOf(metrics, ["liveRsvps"]),
      orderCount: valueOf(metrics, ["orderCount"]),
      orderRevenueCents: valueOf(metrics, ["orderRevenueCents"])
    }),
    [metrics]
  );
  const hasRecordedActivity = useMemo(
    () =>
      Object.values(normalized).some((value) => Number(value || 0) > 0) ||
      Object.values(metrics.breakdowns || {}).some(
        (rows) => Array.isArray(rows) && rows.length > 0
      ),
    [metrics.breakdowns, normalized]
  );

  return (
    <AppPage
      routeKey="commercial-analytics"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial workspace</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Commercial Analytics
          </Text>
          <Text style={styles.subtitle}>
            Start with useful counts: ad clicks, marketing link clicks, storefront views,
            product views, campaign activity, course starts, live engagement, paid orders,
            and active/completed trials.
          </Text>
          <View style={styles.actions}>
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
            <ActionLink href="/home/commercial/products" label="Products" />
            <ActionLink href="/home/commercial/feed" label="Feed" />
          </View>
        </View>
      }
    >
      {error ? <InlineError error={error} onRetry={() => void load()} /> : null}

      <AppCard>
        <View style={styles.cardHeader}>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            Overview Metrics
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh commercial analytics"
            disabled={loading}
            onPress={() => void load()}
            style={[styles.refreshButton, loading && styles.disabledButton]}
          >
            {loading ? <ActivityIndicator color="#166534" /> : null}
            <Text style={styles.refreshText}>{loading ? "Loading" : "Refresh"}</Text>
          </Pressable>
        </View>
        {!loading && !error && !hasRecordedActivity ? (
          <View accessibilityRole="summary" style={styles.emptyNotice}>
            <Text style={styles.emptyNoticeTitle}>No recorded activity yet</Text>
            <Text style={styles.emptyNoticeBody}>
              Analytics begins when a published storefront receives visits or explicit
              campaign, course, live, trial, or paid-order activity is recorded. Draft
              setup and owner workspace previews are not counted.
            </Text>
          </View>
        ) : null}
        <View style={styles.metricGrid}>
          <MetricCard
            label="Ad clicks"
            value={normalized.adClicks}
            helper="Clicks attributed to ads or campaign-style plans"
          />
          <MetricCard
            label="Marketing link clicks"
            value={normalized.marketingClicks}
            helper="Outbound or tracked promotional link clicks"
          />
          <MetricCard
            label="Storefront views"
            value={normalized.storefrontViews}
            helper="Public storefront visits"
          />
          <MetricCard
            label="Brand profile views"
            value={normalized.brandProfileViews}
            helper="Public /brands profile visits"
          />
          <MetricCard
            label="Product views"
            value={normalized.productViews}
            helper="Product page visits"
          />
          <MetricCard
            label="Feed clicks"
            value={normalized.feedClicks}
            helper="Clicks from commercial feed campaigns"
          />
          <MetricCard
            label="Course starts"
            value={normalized.courseStarts}
            helper="Commercial course starts"
          />
          <MetricCard
            label="Forum replies"
            value={normalized.forumReplies}
            helper="Brand Forum/Q&A support replies"
          />
          <MetricCard
            label="Active trials"
            value={normalized.activeTrials}
            helper={`${normalized.completedTrials.toLocaleString()} completed trials`}
          />
          <MetricCard
            label="Feed impressions"
            value={normalized.feedImpressions}
            helper={`${normalized.feedConversions.toLocaleString()} recorded conversions`}
          />
          <MetricCard
            label="Live views"
            value={normalized.liveViews}
            helper={`${normalized.liveRsvps.toLocaleString()} recorded RSVP actions`}
          />
          <MetricCard
            label="Paid orders"
            value={normalized.orderCount}
            helper={`${Object.entries(
              metrics.orderRevenueByCurrency || { USD: normalized.orderRevenueCents }
            )
              .map(([currency, cents]) => formatCurrency(Number(cents || 0), currency))
              .join(" + ")} recorded revenue`}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Click and View Breakdown
        </Text>
        <Text style={styles.body}>
          See which ads, products, storefronts, and outbound links are driving activity.
          Public profile, store, and product page visits are attributed back to the
          commercial account when the storefront or product can be resolved.
        </Text>
        <View style={styles.breakdownGrid}>
          <BreakdownList
            title="Top ads / campaigns"
            rows={rowsFor(metrics, "ads")}
            emptyText="No ad clicks yet."
          />
          <BreakdownList
            title="Top products"
            rows={rowsFor(metrics, "products")}
            emptyText="No product views or clicks yet."
          />
          <BreakdownList
            title="Top storefronts"
            rows={rowsFor(metrics, "storefronts")}
            emptyText="No storefront views yet."
          />
          <BreakdownList
            title="Top links"
            rows={rowsFor(metrics, "links")}
            emptyText="No outbound link clicks yet."
          />
          <BreakdownList
            title="Courses"
            rows={rowsFor(metrics, "courses")}
            emptyText="No recorded course engagement yet."
          />
          <BreakdownList
            title="Lives"
            rows={rowsFor(metrics, "lives")}
            emptyText="No recorded live engagement yet."
          />
          <BreakdownList
            title="Paid orders"
            rows={rowsFor(metrics, "orders")}
            emptyText="No paid internal orders yet."
          />
          <BreakdownList
            title="Grow interests"
            rows={rowsFor(metrics, "growInterests")}
            emptyText="No event-backed grow-interest matches yet."
          />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Simple metrics first
        </Text>
        <Text style={styles.body}>
          Analytics should stay event-backed and practical. Start with product, campaigns,
          course, trial, ad-click, and external-link events before adding advanced
          reporting.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Product views and external link clicks</Text>
          <Text style={styles.bullet}>
            Brand profile views, storefront views, and featured product clicks
          </Text>
          <Text style={styles.bullet}>Feed campaign views, saves, and clicks</Text>
          <Text style={styles.bullet}>
            Ad/marketing plan clicks by product, campaign, course, or storefront link
          </Text>
          <Text style={styles.bullet}>Course starts/completions</Text>
          <Text style={styles.bullet}>Product trial counts and outcomes</Text>
        </View>
        <View style={styles.actions}>
          <ActionLink href="/store" label="Public Store Directory" />
          <ActionLink href="/home/commercial/marketing" label="Marketing Planner" />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Ad and marketing click counts
        </Text>
        <Text style={styles.body}>
          Commercial users should be able to see how many clicks their ads and promotional
          links get, even when the ad itself is managed outside GrowPath.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Clicks by marketing plan or campaign</Text>
          <Text style={styles.bullet}>
            Clicks by linked product, storefront, course, feed campaign, or external URL
          </Text>
          <Text style={styles.bullet}>
            Impressions when available from manual entry or future integrations
          </Text>
          <Text style={styles.bullet}>
            Click-through rate when both impressions and clicks exist
          </Text>
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          External checkout reality
        </Text>
        <Text style={styles.body}>
          If a product uses an external purchase URL, GrowPath should track product views,
          outbound clicks, inquiries, and follow-up content. Do not call those internal
          orders unless checkout is actually built.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            External link clicks by product and feed campaign
          </Text>
          <Text style={styles.bullet}>
            Ad clicks and marketing-plan clicks by linked target
          </Text>
          <Text style={styles.bullet}>Storefront-to-product conversion</Text>
          <Text style={styles.bullet}>Feed-to-storefront and feed-to-product clicks</Text>
          <Text style={styles.bullet}>
            Inquiry/support thread creation after product views
          </Text>
        </View>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/orders" label="Orders" />
          <ActionLink href="/home/commercial/feed" label="Feed / Campaigns" />
        </View>
      </AppCard>

      <AppCard>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          Trial and content outcomes
        </Text>
        <Text style={styles.body}>
          Analytics should connect commercial content to product trial evidence, courses,
          support, and storefront behavior before adding advanced reporting.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Active and completed product trials</Text>
          <Text style={styles.bullet}>
            Trial summaries converted into feed campaigns, lessons, or storefront proof
          </Text>
          <Text style={styles.bullet}>
            Course starts/completions for product education
          </Text>
          <Text style={styles.bullet}>Forum replies and unresolved support threads</Text>
        </View>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/courses" label="Courses" />
          <ActionLink href="/home/commercial/community" label="Forum / Q&A" />
        </View>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#475569", lineHeight: 21 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  outlineButton: {
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  outlineText: { color: "#166534", fontSize: 13, fontWeight: "900" },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  refreshButton: {
    alignItems: "center",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  refreshText: { color: "#166534", fontSize: 12, fontWeight: "900" },
  disabledButton: { opacity: 0.65 },
  emptyNotice: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 12,
    padding: 12
  },
  emptyNoticeTitle: { color: "#166534", fontSize: 14, fontWeight: "900" },
  emptyNoticeBody: { color: "#365E3D", fontSize: 13, lineHeight: 19, marginTop: 4 },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", lineHeight: 20, marginTop: 8 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  metricCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: "23%",
    flexGrow: 1,
    minWidth: 160,
    padding: 12
  },
  metricLabel: { color: "#475569", fontSize: 12, fontWeight: "900" },
  metricValue: { color: "#0F172A", fontSize: 24, fontWeight: "900", marginTop: 4 },
  metricHelper: { color: "#64748B", fontSize: 12, lineHeight: 17, marginTop: 4 },
  breakdownGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  breakdownBox: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: radius.card,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 240,
    padding: 12
  },
  breakdownTitle: { color: "#0F172A", fontSize: 13, fontWeight: "900" },
  breakdownRow: {
    alignItems: "center",
    borderTopColor: "rgba(15,23,42,0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8
  },
  breakdownCopy: { flex: 1, minWidth: 0 },
  breakdownLabel: { color: "#334155", fontSize: 13, fontWeight: "800" },
  breakdownMeta: { color: "#64748B", fontSize: 11, marginTop: 2 },
  breakdownCount: { color: "#166534", fontSize: 15, fontWeight: "900" },
  emptyBreakdown: { color: "#64748B", fontSize: 12, marginTop: 8 },
  bullets: { gap: 6, marginTop: 10 },
  bullet: { color: "#334155", fontSize: 13, fontWeight: "700", lineHeight: 19 }
});
