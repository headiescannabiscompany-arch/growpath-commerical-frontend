import { Redirect, useLocalSearchParams } from "expo-router";
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

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import AppPage from "@/components/layout/AppPage";
import AppCard from "@/components/layout/AppCard";
import { useEntitlements } from "@/entitlements";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";
import { radius } from "@/theme/theme";

type FulfillmentStatus = "unfulfilled" | "fulfilled" | "canceled";

type CommercialOrder = {
  id: string;
  _id?: string;
  productName?: string;
  customerName?: string;
  customerEmail?: string | null;
  quantity?: number;
  total?: number;
  amountCents?: number;
  currency?: string;
  status?: string;
  fulfillmentStatus?: FulfillmentStatus | string;
  createdAt?: string;
};

function asOrders(res: any): CommercialOrder[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.orders)) return res.orders;
  return [];
}

function orderKey(order: CommercialOrder) {
  return String(order.id || order._id || "");
}

function formatMoney(order: CommercialOrder) {
  const currency = String(order.currency || "USD").toUpperCase();
  const total =
    order.total !== undefined && order.total !== null
      ? Number(order.total)
      : Number(order.amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency
    }).format(Number.isFinite(total) ? total : 0);
  } catch {
    return `$${(Number.isFinite(total) ? total : 0).toFixed(2)}`;
  }
}

function formatDate(value?: string) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function statusLabel(value?: string) {
  return String(value || "pending").replace(/_/g, " ");
}

function getTotal(order: CommercialOrder) {
  const total =
    order.total !== undefined && order.total !== null
      ? Number(order.total)
      : Number(order.amountCents || 0) / 100;
  return Number.isFinite(total) ? total : 0;
}

const styles = StyleSheet.create({
  headerTitle: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B"
  },
  inner: {
    gap: 14,
    paddingBottom: 28
  },
  loading: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 28
  },
  muted: {
    color: "#64748B",
    fontSize: 13
  },
  feedback: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 148,
    padding: 12
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900"
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase"
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800",
    flex: 1
  },
  cardDesc: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginTop: 6
  },
  statusPill: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "capitalize"
  },
  fulfilledPill: {
    backgroundColor: "#D1FAE5",
    color: "#065F46"
  },
  canceledPill: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  metaPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: radius.card,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButton: {
    backgroundColor: "#475569"
  },
  dangerButton: {
    backgroundColor: "#B91C1C"
  },
  disabledButton: {
    opacity: 0.5
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28
  },
  focusedOrderCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#16A34A",
    borderWidth: 2
  }
});

