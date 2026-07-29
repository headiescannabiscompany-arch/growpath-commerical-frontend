import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
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
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { can } from "@/facility/roleGates";
import { useFacility } from "@/state/useFacility";
import {
  inviteTeamMember,
  listTeamMembers,
  removeTeamMember,
  updateTeamMemberRole
} from "@/api/team";
import type { FacilityRole } from "@/api/team";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { getFacilityTaskAccess } from "@/features/facility/taskAccess";
import { radius } from "@/theme/theme";

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
  return parts.join(" - ");
}

export default function FacilityTeamTab() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const facilityRole = (ent.facilityRole as any) ?? null;
  const canInvite =
    Boolean(ent?.can?.(CAPABILITY_KEYS.TEAM_INVITE)) || can(facilityRole, "TEAM_INVITE");
  const isOwner = String(facilityRole || "").toUpperCase() === "OWNER";
  const canAssignTasks = getFacilityTaskAccess({
    can: ent?.can,
    facilityRole
  }).canAssignTask;

  const mapApiError = useApiErrorHandler();
  const mapApiErrorRef = useRef(mapApiError);
  mapApiErrorRef.current = mapApiError;
  const [error, setError] = useState<any>(null);

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<FacilityRole>("STAFF");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [busyMemberId, setBusyMemberId] = useState("");
  const [memberFeedback, setMemberFeedback] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        setError(null);
        const res = await listTeamMembers(facilityId);
        setItems(asArray(res));
      } catch (e) {
        setError(mapApiErrorRef.current.toInlineError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId]
  );

  const sendInvite = useCallback(async () => {
    if (!canInvite) return;
    if (!facilityId) return;

    const inviteEmailValue = inviteEmail.trim();
    if (!inviteEmailValue) return;

    setInviting(true);
    try {
      setError(null);
      const result: any = await inviteTeamMember(facilityId, {
        email: inviteEmailValue,
        role: inviteRole
      });
      setInviteFeedback(
        result?.emailDelivery?.sent
          ? `Invite emailed to ${inviteEmailValue} as ${inviteRole.toLowerCase()}.`
          : `Invite saved for ${inviteEmailValue}, but email delivery was not confirmed.`
      );
      setInviteEmail("");
      await load({ refresh: true });
    } catch (e) {
      setError(mapApiErrorRef.current.toInlineError(e));
    } finally {
      setInviting(false);
    }
  }, [canInvite, facilityId, inviteEmail, inviteRole, load]);

  const changeRole = useCallback(
    async (userId: string, role: "MANAGER" | "STAFF" | "VIEWER") => {
      if (!facilityId || !isOwner || !userId) return;
      setBusyMemberId(userId);
      try {
        setError(null);
        await updateTeamMemberRole(facilityId, userId, { role });
        await load({ refresh: true });
      } catch (e) {
        setError(mapApiErrorRef.current.toInlineError(e));
      } finally {
        setBusyMemberId("");
      }
    },
    [facilityId, isOwner, load]
  );

  const removeMember = useCallback(
    async (userId: string, label: string) => {
      if (!facilityId || !isOwner || !userId) return;
      setBusyMemberId(userId);
      try {
        setError(null);
        setMemberFeedback("");
        await removeTeamMember(facilityId, userId);
        await load({ refresh: true });
        setMemberFeedback(`${label} no longer has access to this facility.`);
      } catch (e) {
        setError(mapApiErrorRef.current.toInlineError(e));
      } finally {
        setBusyMemberId("");
      }
    },
    [facilityId, isOwner, load]
  );

  const confirmRemoveMember = useCallback(
    (userId: string, label: string) => {
      const message = `${label} will lose access to this facility. Their historical task and audit records remain.`;

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        typeof window.confirm === "function"
      ) {
        if (window.confirm(`Remove facility member?\n\n${message}`)) {
          void removeMember(userId, label);
        }
        return;
      }

      Alert.alert("Remove facility member?", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMember(userId, label)
        }
      ]);
    },
    [removeMember]
  );

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
    <ScreenBoundary title="Team" showBack backFallbackHref="/home/facility/dashboard">
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}
        {memberFeedback ? (
          <Text style={styles.feedback} accessibilityLiveRegion="polite">
            {memberFeedback}
          </Text>
        ) : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Facility Team</Text>
          <Text style={styles.muted}>{header}</Text>
        </View>

        {canInvite ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Invite member</Text>

            <TextInput
              accessibilityLabel="Invite team member email"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="email@company.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <View style={styles.roleRow}>
              {(["MANAGER", "STAFF", "VIEWER"] as FacilityRole[]).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setInviteRole(role)}
                  accessibilityRole="button"
                  accessibilityLabel={`Invite as ${role.toLowerCase()}`}
                  style={[styles.roleButton, inviteRole === role && styles.roleSelected]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      inviteRole === role && styles.roleTextSelected
                    ]}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send team invite"
              onPress={sendInvite}
              disabled={inviting || !inviteEmail.trim()}
              style={({ pressed }) => [
                styles.btn,
                (inviting || !inviteEmail.trim()) && styles.btnDisabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.btnText}>
                {inviting ? "Sending..." : "Send invite"}
              </Text>
            </Pressable>
            {inviteFeedback ? (
              <Text style={styles.feedback}>{inviteFeedback}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Team access</Text>
            <Text style={styles.muted}>
              {canAssignTasks
                ? "You can view the team and assign work. Only the facility owner can invite members or change access roles."
                : "You can view the team. Only owners and managers can assign work, and only the facility owner can manage access roles."}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading team...</Text>
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
                <Text style={styles.muted}>
                  {canInvite
                    ? "Invite your first team member above."
                    : "The facility owner can add members and assign access."}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const memberId = pickId(item);
            const title = pickTitle(item);
            const subtitle = pickSubtitle(item);
            const memberRole = String(item?.role || "").toUpperCase();
            const canManageMember = isOwner && memberRole !== "OWNER" && memberId;
            const memberEmail = String(item?.email || "").trim();
            const removalLabel = [
              title,
              memberEmail && memberEmail !== title ? memberEmail : "",
              memberRole ? memberRole.toLowerCase() : ""
            ]
              .filter(Boolean)
              .join(" - ");

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
                  <View style={styles.memberActions}>
                    {canAssignTasks && memberId ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Assign task to ${title}`}
                        onPress={() =>
                          router.push(
                            `/home/facility/tasks?assignee=${encodeURIComponent(memberId)}` as any
                          )
                        }
                        style={styles.smallButton}
                      >
                        <Text style={styles.smallButtonText}>Assign task</Text>
                      </Pressable>
                    ) : null}
                    {canManageMember
                      ? (["MANAGER", "STAFF", "VIEWER"] as const).map((role) => (
                          <Pressable
                            key={role}
                            accessibilityRole="button"
                            accessibilityLabel={`Change ${title} role to ${role.toLowerCase()}`}
                            disabled={busyMemberId === memberId || memberRole === role}
                            onPress={() => changeRole(memberId, role)}
                            style={[
                              styles.smallButton,
                              memberRole === role && styles.smallButtonSelected
                            ]}
                          >
                            <Text style={styles.smallButtonText}>
                              {role.charAt(0) + role.slice(1).toLowerCase()}
                            </Text>
                          </Pressable>
                        ))
                      : null}
                    {canManageMember ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${removalLabel} from facility`}
                        disabled={busyMemberId === memberId}
                        onPress={() =>
                          confirmRemoveMember(memberId, removalLabel || "This member")
                        }
                        style={[styles.smallButton, styles.removeButton]}
                      >
                        <Text style={styles.removeButtonText}>
                          {busyMemberId === memberId ? "Working..." : "Remove"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
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
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "white",
    marginBottom: 10
  },
  btn: {
    borderRadius: radius.card,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: "900" },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  roleButton: {
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  roleSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  roleText: { fontWeight: "800" },
  roleTextSelected: { color: "white" },
  feedback: { color: "#166534", fontWeight: "800", marginTop: 10 },

  pressed: { opacity: 0.85 },

  loading: { paddingVertical: 18, alignItems: "center" },
  list: { paddingVertical: 6 },

  row: {
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  rowTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  memberActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  smallButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  smallButtonSelected: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  smallButtonText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  removeButton: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  removeButtonText: { color: "#991B1B", fontSize: 12, fontWeight: "800" },

  empty: { paddingVertical: 26, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 }
});
