import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  getMarketplacePurchases,
  type MarketplacePurchase
} from "@/api/marketplaceBuyer";
import ScreenContainer from "@/components/ScreenContainer";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { downloadAndSaveMarketplaceContent } from "@/utils/marketplaceDownload";
import { useAuth } from "@/auth/AuthContext";

const PAGE_SIZE = 20;

function uploadId(purchase: MarketplacePurchase) {
  const upload = purchase.upload || {};
  return String(upload._id || upload.id || upload.contentId || "");
}

function purchaseTitle(purchase: MarketplacePurchase) {
  const upload = purchase.upload || {};
  return String(upload.title || upload.name || "Storefront offer");
}

function hasNextPage(
  pagination: Record<string, unknown> | null,
  page: number,
  count: number
) {
  const pages = Number(pagination?.pages || 0);
  if (pages > 0) return page < pages;
  return count >= PAGE_SIZE;
}

export default function MarketplacePurchasedLibrary({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  return (
    <MarketplacePurchasedSession
      key={String(user?._id || user?.id || "anonymous")}
      onBack={onBack}
    />
  );
}

function MarketplacePurchasedSession({ onBack }: { onBack: () => void }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [purchases, setPurchases] = useState<MarketplacePurchase[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [feedback, setFeedback] = useState("");
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const action = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);

  const load = useCallback(async (nextPage = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setFeedback("");
    try {
      const response = await getMarketplacePurchases(nextPage, PAGE_SIZE);
      if (!active.current) return;
      setPurchases((current) =>
        nextPage === 1 ? response.purchases : [...current, ...response.purchases]
      );
      setMore(hasNextPage(response.pagination, nextPage, response.purchases.length));
      setPage(nextPage);
    } catch (error) {
      if (!active.current) return;
      if (nextPage === 1) setPurchases([]);
      setFeedback(
        error instanceof Error ? error.message : "Unable to load purchased offers."
      );
    } finally {
      if (active.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function download(purchase: MarketplacePurchase) {
    const id = uploadId(purchase);
    if (!id || action.current || !active.current) return;
    action.current = true;
    const request = new AbortController();
    controller.current = request;
    setDownloadingId(id);
    setFeedback("Preparing a server-authorized download...");
    try {
      await downloadAndSaveMarketplaceContent(id, {
        signal: request.signal,
        allowLegacyExternal: purchase.upload?.price === 0
      });
      if (active.current) setFeedback("The authorized download was opened.");
    } catch (error) {
      if (active.current)
        setFeedback(
          error instanceof Error ? error.message : "Unable to prepare download."
        );
    } finally {
      action.current = false;
      if (active.current) setDownloadingId("");
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to storefront offers"
        onPress={onBack}
        style={styles.backButton}
      >
        <Text style={styles.backText}>Back to offers</Text>
      </Pressable>
      <Text accessibilityRole="header" aria-level={1} style={styles.header}>
        Purchased Storefront Offers
      </Text>
      <Text style={styles.subtitle}>
        Confirmed purchases stay in this library. Each download is authorized by the
        server when you open it.
      </Text>
      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      {loading && !refreshing ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>Loading purchased offers...</Text>
        </View>
      ) : null}
      {!loading && purchases.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No purchased storefront offers found.</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={purchases}
          keyExtractor={(purchase) => purchase.purchaseId}
          onEndReached={() => {
            if (more && !loading) void load(page + 1);
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              colors={[palette.accent]}
              progressBackgroundColor={palette.surface}
              refreshing={refreshing}
              onRefresh={() => void load(1, true)}
              tintColor={palette.accent}
            />
          }
          renderItem={({ item }) => {
            const id = uploadId(item);
            const downloading = downloadingId === id;
            return (
              <View style={styles.card}>
                <Text accessibilityRole="header" aria-level={2} style={styles.title}>
                  {purchaseTitle(item)}
                </Text>
                {item.purchasedAt ? (
                  <Text style={styles.meta}>
                    Purchased {new Date(item.purchasedAt).toLocaleDateString()}
                  </Text>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Download ${purchaseTitle(item)}`}
                  disabled={!id || Boolean(downloadingId)}
                  onPress={() => void download(item)}
                  style={[styles.downloadButton, (!id || downloading) && styles.disabled]}
                >
                  <Text style={styles.downloadText}>
                    {downloading ? "Preparing..." : "Download"}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    backButton: { alignSelf: "flex-start", paddingVertical: 8 },
    backText: { color: palette.link, fontWeight: "800" },
    header: { color: palette.text, fontSize: 26, fontWeight: "800" },
    subtitle: {
      color: palette.textMuted,
      lineHeight: 20,
      marginBottom: 12,
      marginTop: 4
    },
    feedback: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.textSoft,
      marginBottom: 10,
      padding: 8
    },
    list: { paddingBottom: 80 },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginBottom: 12,
      padding: 14
    },
    title: { color: palette.text, fontSize: 16, fontWeight: "800" },
    meta: { color: palette.textMuted, marginTop: 6 },
    downloadButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    downloadText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.6 },
    emptyState: {
      alignItems: "center",
      gap: 8,
      justifyContent: "center",
      minHeight: 200
    },
    emptyTitle: { color: palette.textMuted, fontSize: 16, fontWeight: "700" }
  });
}
