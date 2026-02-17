import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.members)) return res.members;
  if (Array.isArray(res?.team)) return res.team;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.userId ?? x?.id ?? x?._id ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  return String(x?.name ?? x?.displayName ?? x?.email ?? "Member");
}

function pickSubtitle(x: AnyRec): string {
  const role = x?.role ?? x?.facilityRole ?? x?.memberRole;
  const email = x?.email;
  const parts = [role ? `Role: ${String(role)}` : "", email ? String(email) : ""].filter(
    Boolean
  );
  return parts.join(" • ");
}

export default function FacilityTeamTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();

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

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.teamMembers(facilityId), {
          method: "GET"
        });
        setItems(asArray(res));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, clearError, handleApiError]
  );

  const sendInvite = useCallback(async () => {
    if (!facilityId) return;

    const email = inviteEmail.trim();
    if (!email) return;

    setInviting(true);
    try {
      clearError();
      await apiRequest(endpoints.teamInvite(facilityId), {
        method: "POST",
        body: { email }
      });
      setInviteEmail("");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setInviting(false);
    }
  }, [facilityId, inviteEmail, clearError, handleApiError, load]);

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 member" : `${n} members`;
  }, [items.length]);

  return (
    <ScreenBoundary title="Team">
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Facility Team</Text>
          <Text style={styles.muted}>{header}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite member</Text>

          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="email@company.com"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Pressable
            onPress={sendInvite}
            disabled={inviting || !inviteEmail.trim()}
            style={({ pressed }) => [
              styles.btn,
              (inviting || !inviteEmail.trim()) && styles.btnDisabled,
              pressed && styles.pressed
            ]}
          >
            <Text style={styles.btnText}>{inviting ? "Sending…" : "Send invite"}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading team…</Text>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No members yet</Text>
                <Text style={styles.muted}>Invite your first team member above.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const title = pickTitle(item);
            const subtitle = pickSubtitle(item);

            return (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7 },

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
    marginBottom: 10
  },
  btn: {
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

  loading: { paddingVertical: 18, alignItems: "center" },
  list: { paddingVertical: 6 },

  row: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  rowTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  rowSub: { opacity: 0.7 },

  empty: { paddingVertical: 26, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 }
});
