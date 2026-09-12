import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  getMarketplaceContent,
  getPurchaseStatus,
  purchaseContent,
  reportMarketplacePaymentIssue,
  requestMarketplaceRefund
} from "../api/marketplace";
import { useAuth } from "../auth/AuthContext";
import { downloadAndSaveMarketplaceContent } from "../utils/marketplaceDownload";
import BuyerPaymentReviewCard from "../components/commerce/BuyerPaymentReviewCard";
import ScreenContainer from "../components/ScreenContainer";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";
import { openAuthorizedExternalUrl } from "../utils/openAuthorizedExternalUrl";
import { MarketplaceDetailContent } from "./MarketplaceScreen";

function itemId(item, fallback) {
  return String(item?._id || item?.id || item?.contentId || fallback || "");
}

function unwrapPurchase(response) {
  return response?.purchase || response?.data?.purchase || response?.data || response;
}

export default function MarketplaceDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const id = itemId(
    route?.params?.content,
    route?.params?.id || route?.params?.contentId
  );
  return (
    <MarketplaceDetailSession
      key={`${user?._id || user?.id || "anonymous"}:${id}`}
      route={route}
      navigation={navigation}
    />
  );
}

function MarketplaceDetailSession({ route, navigation }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMarketplaceDetailStyles(palette), [palette]);
  const initialContent = route?.params?.content || null;
  const id = useMemo(
    () => itemId(initialContent, route?.params?.id || route?.params?.contentId),
    [initialContent, route?.params?.contentId, route?.params?.id]
  );
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  const active = useRef(true);
  const action = useRef(false);
  const controller = useRef(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFeedback("");
    try {
      const loaded = await getMarketplaceContent(id);
      if (!active.current) return;
      if (!loaded || itemId(loaded) !== id)
        throw new Error("Storefront offer not found.");
      setItem(loaded);
    } catch (error) {
      if (!active.current) return;
      setItem(null);
      setFeedback(error?.message || "Unable to load storefront offer content.");
    } finally {
      if (active.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshPurchaseStatus = useCallback(async () => {
    if (!id) return null;
    try {
      const status = await getPurchaseStatus(id);
      if (!active.current) return null;
      setPurchaseStatus(status);
      return status;
    } catch {
      if (active.current) setPurchaseStatus(null);
      return null;
    }
  }, [id]);

  useEffect(() => {
    void refreshPurchaseStatus();
  }, [refreshPurchaseStatus]);

  async function handlePurchase() {
    if (!canPurchase || action.current || !active.current) return;
    action.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const purchase = unwrapPurchase(await purchaseContent(id));
      if (!active.current) return;
      if (purchase?.url) {
        await openAuthorizedExternalUrl(purchase.url);
        setFeedback("Checkout opened. Complete payment to unlock this item.");
      } else {
        setFeedback(purchase?.message || "Storefront offer added.");
      }
      await load();
      await refreshPurchaseStatus();
    } catch (error) {
      if (active.current)
        setFeedback(error?.message || "Unable to purchase this storefront offer.");
    } finally {
      action.current = false;
      if (active.current) setBusy(false);
    }
  }

  async function handleDownload() {
    if (!id || !canDownload || loading || action.current || !active.current) return;
    action.current = true;
    const request = new AbortController();
    controller.current = request;
    setDownloading(true);
    setFeedback("Preparing a server-authorized download...");
    try {
      await downloadAndSaveMarketplaceContent(id, {
        signal: request.signal,
        allowLegacyExternal: item?.price === 0
      });
      if (active.current) setFeedback("The authorized download was opened.");
    } catch (error) {
      if (active.current)
        setFeedback(error?.message || "Unable to prepare this download.");
    } finally {
      action.current = false;
      if (active.current) setDownloading(false);
    }
  }

  const canDownload = Boolean(item && purchaseStatus?.canDownload);
  const deliveryUnavailable = Boolean(
    item &&
    (Number(item.price) > 0 || Number(item.priceCents) > 0) &&
    item.deliveryReady !== true
  );
  const canPurchase = Boolean(
    item &&
    itemId(item) === id &&
    !loading &&
    !busy &&
    !downloading &&
    item.isPublished !== false &&
    !deliveryUnavailable &&
    !canDownload
  );

  return (
    <ScreenContainer scroll>
      <View style={styles.actions}>
        {navigation?.goBack ? (
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Back to offers</Text>
          </Pressable>
        ) : null}
        {canDownload ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Download storefront offer"
            disabled={downloading || loading}
            style={[styles.button, (downloading || loading) && styles.buttonDisabled]}
            onPress={handleDownload}
          >
            <Text style={styles.buttonText}>
              {downloading ? "Preparing..." : "Download"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start storefront offer checkout"
            disabled={!canPurchase}
            style={[styles.button, !canPurchase && styles.buttonDisabled]}
            onPress={handlePurchase}
          >
            <Text style={styles.buttonText}>{busy ? "Purchasing..." : "Purchase"}</Text>
          </Pressable>
        )}
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      {deliveryUnavailable ? (
        <Text style={styles.feedback}>
          Protected delivery is not ready. The seller must upload a protected offer file
          before new purchases.
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator />
          <Text style={styles.emptyText}>Loading storefront offer detail...</Text>
        </View>
      ) : item ? (
        <>
          <MarketplaceDetailContent item={{ ...item, ...(purchaseStatus || {}) }} />
          <BuyerPaymentReviewCard
            status={purchaseStatus}
            onRequestRefund={(input) => requestMarketplaceRefund(id, input)}
            onReportPaymentIssue={(input) => reportMarketplacePaymentIssue(id, input)}
            onRefresh={refreshPurchaseStatus}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Storefront offer not found.</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

export const createMarketplaceDetailStyles = (palette) =>
  StyleSheet.create({
    actions: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12
    },
    link: { color: palette.link, fontWeight: "800" },
    button: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 16,
      paddingVertical: 10
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: palette.accentText, fontWeight: "800" },
    feedback: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      color: palette.textSoft,
      marginBottom: 10,
      padding: 8
    },
    emptyState: {
      alignItems: "center",
      gap: 8,
      justifyContent: "center",
      minHeight: 200
    },
    emptyText: { color: palette.textMuted, fontSize: 16, fontWeight: "700" }
  });
