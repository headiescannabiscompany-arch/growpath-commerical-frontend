import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  browseMarketplace,
  getMarketplaceContent,
  purchaseContent,
  searchContent
} from "../api/marketplace";
import {
  downloadMarketplaceContent,
  getMarketplacePurchases,
  marketplaceBuyerState,
  marketplaceDownloadUrl,
  pollMarketplaceBuyerStatus
} from "../api/marketplaceBuyer";
import ScreenContainer from "../components/ScreenContainer";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";
import { getCreatorName } from "../utils/creator";
import {
  clearPendingBuyerCheckout,
  readPendingBuyerCheckout,
  rememberPendingBuyerCheckout
} from "../utils/buyerCheckoutRecovery";

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function hasMore(payload, count) {
  const data = payload?.data ?? payload ?? {};
  const pagination = data?.pagination || {};
  if (typeof data.hasMore === "boolean") return data.hasMore;
  if (typeof pagination.hasMore === "boolean") return pagination.hasMore;
  if (typeof pagination.hasNextPage === "boolean") return pagination.hasNextPage;
  if (Number(pagination.page) > 0 && Number(pagination.totalPages) > 0) {
    return Number(pagination.page) < Number(pagination.totalPages);
  }
  if (typeof data.nextPage === "number") return true;
  return count > 0;
}

function purchasedRows(payload) {
  const purchases = Array.isArray(payload?.purchases) ? payload.purchases : [];
  return purchases
    .filter((purchase) => purchase?.upload && typeof purchase.upload === "object")
    .map((purchase) => ({
      ...purchase.upload,
      accessStatus: "granted",
      canDownload: true,
      entitled: true,
      hasAccess: true,
      isPurchased: true,
      purchaseId: purchase.purchaseId,
      purchasedAt: purchase.purchasedAt
    }));
}

function rowId(row) {
  return String(row?._id || row?.id || row?.contentId || row?.uploadId || "");
}

