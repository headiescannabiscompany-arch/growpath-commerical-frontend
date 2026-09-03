import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { getMarketplaceContent, purchaseContent } from "../api/marketplace";
import {
  downloadMarketplaceContent,
  marketplaceDownloadUrl,
  pollMarketplaceBuyerStatus
} from "../api/marketplaceBuyer";
import ScreenContainer from "../components/ScreenContainer";
import { radius } from "../theme/theme";
import {
  clearPendingBuyerCheckout,
  readPendingBuyerCheckout,
  rememberPendingBuyerCheckout
} from "../utils/buyerCheckoutRecovery";
import {
  MarketplaceDetailContent,
  openMarketplaceCheckoutUrl
} from "./MarketplaceScreen";

function itemId(item, fallback) {
  return String(
    item?._id || item?.id || item?.contentId || item?.uploadId || fallback || ""
  );
}

function unwrapPurchase(response) {
  return response?.purchase || response?.data?.purchase || response?.data || response;
}

function checkoutResult(value) {
  const normalized = String(Array.isArray(value) ? value[0] || "" : value || "")
    .trim()
    .toLowerCase();
  if (["cancel", "canceled", "cancelled"].includes(normalized)) return "canceled";
  return normalized === "success" ? "success" : "";
}

export default function MarketplaceDetailScreen({ route, navigation }) {
  const initialContent = route?.params?.content || null;
  const id = useMemo(
    () => itemId(initialContent, route?.params?.id || route?.params?.contentId),
    [initialContent, route?.params?.contentId, route?.params?.id]
  );
  const [item, setItem] = useState(initialContent);
  const returnedCheckoutResult = checkoutResult(route?.params?.checkout);
  const [loading, setLoading] = useState(!initialContent && !!id);
  const [busy, setBusy] = useState(false);
  const [checkoutPending, setCheckoutPending] = useState(
    returnedCheckoutResult === "success"
  );
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const checkoutHandledRef = useRef("");
  const purchaseInFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFeedback("");
    try {
      const detail = await getMarketplaceContent(id);
      setItem((current) => ({ ...current, ...detail }));
    } catch (error) {
      setFeedback(error?.message || "Unable to load storefront offer content.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const reconcileCheckout = useCallback(async () => {
    if (!id) return null;
    setBusy(true);
    setCheckoutPending(true);
    setFeedback("Checking server-confirmed purchase and download access...");
    try {
      const result = await pollMarketplaceBuyerStatus(id, {
        onSnapshot: (snapshot) => {
          if (snapshot?.content) {
            setItem((current) => ({ ...current, ...snapshot.content }));
          }
        }
      });
      if (result.state === "confirmed") {
        await clearPendingBuyerCheckout("marketplace", id).catch(() => false);
        setCheckoutPending(false);
        setFeedback("Purchase confirmed by the server. Download access is available.");
      } else if (result.state === "terminal") {
        await clearPendingBuyerCheckout("marketplace", id).catch(() => false);
        setCheckoutPending(false);
        setFeedback(
          "The server reports that this checkout did not grant download access."
        );
      } else {
        setFeedback(
          "The server has not confirmed download access yet. Another checkout is disabled while status is pending."
        );
      }
      return result;
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!id) return;
      const stored = await readPendingBuyerCheckout("marketplace").catch(() => null);
      if (!active) return;
      const recoveryKey = `${returnedCheckoutResult || "pending"}:${id}`;
      if (checkoutHandledRef.current === recoveryKey) return;
      if (returnedCheckoutResult === "canceled") {
        checkoutHandledRef.current = recoveryKey;
        await clearPendingBuyerCheckout("marketplace", id).catch(() => false);
        if (!active) return;
        setCheckoutPending(false);
        setFeedback(
          "Checkout was canceled. No download access was inferred from the return link."
        );
        return;
      }
      if (returnedCheckoutResult !== "success" && stored?.itemId !== id) return;
      checkoutHandledRef.current = recoveryKey;
      setCheckoutPending(true);
      if (returnedCheckoutResult === "success" && stored?.itemId !== id) {
        await rememberPendingBuyerCheckout("marketplace", id).catch(() => null);
      }
      if (active) await reconcileCheckout();
    })();
    return () => {
      active = false;
    };
  }, [id, reconcileCheckout, returnedCheckoutResult]);

  async function handlePurchase() {
    if (purchaseInFlightRef.current) return;
    if (!id) {
      setFeedback("This storefront offer is missing an id.");
      return;
    }
    if (checkoutPending) {
      await reconcileCheckout();
      return;
    }
    purchaseInFlightRef.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const purchase = unwrapPurchase(
        await purchaseContent(id, { returnPath: "/marketplace" })
      );
      const url = String(purchase?.url || purchase?.checkoutUrl || "").trim();
      if (url) {
        setCheckoutPending(true);
        await rememberPendingBuyerCheckout("marketplace", id, "/marketplace").catch(
          () => null
        );
        await openMarketplaceCheckoutUrl(url);
        setFeedback(
          "Checkout opened. Download access remains locked until the server confirms payment."
        );
      } else {
        setCheckoutPending(true);
        await rememberPendingBuyerCheckout("marketplace", id, "/marketplace").catch(
          () => null
        );
        await reconcileCheckout();
      }
    } catch (error) {
      setFeedback(error?.message || "Unable to purchase this storefront offer.");
    } finally {
      purchaseInFlightRef.current = false;
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!id || downloading || checkoutPending) return;
    setDownloading(true);
    setFeedback("Preparing a server-authorized download...");
    try {
      const url = marketplaceDownloadUrl(await downloadMarketplaceContent(id));
      if (!url) throw new Error("The backend did not return a download URL.");
      await openMarketplaceCheckoutUrl(url);
      setFeedback(
        "The authorized download was opened. GrowPath cannot confirm that the file was saved."
      );
    } catch (error) {
      setFeedback(error?.message || "Unable to prepare this download.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.actions}>
        {navigation?.goBack ? (
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Back to offers</Text>
          </Pressable>
        ) : null}
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator />
          <Text style={styles.emptyText}>Loading storefront offer detail...</Text>
        </View>
      ) : item ? (
        <MarketplaceDetailContent
          checkoutPending={checkoutPending}
          downloading={downloading}
          item={item}
          onDownload={handleDownload}
          onPurchase={handlePurchase}
          purchasing={busy}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Storefront offer not found.</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  link: { color: "#166534", fontWeight: "800" },
  feedback: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.card,
    color: "#334155",
    marginBottom: 10,
    padding: 8
  },
  emptyState: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 200 },
  emptyText: { color: "#64748B", fontSize: 16, fontWeight: "700" }
});
