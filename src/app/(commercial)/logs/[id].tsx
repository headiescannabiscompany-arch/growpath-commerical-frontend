import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { sourceObjectHref } from "@/utils/sourceLinks";

type AnyRec = Record<string, any>;

function getId(params: Record<string, any>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function renderKV(
  obj: AnyRec | null,
  key: string,
  styles: ReturnType<typeof createCommercialLogDetailStyles>
) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;

  return (
    <View key={key} style={styles.kv}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v} selectable>
        {typeof v === "string" ? v : JSON.stringify(v)}
      </Text>
    </View>
  );
}

export default function CommercialLogDetailRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialLogDetailStyles(palette), [palette]);
  const params = useLocalSearchParams();
  const id = getId(params as any);

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError();

        const res = await apiRequest(endpoints.logGlobal(id), { method: "GET" });
        setItem(res?.log ?? res?.item ?? res ?? null);
      } catch (e) {
        resolved.handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, resolved]
  );

  useEffect(() => {
    load();
  }, [load]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);
  const sourcePath = useMemo(
    () => (item ? sourceObjectHref({ ...item, workspaceType: "commercial" }) : ""),
    [item]
  );

  return (
    <ScreenBoundary title="Log" showBack backFallbackHref="/home/commercial">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
            refreshing={refreshing}
            tintColor={palette.accent}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Log</Text>
          <Text style={styles.muted}>id: {id || "(missing)"}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading log...</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {item ? (
            <View style={styles.kvWrap}>
              {sourcePath ? (
                <Link href={sourcePath as any} asChild>
                  <Text
                    accessibilityLabel="View commercial log source"
                    style={styles.link}
                  >
                    View source
                  </Text>
                </Link>
              ) : null}
              {keys.map((k) => renderKV(item, k, styles))}
            </View>
          ) : (
            <Text style={styles.muted}>
              {id ? "No log returned." : "Missing log id."}
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createCommercialLogDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    scroll: { backgroundColor: palette.page },
    container: { backgroundColor: palette.page, padding: 16, gap: 12 },
    headerRow: { gap: 4 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900" },
    muted: { color: palette.textMuted },
    loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.card
    },
    kvWrap: { marginTop: 6 },
    kv: { gap: 4, marginBottom: 10 },
    k: { color: palette.textMuted, fontSize: 12 },
    v: { color: palette.text, fontSize: 14 },
    link: { color: palette.link, fontWeight: "800", marginBottom: 12 }
  });
}