function priceLabel(item) {
  const cents = Number(item?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(item?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "Free";
}

function firstParam(value) {
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim();
}

function normalizedCheckoutResult(value) {
  const result = firstParam(value).toLowerCase();
  if (["cancel", "canceled", "cancelled"].includes(result)) return "canceled";
  return result === "success" ? "success" : "";
}

export async function openMarketplaceCheckoutUrl(url) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

export default function MarketplaceScreen({ navigation, route } = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const checkoutResult = normalizedCheckoutResult(route?.params?.checkout);
  const returnedContentId = firstParam(
    route?.params?.contentId ||
      route?.params?.content ||
      route?.params?.marketplace ||
      route?.params?.itemId
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [showPurchased, setShowPurchased] = useState(false);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selected, setSelected] = useState(null);
  const [purchasingId, setPurchasingId] = useState("");
  const [pendingCheckoutId, setPendingCheckoutId] = useState(
    checkoutResult === "success" ? returnedContentId : ""
  );
  const [downloadingId, setDownloadingId] = useState("");
  const checkoutHandledRef = useRef("");
  const buyerStatusRef = useRef(new Map());
  const purchaseInFlightRef = useRef(new Set());

  const load = useCallback(
    async (nextPage = 1, opts = {}) => {
      if (opts.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        const response = showPurchased
          ? await getMarketplacePurchases(nextPage, 20)
          : query.trim()
            ? await searchContent(query.trim(), category || undefined)
            : await browseMarketplace(category || undefined, nextPage, 20);
        const nextRows = (showPurchased ? purchasedRows(response) : rows(response)).map(
          (item) => ({
            ...item,
            ...(buyerStatusRef.current.get(rowId(item)) || {})
          })
        );
        setItems((current) => (nextPage === 1 ? nextRows : [...current, ...nextRows]));
        setMore((showPurchased || !query.trim()) && hasMore(response, nextRows.length));
        setPage(nextPage);
      } catch (error) {
        setFeedback(error?.message || "Unable to load storefront offers.");
        if (nextPage === 1) setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, query, showPurchased]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const applyBuyerSnapshot = useCallback((snapshot) => {
    const content = snapshot?.content;
    if (!content || typeof content !== "object") return;
    const id = rowId(content);
    if (!id) return;
    buyerStatusRef.current.set(id, content);
    setSelected((current) =>
      rowId(current) === id ? { ...current, ...content } : content
    );
    setItems((current) =>
      current.map((item) => (rowId(item) === id ? { ...item, ...content } : item))
    );
  }, []);

  const reconcileMarketplaceCheckout = useCallback(
    async (id, options = {}) => {
      if (!id) return null;
      setPendingCheckoutId(id);
      setPurchasingId(id);
      if (!options.silent) {
        setFeedback("Checking server-confirmed purchase and download access...");
      }
      try {
        const result = await pollMarketplaceBuyerStatus(id, {
          shouldContinue: options.shouldContinue
        });
        if (result.snapshot?.content) {
          const detail = await getMarketplaceContent(id).catch(() => ({}));
          applyBuyerSnapshot({
            ...result.snapshot,
            content: { ...detail, ...result.snapshot.content, uploadId: id }
          });
        }
        if (result.state === "confirmed") {
          await clearPendingBuyerCheckout("marketplace", id).catch(() => false);
          setPendingCheckoutId("");
          setFeedback("Purchase confirmed by the server. Download access is available.");
        } else if (result.state === "terminal") {
          await clearPendingBuyerCheckout("marketplace", id).catch(() => false);
          setPendingCheckoutId("");
          setFeedback(
            "The server reports that this checkout did not grant download access."
          );
        } else {
          setFeedback(
            "Checkout returned, but the server has not confirmed download access yet. Another checkout is disabled while status is pending."
          );
        }
        return result;
      } finally {
        setPurchasingId("");
      }
    },
    [applyBuyerSnapshot]
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await readPendingBuyerCheckout("marketplace").catch(() => null);
      if (!active) return;
      const targetId = returnedContentId || stored?.itemId || "";
      const recoveryKey = `${checkoutResult || "pending"}:${targetId}`;
      if (!targetId || checkoutHandledRef.current === recoveryKey) return;
      checkoutHandledRef.current = recoveryKey;

      if (checkoutResult === "canceled") {
        await clearPendingBuyerCheckout("marketplace", targetId).catch(() => false);
        if (!active) return;
        setPendingCheckoutId("");
        setFeedback(
          "Checkout was canceled. No download access was inferred from the return link."
        );
        return;
      }

      if (stored?.itemId === targetId || checkoutResult === "success") {
        setPendingCheckoutId(targetId);
      }
      if (checkoutResult === "success" && stored?.itemId !== targetId) {
        await rememberPendingBuyerCheckout("marketplace", targetId, "/marketplace").catch(
          () => null
        );
      }
      await reconcileMarketplaceCheckout(targetId, {
        shouldContinue: () => active
      });
    })();
    return () => {
      active = false;
    };
  }, [checkoutResult, reconcileMarketplaceCheckout, returnedContentId]);

  async function openItem(item) {
    const id = rowId(item);
    if (navigation?.navigate) {
      navigation.navigate("MarketplaceDetail", { content: item, id });
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      const detail = id ? await getMarketplaceContent(id) : item;
      setSelected({
        ...detail,
        ...(buyerStatusRef.current.get(id) || {})
      });
    } catch (error) {
      setFeedback(error?.message || "Unable to load storefront offer detail.");
      setSelected(item);
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return (
      <ScreenContainer scroll>
        <Pressable onPress={() => setSelected(null)}>
          <Text style={styles.link}>Back to offers</Text>
        </Pressable>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        <MarketplaceDetailContent
          item={selected}
          checkoutPending={pendingCheckoutId === rowId(selected)}
          downloading={downloadingId === rowId(selected)}
          purchasing={purchasingId === rowId(selected)}
          onPurchase={async () => {
            const id = rowId(selected);
            if (!id || purchaseInFlightRef.current.has(id)) return;
            if (pendingCheckoutId === id) {
              await reconcileMarketplaceCheckout(id);
              return;
            }
            purchaseInFlightRef.current.add(id);
            setPurchasingId(id);
            setFeedback("");
            try {
              const response = await purchaseContent(id, {
                returnPath: "/marketplace"
              });
              const url = String(
                response?.url ||
                  response?.checkoutUrl ||
                  response?.data?.url ||
                  response?.data?.checkoutUrl ||
                  ""
              ).trim();
              if (url) {
                setPendingCheckoutId(id);
                await rememberPendingBuyerCheckout(
                  "marketplace",
                  id,
                  "/marketplace"
                ).catch(() => null);
                await openMarketplaceCheckoutUrl(url);
                setFeedback(
                  "Checkout opened. Download access remains locked until the server confirms payment."
                );
              } else {
                setPendingCheckoutId(id);
                await rememberPendingBuyerCheckout(
                  "marketplace",
                  id,
                  "/marketplace"
                ).catch(() => null);
                await reconcileMarketplaceCheckout(id);
              }
            } catch (error) {
              setFeedback(error?.message || "Unable to start checkout.");
            } finally {
              purchaseInFlightRef.current.delete(id);
              setPurchasingId("");
            }
          }}
          onDownload={async () => {
            const id = rowId(selected);
            if (!id || pendingCheckoutId === id || downloadingId) return;
            setDownloadingId(id);
            setFeedback("Preparing a server-authorized download...");
            try {
              const url = marketplaceDownloadUrl(await downloadMarketplaceContent(id));
              if (!url) {
                throw new Error("The backend did not return a download URL.");
              }
              await openMarketplaceCheckoutUrl(url);
              setFeedback(
                "The authorized download was opened. GrowPath cannot confirm that the file was saved."
              );
              const result = await pollMarketplaceBuyerStatus(id);
              if (result.snapshot) applyBuyerSnapshot(result.snapshot);
            } catch (error) {
              setFeedback(error?.message || "Unable to prepare this download.");
            } finally {
              setDownloadingId("");
            }
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.headerRow}>
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.header}>
            Storefront Offers
          </Text>
          <Text style={styles.subtitle}>
            {showPurchased
              ? "Your server-confirmed purchases. Downloads are authorized when opened."
              : "Browse storefront offers from compatibility offer endpoints."}
          </Text>
        </View>
      </View>

      <View style={styles.modeControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Browse storefront offers"
          accessibilityState={{ selected: !showPurchased }}
          onPress={() => setShowPurchased(false)}
          style={[styles.modeButton, !showPurchased && styles.modeButtonOn]}
        >
          <Text style={[styles.filterText, !showPurchased && styles.filterTextOn]}>
            Browse
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View purchased storefront offers"
          accessibilityState={{ selected: showPurchased }}
          onPress={() => {
            setCategory("");
            setQuery("");
            setShowPurchased(true);
          }}
          style={[styles.modeButton, showPurchased && styles.modeButtonOn]}
        >
          <Text style={[styles.filterText, showPurchased && styles.filterTextOn]}>
            Purchased
          </Text>
        </Pressable>
      </View>

      {!showPurchased ? (
        <TextInput
          accessibilityLabel="Search storefront offers"
          style={styles.search}
          placeholder="Search storefront offers..."
          placeholderTextColor={palette.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => load(1)}
        />
      ) : null}

      {!showPurchased ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
        >
          {["", "courses", "guides", "templates", "tools"].map((value) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: category === value }}
              key={value || "all"}
              style={[styles.filterBtn, category === value && styles.filterBtnOn]}
              onPress={() => setCategory(value)}
            >
              <Text
                style={[styles.filterText, category === value && styles.filterTextOn]}
              >
                {value ? value : "all"}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {loading && !refreshing ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.emptyText}>Loading storefront offers...</Text>
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text accessibilityRole="header" aria-level={2} style={styles.emptyText}>
            {showPurchased
              ? "No purchased storefront offers found."
              : "No storefront offers found."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => rowId(item) || `${idx}`}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openItem(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title || item.name || "Storefront offer"}
                </Text>
                <Text style={styles.price}>{priceLabel(item)}</Text>
              </View>
              <Text style={styles.creator}>
                By {getCreatorName(item.creator || item.author)}
              </Text>
              {item.category ? (
                <Text style={styles.category}>{item.category}</Text>
              ) : null}
              {item.description || item.summary ? (
                <Text style={styles.body} numberOfLines={2}>
                  {item.description || item.summary}
                </Text>
              ) : null}
              <Text style={styles.link}>Open details</Text>
            </Pressable>
          )}
          refreshControl={
            <RefreshControl
              colors={[palette.accent]}
              progressBackgroundColor={palette.surface}
              refreshing={refreshing}
              onRefresh={() => load(1, { refresh: true })}
              tintColor={palette.accent}
            />
          }
          onEndReached={() => {
            if (more && !loading && (showPurchased || !query.trim())) load(page + 1);
          }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenContainer>
  );
}

export function MarketplaceDetailContent({
  checkoutPending = false,
  downloading = false,
  item,
  onDownload,
  onPurchase,
  purchasing
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const paid = Number(item?.priceCents || 0) > 0 || Number(item?.price || 0) > 0;
  const entitlementState = marketplaceBuyerState(item);
  const entitled = entitlementState === "confirmed";
  const downloadDisabled = checkoutPending || downloading || (paid && !entitled);
  return (
    <View style={styles.detail}>
      <Text accessibilityRole="header" aria-level={1} style={styles.header}>
        {item?.title || item?.name || "Storefront offer"}
      </Text>
      <Text style={styles.creator}>
        By {getCreatorName(item?.creator || item?.author)}
      </Text>
      <Text style={styles.price}>{priceLabel(item)}</Text>
      {item?.category ? <Text style={styles.category}>{item.category}</Text> : null}
      {item?.description || item?.summary ? (
        <Text style={styles.detailBody}>{item.description || item.summary}</Text>
      ) : null}
      {item?.included || item?.contents ? (
        <Text style={styles.detailBody}>
          Included:{" "}
          {Array.isArray(item.included || item.contents)
            ? (item.included || item.contents).join(", ")
            : item.included || item.contents}
        </Text>
      ) : null}
      {onPurchase && !entitled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            paid ? "Start storefront offer checkout" : "Get storefront offer"
          }
          accessibilityState={{ disabled: Boolean(purchasing || checkoutPending) }}
          disabled={purchasing || checkoutPending}
          onPress={onPurchase}
          style={[
            styles.purchaseButton,
            (purchasing || checkoutPending) && styles.purchaseButtonDisabled
          ]}
        >
          {purchasing || checkoutPending ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.purchaseText}>
              {paid ? "Start Checkout" : "Get Item"}
            </Text>
          )}
        </Pressable>
      ) : null}
      {checkoutPending ? (
        <Text style={styles.meta}>
          Server confirmation is pending. Another checkout and paid download are disabled.
        </Text>
      ) : null}
      {onDownload ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download storefront offer"
          accessibilityState={{ disabled: downloadDisabled }}
          disabled={downloadDisabled}
          onPress={onDownload}
          style={[
            styles.downloadButton,
            downloadDisabled && styles.purchaseButtonDisabled
          ]}
        >
          {downloading ? (
            <ActivityIndicator color={palette.text} />
          ) : (
            <Text style={styles.downloadText}>
              {paid && !entitled ? "Download Locked" : "Download Item"}
            </Text>
          )}
        </Pressable>
      ) : null}
      {paid && !entitled ? (
        <Text style={styles.meta}>
          Paid downloads unlock only after the server confirms purchase access.
        </Text>
      ) : null}
      <Text style={styles.meta}>Status: {item?.status || "available"}</Text>
    </View>
  );
}

