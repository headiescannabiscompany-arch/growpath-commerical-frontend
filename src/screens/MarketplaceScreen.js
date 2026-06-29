import React, { useCallback, useEffect, useState } from "react";
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
        setFeedback(error?.message || "Unable to load marketplace.");
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
      setFeedback(error?.message || "Unable to load marketplace detail.");
      setSelected(item);
    } finally {
      setLoading(false);
    }
  }

  if (selected) {
    return (
      <ScreenContainer scroll>
        <Pressable onPress={() => setSelected(null)}>
          <Text style={styles.link}>Back to marketplace</Text>
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
          <Text style={styles.header}>Marketplace</Text>
          <Text style={styles.subtitle}>
            Browse creator content from marketplace endpoints.
          </Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search marketplace..."
        placeholderTextColor="#999"
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
          <ActivityIndicator />
          <Text style={styles.emptyText}>Loading marketplace...</Text>
        </View>
      ) : null}

      {!loading && items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No marketplace content found.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => rowId(item) || `${idx}`}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openItem(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title || item.name || "Marketplace item"}
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
  const paid = Number(item?.priceCents || 0) > 0 || Number(item?.price || 0) > 0;
  return (
    <View style={styles.detail}>
      <Text style={styles.header}>{item?.title || item?.name || "Marketplace item"}</Text>
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
            paid ? "Start marketplace checkout" : "Get marketplace item"
          }
          disabled={purchasing}
          onPress={onPurchase}
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
        >
          {purchasing ? (
            <ActivityIndicator color="#FFFFFF" />
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

const styles = StyleSheet.create({
  headerRow: { marginBottom: 12 },
  header: { fontSize: 26, fontWeight: "800", color: "#111827" },
  subtitle: { color: "#64748B", marginTop: 4 },
  search: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  filters: { marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    marginRight: 10
  },
  filterBtnOn: { backgroundColor: "#166534" },
  filterText: { color: "#334155", fontWeight: "700" },
  filterTextOn: { color: "#FFFFFF" },
  listContent: { paddingBottom: 80 },
  card: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: "#111827" },
  creator: { fontSize: 12, color: "#64748B", marginTop: 6 },
  category: {
    alignSelf: "flex-start",
    fontSize: 11,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: "#166534",
    fontWeight: "700",
    marginTop: 6
  },
  body: { color: "#475569", lineHeight: 19, marginTop: 8 },
  price: { fontWeight: "800", color: "#166534" },
  link: { color: "#166534", fontWeight: "800", marginTop: 10 },
  meta: { color: "#64748B", marginTop: 10 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10
  },
  emptyState: { alignItems: "center", justifyContent: "center", minHeight: 200, gap: 8 },
  emptyText: { fontSize: 16, color: "#64748B", fontWeight: "700" },
  detail: { gap: 8 },
  detailBody: { color: "#334155", lineHeight: 21, marginTop: 8 },
  purchaseButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  purchaseButtonDisabled: { opacity: 0.6 },
  purchaseText: { color: "#FFFFFF", fontWeight: "900" }
});
