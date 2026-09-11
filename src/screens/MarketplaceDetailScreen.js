import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  getMarketplaceContent,
  getPurchaseStatus,
  purchaseContent,
  reportMarketplacePaymentIssue,
  requestMarketplaceRefund
} from "../api/marketplace";
import {
  downloadMarketplaceContent,
  marketplaceDownloadUrl
} from "../api/marketplaceBuyer";
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMarketplaceDetailStyles(palette), [palette]);
  const initialContent = route?.params?.content || null;
  const id = useMemo(
    () => itemId(initialContent, route?.params?.id || route?.params?.contentId),
    [initialContent, route?.params?.contentId, route?.params?.id]
  );
  const [item, setItem] = useState(initialContent);
  const [loading, setLoading] = useState(!initialContent && !!id);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFeedback("");
    try {
      setItem(await getMarketplaceContent(id));
    } catch (error) {
      setFeedback(error?.message || "Unable to load storefront offer content.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshPurchaseStatus = useCallback(async () => {
    if (!id) return null;
    try {
      const status = await getPurchaseStatus(id);
      setPurchaseStatus(status);
      return status;
    } catch {
      setPurchaseStatus(null);
      return null;
    }
  }, [id]);

  useEffect(() => {
    void refreshPurchaseStatus();
  }, [refreshPurchaseStatus]);

  async function handlePurchase() {
    if (!id) {
      setFeedback("This storefront offer is missing an id.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const purchase = unwrapPurchase(await purchaseContent(id));
      if (purchase?.url) {
        await openAuthorizedExternalUrl(purchase.url);
        setFeedback("Checkout opened. Complete payment to unlock this item.");
      } else {
        setFeedback(purchase?.message || "Storefront offer added.");
      }
      await load();
      await refreshPurchaseStatus();
    } catch (error) {
      setFeedback(error?.message || "Unable to purchase this storefront offer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!id || downloading) return;
    setDownloading(true);
    setFeedback("Preparing a server-authorized download...");
    try {
      const url = marketplaceDownloadUrl(await downloadMarketplaceContent(id));
      if (!url) throw new Error("The backend did not return a download URL.");
      await openAuthorizedExternalUrl(url);
      setFeedback("The authorized download was opened.");
    } catch (error) {
      setFeedback(error?.message || "Unable to prepare this download.");
    } finally {
      setDownloading(false);
    }
  }

  const canDownload = Boolean(
    item?.canDownload ||
    item?.entitled ||
    item?.hasAccess ||
    item?.isPurchased ||
    purchaseStatus?.canDownload ||
    purchaseStatus?.entitled ||
    purchaseStatus?.hasAccess ||
    purchaseStatus?.isPurchased
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
            disabled={busy || loading}
            style={[styles.button, (busy || loading) && styles.buttonDisabled]}
            onPress={handlePurchase}
          >
            <Text style={styles.buttonText}>{busy ? "Purchasing..." : "Purchase"}</Text>
          </Pressable>
        )}
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

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
