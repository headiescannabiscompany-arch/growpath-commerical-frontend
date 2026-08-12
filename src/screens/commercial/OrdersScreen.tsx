import { Redirect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
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

export function createCommercialOrdersStyles(palette: ThemePalette) {
  return StyleSheet.create({
    headerTitle: {
      color: palette.text,
      fontSize: 28,
      fontWeight: "800",
      marginBottom: 4
    },
    headerSubtitle: {
      fontSize: 14,
      color: palette.textMuted
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
      color: palette.textMuted,
      fontSize: 13
    },
    sectionTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "900"
    },
    progressRow: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    feedback: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.success,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.success,
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
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 148,
      padding: 12
    },
    summaryValue: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "900"
    },
    summaryLabel: {
      color: palette.textMuted,
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
      color: palette.text,
      fontSize: 16,
      fontWeight: "800",
      flex: 1
    },
    cardDesc: {
      fontSize: 14,
      color: palette.textMuted,
      lineHeight: 20,
      marginTop: 6
    },
    statusPill: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.info,
      borderWidth: 1,
      borderRadius: 999,
      color: palette.info,
      fontSize: 12,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3,
      textTransform: "capitalize"
    },
    fulfilledPill: {
      borderColor: palette.success,
      color: palette.success
    },
    canceledPill: {
      borderColor: palette.danger,
      color: palette.danger
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10
    },
    metaPill: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      color: palette.text,
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
      backgroundColor: palette.accent,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButton: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border
    },
    dangerButton: {
      backgroundColor: palette.surface,
      borderColor: palette.danger
    },
    disabledButton: {
      opacity: 0.5
    },
    actionText: {
      color: palette.accentText,
      fontSize: 13,
      fontWeight: "900"
    },
    secondaryActionText: {
      color: palette.text
    },
    dangerActionText: {
      color: palette.danger
    },
    emptyCard: {
      alignItems: "center",
      paddingVertical: 28
    },
    focusedOrderCard: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderWidth: 2
    }
  });
}

