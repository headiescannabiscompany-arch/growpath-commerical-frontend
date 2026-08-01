import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import ScreenContainer from "../components/ScreenContainer";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";
import { getCreatorName } from "../utils/creator";

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
  if (typeof data.hasMore === "boolean") return data.hasMore;
  if (typeof data.nextPage === "number") return true;
  return count > 0;
}

function rowId(row) {
  return String(row?._id || row?.id || row?.contentId || "");
}

function priceLabel(item) {
  const cents = Number(item?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(item?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "Free";
}

export default function MarketplaceScreen({ navigation }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selected, setSelected] = useState(null);
  const [purchasingId, setPurchasingId] = useState("");

  const load = useCallback(
    async (nextPage = 1, opts = {}) => {
      if (opts.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        const response = query.trim()
          ? await searchContent(query.trim(), category || undefined)
          : await browseMarketplace(category || undefined, nextPage, 20);
        const nextRows = rows(response);
        setItems((current) => (nextPage === 1 ? nextRows : [...current, ...nextRows]));
        setMore(!query.trim() && hasMore(response, nextRows.length));
        setPage(nextPage);
      } catch (error) {
        setFeedback(error?.message || "Unable to load storefront offers.");
        if (nextPage === 1) setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, query]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  async function openItem(item) {
    const id = rowId(item);
    if (navigation?.navigate) {
      navigation.navigate("MarketplaceDetail", { content: item, id });
      return;
    }
    setLoading(true);
    setFeedback("");
    try {
      setSelected(id ? await getMarketplaceContent(id) : item);
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
          purchasing={purchasingId === rowId(selected)}
          onPurchase={async () => {
            const id = rowId(selected);
            if (!id) return;
            setPurchasingId(id);
            setFeedback("");
            try {
              const response = await purchaseContent(id);
              if (response?.url) {
                setFeedback("Checkout created.");
                if (typeof window !== "undefined" && window.location) {
                  window.location.href = response.url;
                } else {
                  setFeedback("Checkout created.");
                }
              } else {
                setSelected((current) => ({
                  ...current,
                  downloads: response?.downloads ?? current?.downloads,
                  sales: response?.sales ?? current?.sales,
                  revenue: response?.revenue ?? current?.revenue
                }));
                setFeedback("Added to your library.");
              }
            } catch (error) {
              setFeedback(error?.message || "Unable to start checkout.");
            } finally {
              setPurchasingId("");
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
            Browse storefront offers from compatibility offer endpoints.
          </Text>
        </View>
      </View>

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
            <Text style={[styles.filterText, category === value && styles.filterTextOn]}>
              {value ? value : "all"}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

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
            No storefront offers found.
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
              refreshing={refreshing}
              onRefresh={() => load(1, { refresh: true })}
            />
          }
          onEndReached={() => {
            if (more && !loading && !query.trim()) load(page + 1);
          }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenContainer>
  );
}

export function MarketplaceDetailContent({ item, onPurchase, purchasing }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const paid = Number(item?.priceCents || 0) > 0 || Number(item?.price || 0) > 0;
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
      {onPurchase ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            paid ? "Start storefront offer checkout" : "Get storefront offer"
          }
          disabled={purchasing}
          onPress={onPurchase}
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
        >
          {purchasing ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.purchaseText}>
              {paid ? "Start Checkout" : "Get Item"}
            </Text>
          )}
        </Pressable>
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
    purchaseText: { color: palette.accentText, fontWeight: "900" }
  });
}