export default function Orders() {
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const focusedOrderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  const ent = useEntitlements();
  const mapApiError = useApiErrorHandler();
  const [orders, setOrders] = useState<CommercialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState<UiErrorState | null>(null);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        setError(null);
        const res = await apiRequest(endpoints.commercial.orders, { method: "GET" });
        setOrders(asOrders(res));
      } catch (e) {
        setError(mapApiError.toInlineError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapApiError]
  );

  useEffect(() => {
    if (ent.ready && ent.mode === "commercial") void load();
  }, [ent.mode, ent.ready, load]);

  const summary = useMemo(() => {
    const paid = orders.filter((order) => order.status === "paid").length;
    const unfulfilled = orders.filter(
      (order) => order.fulfillmentStatus === "unfulfilled"
    ).length;
    const fulfilled = orders.filter(
      (order) => order.fulfillmentStatus === "fulfilled"
    ).length;
    const revenue = orders.reduce((sum, order) => sum + getTotal(order), 0);
    return {
      count: orders.length,
      paid,
      unfulfilled,
      fulfilled,
      revenue
    };
  }, [orders]);

  async function updateFulfillment(
    order: CommercialOrder,
    fulfillmentStatus: FulfillmentStatus
  ) {
    const id = orderKey(order);
    if (!id) return;
    setSavingId(id);
    setFeedback("");
    try {
      setError(null);
      const res = await apiRequest(endpoints.commercial.order(id), {
        method: "PATCH",
        body: { fulfillmentStatus }
      });
      const updated = res?.order ?? res;
      setOrders((current) =>
        current.map((candidate) => (orderKey(candidate) === id ? updated : candidate))
      );
      setFeedback(`${order.productName || "Order"} marked ${fulfillmentStatus}.`);
    } catch (e) {
      setError(mapApiError.toInlineError(e));
    } finally {
      setSavingId("");
    }
  }

  if (!ent.ready) return null;
  if (ent.mode !== "commercial") return <Redirect href="/home/personal" />;

  return (
    <AppPage
      routeKey="commercial-orders"
      header={
        <View>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            Orders
          </Text>
          <Text style={styles.headerSubtitle}>
            Track internal storefront purchases when checkout is enabled. If products use
            external purchase links, use analytics and inquiries instead of treating this
            page as fulfillment.
          </Text>
        </View>
      }
    >
      {error ? <InlineError error={error} onRetry={() => void load()} /> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ refresh: true })}
          />
        }
        contentContainerStyle={styles.inner}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.count}</Text>
            <Text style={styles.summaryLabel}>Orders</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.paid}</Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.unfulfilled}</Text>
            <Text style={styles.summaryLabel}>Needs Fulfillment</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>${summary.revenue.toFixed(2)}</Text>
            <Text style={styles.summaryLabel}>Revenue</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading orders...</Text>
          </View>
        ) : null}

        {!loading && orders.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No Orders Yet</Text>
            <Text style={styles.cardDesc}>
              Paid internal storefront orders will appear here when customers complete
              checkout. External product links should be measured through product views,
              link clicks, and inquiries.
            </Text>
          </AppCard>
        ) : null}

        {orders.map((order) => {
          const id = orderKey(order);
          const isFocused = Boolean(focusedOrderId && focusedOrderId === id);
          const fulfillmentStatus = String(
            order.fulfillmentStatus || "unfulfilled"
          ) as FulfillmentStatus;
          const saving = savingId === id;
          return (
            <AppCard
              key={id || `${order.productName}-${order.createdAt}`}
              accessibilityLabel={
                isFocused ? `Selected commercial order ${id}` : undefined
              }
              style={isFocused ? styles.focusedOrderCard : undefined}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {order.productName || "Storefront product"}
                </Text>
                <Text
                  style={[
                    styles.statusPill,
                    fulfillmentStatus === "fulfilled" && styles.fulfilledPill,
                    fulfillmentStatus === "canceled" && styles.canceledPill
                  ]}
                >
                  {statusLabel(fulfillmentStatus)}
                </Text>
              </View>
              <Text style={styles.cardDesc}>
                {order.customerName || "Customer"}
                {order.customerEmail ? ` | ${order.customerEmail}` : ""}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>{formatMoney(order)}</Text>
                <Text style={styles.metaPill}>Qty {Number(order.quantity || 1)}</Text>
                <Text style={styles.metaPill}>{statusLabel(order.status)}</Text>
                <Text style={styles.metaPill}>{formatDate(order.createdAt)}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mark order ${order.productName || id} fulfilled`}
                  disabled={saving || fulfillmentStatus === "fulfilled"}
                  onPress={() => void updateFulfillment(order, "fulfilled")}
                  style={[
                    styles.actionButton,
                    (saving || fulfillmentStatus === "fulfilled") && styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>
                    {saving ? "Updating..." : "Mark Fulfilled"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reopen order ${order.productName || id}`}
                  disabled={saving || fulfillmentStatus === "unfulfilled"}
                  onPress={() => void updateFulfillment(order, "unfulfilled")}
                  style={[
                    styles.actionButton,
                    styles.secondaryButton,
                    (saving || fulfillmentStatus === "unfulfilled") &&
                      styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>Reopen</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel order ${order.productName || id}`}
                  disabled={saving || fulfillmentStatus === "canceled"}
                  onPress={() => void updateFulfillment(order, "canceled")}
                  style={[
                    styles.actionButton,
                    styles.dangerButton,
                    (saving || fulfillmentStatus === "canceled") && styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>Cancel</Text>
                </Pressable>
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </AppPage>
  );
}
