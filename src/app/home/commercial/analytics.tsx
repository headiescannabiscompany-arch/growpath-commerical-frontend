import React, { useEffect, useMemo, useState } from "react";
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
    <View style={styles.metricCard}>
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
      <Text style={styles.breakdownTitle}>{title}</Text>
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
            <Text style={styles.breakdownCount}>{Number(row.count || 0).toLocaleString()}</Text>
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
      <Pressable style={styles.outlineButton}>
        <Text style={styles.outlineText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function CommercialAnalyticsRoute() {
  const [metrics, setMetrics] = useState<CommercialAnalyticsOverview>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchCommercialAnalyticsOverview()
      .then((overview) => {
        if (mounted) setMetrics(overview || {});
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setMetrics({});
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
      completedTrials: valueOf(metrics, ["completedTrials"])
    }),
    [metrics]
  );

  return (
    <AppPage
      routeKey="commercial-analytics"
      longContent
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial workspace</Text>
          <Text style={styles.title}>Commercial Analytics</Text>
          <Text style={styles.subtitle}>
            Start with useful counts: ad clicks, marketing link clicks, storefront views,
            product views, feed clicks, course starts, forum replies, inventory alerts,
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
      {error ? <InlineError error={error} /> : null}

      <AppCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Overview Metrics</Text>
          {loading ? <ActivityIndicator /> : null}
        </View>
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
            helper="Clicks from commercial posts"
          />
          <MetricCard
            label="Course starts"
            value={normalized.courseStarts}
            helper="Commercial course starts"
          />
          <MetricCard
            label="Forum replies"
            value={normalized.forumReplies}
            helper="Brand/community support replies"
          />
          <MetricCard
            label="Active trials"
            value={normalized.activeTrials}
            helper={`${normalized.completedTrials.toLocaleString()} completed trials`}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Click and View Breakdown</Text>
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
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Simple metrics first</Text>
        <Text style={styles.body}>
          Analytics should stay event-backed and practical. Start with product, feed,
          course, trial, ad-click, and external-link events before adding advanced
          reporting.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Product views and external link clicks</Text>
          <Text style={styles.bullet}>
            Brand profile views, storefront views, and featured product clicks
          </Text>
          <Text style={styles.bullet}>Feed post views, comments, saves, and clicks</Text>
          <Text style={styles.bullet}>
            Ad/marketing plan clicks by product, post, course, or storefront link
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
        <Text style={styles.cardTitle}>Ad and marketing click counts</Text>
        <Text style={styles.body}>
          Commercial users should be able to see how many clicks their ads and promotional
          links get, even when the ad itself is managed outside GrowPathAI.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Clicks by marketing plan or campaign</Text>
          <Text style={styles.bullet}>
            Clicks by linked product, storefront, course, feed post, or external URL
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
        <Text style={styles.cardTitle}>External checkout reality</Text>
        <Text style={styles.body}>
          If a product uses an external purchase URL, GrowPathAI should track product
          views, outbound clicks, inquiries, and follow-up content. Do not call those
          internal orders unless checkout is actually built.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>External link clicks by product and feed post</Text>
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
          <ActionLink href="/orders" label="Orders / External Tracking" />
          <ActionLink href="/home/commercial/feed" label="Commercial Feed" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Trial and content outcomes</Text>
        <Text style={styles.body}>
          Analytics should connect commercial content to product trial evidence, courses,
          support, and storefront behavior before adding advanced reporting.
        </Text>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>Active and completed product trials</Text>
          <Text style={styles.bullet}>
            Trial summaries converted into feed posts, lessons, or storefront proof
          </Text>
          <Text style={styles.bullet}>
            Course starts/completions for product education
          </Text>
          <Text style={styles.bullet}>Forum replies and unresolved support threads</Text>
        </View>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/courses" label="Courses" />
          <ActionLink href="/home/commercial/community" label="Community" />
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
    borderRadius: 8,
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
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", lineHeight: 20, marginTop: 8 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  metricCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "rgba(15,23,42,0.12)",
    borderRadius: 10,
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
    borderRadius: 10,
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