export default function Orders() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialOrdersStyles(palette), [palette]);
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const focusedOrderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  const ent = useEntitlements();
  const mapApiError = useApiErrorHandler();
  const [orders, setOrders] = useState<CommercialOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [loadError, setLoadError] = useState<UiErrorState | null>(null);
  const [actionError, setActionError] = useState<UiErrorState | null>(null);
  const [feedback, setFeedback] = useState("");
  const [pendingCancelId, setPendingCancelId] = useState("");
  const loadInFlightRef = useRef(false);
  const writeInFlightRef = useRef(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (loadInFlightRef.current || writeInFlightRef.current) return;
      loadInFlightRef.current = true;
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      setActionError(null);
      setPendingCancelId("");
      try {
        setLoadError(null);
        const res = await apiRequest(endpoints.commercial.orders, { method: "GET" });
        setOrders(asOrders(res));
        setHasLoaded(true);
      } catch (e) {
        setLoadError(mapApiError.toInlineError(e));
      } finally {
        loadInFlightRef.current = false;
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
  const interactionBusy = loading || refreshing || Boolean(savingId);

  async function updateFulfillment(
    order: CommercialOrder,
    fulfillmentStatus: FulfillmentStatus
  ) {
    const id = orderKey(order);
    if (!id || loadInFlightRef.current || writeInFlightRef.current) return;
    writeInFlightRef.current = true;
    setSavingId(id);
    setFeedback("");
    try {
      setLoadError(null);
      setActionError(null);
      const res = await apiRequest(endpoints.commercial.order(id), {
        method: "PATCH",
        body: { fulfillmentStatus }
      });
      const updated = res?.order ?? res;
      if (!updated || !orderKey(updated)) {
        throw new Error(
          "The order update response was incomplete. Reload and try again."
        );
      }
      setOrders((current) =>
        current.map((candidate) => (orderKey(candidate) === id ? updated : candidate))
      );
      setPendingCancelId("");
      setFeedback(`${order.productName || "Order"} marked ${fulfillmentStatus}.`);
    } catch (e) {
      setActionError(mapApiError.toInlineError(e));
    } finally {
      writeInFlightRef.current = false;
      setSavingId("");
    }
  }

  function requestCancel(order: CommercialOrder) {
    const id = orderKey(order);
    if (!id || interactionBusy) return;
    setLoadError(null);
    setActionError(null);
    setFeedback("");
    setPendingCancelId(id);
  }

  if (!ent.ready) return null;
  if (ent.mode !== "commercial") return <Redirect href="/home/personal" />;

  return (
    <AppPage
      routeKey="commercial-orders"
      header={
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.headerTitle}>
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
      {loadError ? <InlineError error={loadError} onRetry={() => void load()} /> : null}
      {actionError ? <InlineError error={actionError} /> : null}
      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      {savingId ? (
        <View
          accessibilityLabel="Updating commercial order in progress"
          accessibilityRole="progressbar"
          accessibilityValue={{ text: "Updating commercial order" }}
          style={styles.progressRow}
        >
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>Updating commercial order...</Text>
        </View>
      ) : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            colors={[palette.accent]}
            enabled={!interactionBusy}
            refreshing={refreshing}
            onRefresh={() => void load({ refresh: true })}
            tintColor={palette.accent}
          />
        }
        contentContainerStyle={styles.inner}
      >
        {hasLoaded ? (
          <>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              Order Summary
            </Text>
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
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              Current Orders
            </Text>
          </>
        ) : null}

        {loading ? (
          <View
            accessibilityLabel="Loading commercial orders"
            accessibilityRole="progressbar"
            accessibilityValue={{ text: "Loading commercial orders" }}
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading orders...</Text>
          </View>
        ) : null}

        {hasLoaded && !loading && !loadError && orders.length === 0 ? (
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
                  accessibilityState={{
                    disabled: interactionBusy || fulfillmentStatus === "fulfilled"
                  }}
                  disabled={interactionBusy || fulfillmentStatus === "fulfilled"}
                  onPress={() => void updateFulfillment(order, "fulfilled")}
                  style={[
                    styles.actionButton,
                    (interactionBusy || fulfillmentStatus === "fulfilled") &&
                      styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>
                    {saving ? "Updating..." : "Mark Fulfilled"}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reopen order ${order.productName || id}`}
                  accessibilityState={{
                    disabled: interactionBusy || fulfillmentStatus === "unfulfilled"
                  }}
                  disabled={interactionBusy || fulfillmentStatus === "unfulfilled"}
                  onPress={() => void updateFulfillment(order, "unfulfilled")}
                  style={[
                    styles.actionButton,
                    styles.secondaryButton,
                    (interactionBusy || fulfillmentStatus === "unfulfilled") &&
                      styles.disabledButton
                  ]}
                >
                  <Text style={[styles.actionText, styles.secondaryActionText]}>
                    Reopen
                  </Text>
                </Pressable>
                {pendingCancelId === id ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Confirm cancel order ${order.productName || id}`}
                      accessibilityState={{ disabled: interactionBusy }}
                      disabled={interactionBusy}
                      onPress={() => void updateFulfillment(order, "canceled")}
                      style={[
                        styles.actionButton,
                        styles.dangerButton,
                        interactionBusy && styles.disabledButton
                      ]}
                    >
                      <Text style={[styles.actionText, styles.dangerActionText]}>
                        Confirm Cancel
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Keep order ${order.productName || id}`}
                      accessibilityState={{ disabled: interactionBusy }}
                      disabled={interactionBusy}
                      onPress={() => setPendingCancelId("")}
                      style={[
                        styles.actionButton,
                        styles.secondaryButton,
                        interactionBusy && styles.disabledButton
                      ]}
                    >
                      <Text style={[styles.actionText, styles.secondaryActionText]}>
                        Keep Order
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Cancel order ${order.productName || id}`}
                    accessibilityState={{
                      disabled: interactionBusy || fulfillmentStatus === "canceled"
                    }}
                    disabled={interactionBusy || fulfillmentStatus === "canceled"}
                    onPress={() => requestCancel(order)}
                    style={[
                      styles.actionButton,
                      styles.dangerButton,
                      (interactionBusy || fulfillmentStatus === "canceled") &&
                        styles.disabledButton
                    ]}
                  >
                    <Text style={[styles.actionText, styles.dangerActionText]}>
                      Cancel
                    </Text>
                  </Pressable>
                )}
              </View>
            </AppCard>
          );
        })}
      </ScrollView>
    </AppPage>
  );
}