export function createStyles(palette) {
  return StyleSheet.create({
    headerRow: { marginBottom: 12 },
    header: { fontSize: 26, fontWeight: "800", color: palette.text },
    subtitle: { color: palette.textMuted, marginTop: 4 },
    search: {
      padding: 12,
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      marginBottom: 12,
      fontSize: 14,
      borderWidth: 1,
      borderColor: palette.border,
      color: palette.text
    },
    filters: { marginBottom: 12 },
    modeControls: { flexDirection: "row", gap: 8, marginBottom: 12 },
    modeButton: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8
    },
    modeButtonOn: { backgroundColor: palette.accent, borderColor: palette.accent },
    filterBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.pill,
      marginRight: 10
    },
    filterBtnOn: { backgroundColor: palette.accent, borderColor: palette.accent },
    filterText: { color: palette.textSoft, fontWeight: "700" },
    filterTextOn: { color: palette.accentText },
    listContent: { paddingBottom: 80 },
    card: {
      padding: 14,
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: palette.border
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
    title: { flex: 1, fontSize: 16, fontWeight: "800", color: palette.text },
    creator: { fontSize: 12, color: palette.textMuted, marginTop: 6 },
    category: {
      alignSelf: "flex-start",
      fontSize: 11,
      backgroundColor: palette.accentSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
      color: palette.accent,
      fontWeight: "700",
      marginTop: 6
    },
    body: { color: palette.textSoft, lineHeight: 19, marginTop: 8 },
    price: { fontWeight: "800", color: palette.accent },
    link: { color: palette.link, fontWeight: "800", marginTop: 10 },
    meta: { color: palette.textMuted, marginTop: 10 },
    feedback: {
      color: palette.textSoft,
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 8,
      marginBottom: 10
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 200,
      gap: 8
    },
    emptyText: { fontSize: 16, color: palette.textMuted, fontWeight: "700" },
    detail: { gap: 8 },
    detailBody: { color: palette.textSoft, lineHeight: 21, marginTop: 8 },
    purchaseButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      marginTop: 12,
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    purchaseButtonDisabled: { opacity: 0.6 },
    purchaseText: { color: palette.accentText, fontWeight: "900" },
    downloadButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    downloadText: { color: palette.text, fontWeight: "900" }
  });
}
