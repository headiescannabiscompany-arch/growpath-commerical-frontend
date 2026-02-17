import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function renderKV(obj: AnyRec | null, key: string) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;
  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v}>{typeof v === "string" ? v : JSON.stringify(v)}</Text>
    </View>
  );
}

export default function InventoryItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; itemId?: string }>();
  const { selectedId: facilityId } = useFacility();

  const itemId = String(params?.id ?? params?.itemId ?? "");

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;

  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );

  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;
      if (!itemId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.inventoryItem(facilityId, itemId));
        setItem(res ?? null);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, itemId, clearError, handleApiError]
  );

  const adjust = useCallback(async () => {
    if (!facilityId || !itemId) return;

    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) return;

    setSaving(true);
    try {
      clearError();
      await apiRequest(endpoints.inventoryAdjust(facilityId, itemId), {
        method: "POST",
        body: { delta: n, reason: reason.trim() || undefined }
      });
      setDelta("");
      setReason("");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }, [facilityId, itemId, delta, reason, clearError, handleApiError, load]);

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!itemId) return;
    load();
  }, [facilityId, itemId, load, router]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);

  return (
    <ScreenBoundary title="Inventory Item">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <Text style={styles.h1}>Inventory Item</Text>
        <Text style={styles.muted}>id: {itemId || "(missing id param)"}</Text>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading item…</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adjust quantity</Text>
          <Text style={styles.muted}>
            Use negative for decrement, positive for increment.
          </Text>

          <TextInput
            value={delta}
            onChangeText={setDelta}
            placeholder="e.g. 10 or -2"
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (optional)"
            style={styles.input}
          />

          <Pressable
            onPress={adjust}
            disabled={saving}
            style={({ pressed }) => [
              styles.btn,
              saving && styles.btnDisabled,
              pressed && styles.pressed
            ]}
          >
            <Text style={styles.btnText}>{saving ? "Saving…" : "Save adjustment"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          {item ? (
            <View style={{ marginTop: 8 }}>{keys.map((k) => renderKV(item, k))}</View>
          ) : (
            <Text style={styles.muted}>No item payload returned.</Text>
          )}
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7, marginBottom: 12 },

  loading: { paddingVertical: 18, alignItems: "center" },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },

  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    marginTop: 10
  },

  btn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: "900" },
  pressed: { opacity: 0.85 },

  kv: { marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7, marginBottom: 3 },
  v: { fontSize: 14 }
});
