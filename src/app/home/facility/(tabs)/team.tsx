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
import {
  useFacilityRecordRead,
  useFacilityRecordScope
} from "@/features/facility/useFacilityRecordRead";
import { getFacilityTaskAccess } from "@/features/facility/taskAccess";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

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
  const ent = useEntitlements();
  const scope = useFacilityRecordScope([
    "team",
    ent?.can?.(CAPABILITY_KEYS.TEAM_INVITE),
    ent?.can?.("TASKS_WRITE")
  ]);
  return <FacilityTeamContent key={scope} />;
}

function FacilityTeamContent() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
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

  const {
    mounted,
    error,
    clearError,
    handleApiError,
    hasLoaded,
    setHasLoaded,
    readFailed,
    setReadFailed
  } = useFacilityRecordRead();

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<FacilityRole>("STAFF");
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [busyMemberId, setBusyMemberId] = useState("");
  const [memberFeedback, setMemberFeedback] = useState("");
  const loadInFlightRef = useRef(false);
  const inviteInFlightRef = useRef(false);
  const busyMembersRef = useRef(new Set<string>());
  const actionInFlightRef = useRef(false);
  const readVersionRef = useRef(0);
  const busy = loading || refreshing || inviting || Boolean(busyMemberId);
  const canAct = hasLoaded && !readFailed && !busy;

  const load = useCallback(
    async (opts?: { refresh?: boolean; afterMutation?: boolean }) => {
      if (
        !mounted.current ||
        !facilityId ||
        loadInFlightRef.current ||
        (actionInFlightRef.current && !opts?.afterMutation)
      )
        return;
      loadInFlightRef.current = true;
      readVersionRef.current += 1;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await listTeamMembers(facilityId);
        if (!mounted.current) return;
        setItems(asArray(res));
        setHasLoaded(true);
        setReadFailed(false);
      } catch (e) {
        if (!mounted.current) return;
        handleApiError(e);
        setReadFailed(true);
      } finally {
        loadInFlightRef.current = false;
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [facilityId, mounted, clearError, handleApiError, setHasLoaded, setReadFailed]
  );

  const sendInvite = useCallback(async () => {
    if (
      !mounted.current ||
      !canInvite ||
      !canAct ||
      loadInFlightRef.current ||
      actionInFlightRef.current ||
      inviteInFlightRef.current
    )
      return;
    if (!facilityId) return;

    const inviteEmailValue = inviteEmail.trim();
    if (!inviteEmailValue) return;

    inviteInFlightRef.current = true;
    actionInFlightRef.current = true;
    setInviting(true);
    try {
      clearError();
      const result: any = await inviteTeamMember(facilityId, {
        email: inviteEmailValue,
        role: inviteRole
      });
      if (!mounted.current) return;
      setInviteFeedback(
        result?.emailDelivery?.sent
          ? `Invite emailed to ${inviteEmailValue} as ${inviteRole.toLowerCase()}.`
          : `Invite saved for ${inviteEmailValue}, but email delivery was not confirmed.`
      );
      setInviteEmail("");
      await load({ refresh: true, afterMutation: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      inviteInFlightRef.current = false;
      actionInFlightRef.current = false;
      if (mounted.current) setInviting(false);
    }
  }, [
    canInvite,
    canAct,
    facilityId,
    inviteEmail,
    inviteRole,
    load,
    mounted,
    clearError,
    handleApiError
  ]);

  const changeRole = useCallback(
    async (userId: string, role: "MANAGER" | "STAFF" | "VIEWER") => {
      if (
        !mounted.current ||
        !canAct ||
        loadInFlightRef.current ||
        actionInFlightRef.current ||
        !facilityId ||
        !isOwner ||
        !userId ||
        busyMembersRef.current.has(userId)
      ) {
        return;
      }
      busyMembersRef.current.add(userId);
      actionInFlightRef.current = true;
      setBusyMemberId(userId);
      try {
        clearError();
        await updateTeamMemberRole(facilityId, userId, { role });
        if (!mounted.current) return;
        setMemberFeedback("Role change saved. Refresh confirms the current team.");
        await load({ refresh: true, afterMutation: true });
      } catch (e) {
        handleApiError(e);
      } finally {
        busyMembersRef.current.delete(userId);
        actionInFlightRef.current = false;
        if (mounted.current) setBusyMemberId("");
      }
    },
    [facilityId, isOwner, load, canAct, mounted, clearError, handleApiError]
  );

  const removeMember = useCallback(
    async (userId: string, label: string) => {
      if (
        !mounted.current ||
        !canAct ||
        loadInFlightRef.current ||
        actionInFlightRef.current ||
        !facilityId ||
        !isOwner ||
        !userId ||
        busyMembersRef.current.has(userId)
      ) {
        return;
      }
      busyMembersRef.current.add(userId);
      actionInFlightRef.current = true;
      setBusyMemberId(userId);
      try {
        clearError();
        setMemberFeedback("");
        await removeTeamMember(facilityId, userId);
        if (!mounted.current) return;
        setMemberFeedback(`${label} no longer has access to this facility.`);
        await load({ refresh: true, afterMutation: true });
      } catch (e) {
        handleApiError(e);
      } finally {
        busyMembersRef.current.delete(userId);
        actionInFlightRef.current = false;
        if (mounted.current) setBusyMemberId("");
      }
    },
    [facilityId, isOwner, load, canAct, mounted, clearError, handleApiError]
  );

  const confirmRemoveMember = useCallback(
    (userId: string, label: string) => {
      if (!canAct || actionInFlightRef.current || loadInFlightRef.current) return;
      const confirmationVersion = readVersionRef.current;
      const removeIfCurrent = () => {
        if (confirmationVersion === readVersionRef.current)
          void removeMember(userId, label);
      };
      const message = `${label} will lose access to this facility. Their historical task and audit records remain.`;

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined" &&
        typeof window.confirm === "function"
      ) {
        if (window.confirm(`Remove facility member?\n\n${message}`)) {
          removeIfCurrent();
        }
        return;
      }

      Alert.alert("Remove facility member?", message, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: removeIfCurrent
        }
      ]);
    },
    [removeMember, canAct]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const header = useMemo(() => {
    if (!hasLoaded) return "Team count unavailable";
    const n = items.length;
    const count = n === 1 ? "1 member" : `${n} members`;
    return refreshing || readFailed ? `${count} (previously loaded)` : count;
  }, [items.length, hasLoaded, refreshing, readFailed]);

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
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            Facility Team
          </Text>
          <Text style={styles.muted}>{header}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh facility team"
          accessibilityState={{ disabled: busy, busy: loading || refreshing }}
          disabled={busy}
          onPress={() => load({ refresh: true })}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>{readFailed ? "Retry" : "Refresh"}</Text>
        </Pressable>
        {readFailed ? (
          <Text style={styles.muted}>
            {hasLoaded
              ? "Previously loaded team shown. Retry before changing access or assigning work."
              : "Team unavailable. Retry to load members."}
          </Text>
        ) : null}

        {canInvite ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Invite member
            </Text>

            <TextInput
              accessibilityLabel="Invite team member email"
              value={inviteEmail}
              editable={!busy}
              onChangeText={setInviteEmail}
              placeholder="email@company.com"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <View
              accessibilityLabel="Invite member role"
              accessibilityRole="radiogroup"
              style={styles.roleRow}
            >
              {(["MANAGER", "STAFF", "VIEWER"] as FacilityRole[]).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setInviteRole(role)}
                  disabled={busy}
                  accessibilityRole="radio"
                  accessibilityLabel={`Invite as ${role.toLowerCase()}`}
                  accessibilityState={{ checked: inviteRole === role, disabled: busy }}
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
              accessibilityState={{
                busy: inviting,
                disabled: !canAct || !inviteEmail.trim()
              }}
              onPress={sendInvite}
              disabled={!canAct || !inviteEmail.trim()}
              style={({ pressed }) => [
                styles.btn,
                (!canAct || !inviteEmail.trim()) && styles.btnDisabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.btnText}>
                {inviting ? "Sending..." : "Send invite"}
              </Text>
            </Pressable>
            {inviteFeedback ? (
              <Text accessibilityLiveRegion="polite" style={styles.feedback}>
                {inviteFeedback}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Team access
            </Text>
            <Text style={styles.muted}>
              {canAssignTasks
                ? "You can view the team and assign work. Only the facility owner can invite members or change access roles."
                : "You can view the team. Only owners and managers can assign work, and only the facility owner can manage access roles."}
            </Text>
          </View>
        )}

        {loading ? (
          <View
            accessibilityLabel="Loading facility team"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading team...</Text>
          </View>
        ) : null}

        <FlatList
          accessibilityLabel="Facility team members"
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={palette.accent}
              colors={[palette.accent]}
              progressBackgroundColor={palette.surface}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text accessibilityRole="header" aria-level={2} style={styles.listTitle}>
              Team members
            </Text>
          }
          ListEmptyComponent={
            hasLoaded && !loading && !readFailed ? (
              <View style={styles.empty}>
                <Text accessibilityRole="header" aria-level={3} style={styles.emptyTitle}>
                  No members yet
                </Text>
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
                  <Text
                    accessibilityRole="header"
                    aria-level={3}
                    style={styles.rowTitle}
                    numberOfLines={1}
                  >
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
                        accessibilityRole="link"
                        accessibilityLabel={`Assign task to ${title}`}
                        disabled={!canAct}
                        accessibilityState={{ disabled: !canAct }}
                        onPress={() =>
                          canAct &&
                          router.push(
                            `/home/facility/tasks?assignee=${encodeURIComponent(memberId)}` as any
                          )
                        }
                        style={styles.smallButton}
                      >
                        <Text style={styles.smallButtonText}>Assign task</Text>
                      </Pressable>
                    ) : null}
                    {canManageMember ? (
                      <View
                        accessibilityLabel={`Access role for ${title}`}
                        accessibilityRole="radiogroup"
                        style={styles.roleControls}
                      >
                        {(["MANAGER", "STAFF", "VIEWER"] as const).map((role) => (
                          <Pressable
                            key={role}
                            accessibilityRole="radio"
                            accessibilityLabel={`Change ${title} role to ${role.toLowerCase()}`}
                            accessibilityState={{
                              busy: busyMemberId === memberId,
                              checked: memberRole === role,
                              disabled: !canAct || memberRole === role
                            }}
                            disabled={!canAct || memberRole === role}
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
                        ))}
                      </View>
                    ) : null}
                    {canManageMember ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${removalLabel} from facility`}
                        accessibilityState={{
                          busy: busyMemberId === memberId,
                          disabled: !canAct
                        }}
                        disabled={!canAct}
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

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16 },
    headerRow: { marginBottom: 12 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 4 },
    muted: { color: palette.textMuted },

    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface,
      marginBottom: 12
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
    listTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.surface,
      color: palette.text,
      marginBottom: 10
    },
    btn: {
      borderRadius: radius.card,
      paddingVertical: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface
    },
    btnDisabled: { opacity: 0.5 },
    btnText: { color: palette.text, fontWeight: "900" },
    roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    roleButton: {
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    roleSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    roleText: { color: palette.text, fontWeight: "800" },
    roleTextSelected: { color: palette.accentText },
    feedback: { color: palette.success, fontWeight: "800", marginTop: 10 },

    pressed: { opacity: 0.85 },

    loading: { paddingVertical: 18, alignItems: "center" },
    list: { paddingVertical: 6 },

    row: {
      padding: 14,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface
    },
    rowTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 4 },
    rowSub: { color: palette.textMuted },
    memberActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    roleControls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    smallButton: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    smallButtonSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    smallButtonText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    removeButton: { borderColor: palette.danger, backgroundColor: palette.surfaceStrong },
    removeButtonText: { color: palette.danger, fontSize: 12, fontWeight: "800" },

    empty: { paddingVertical: 26, alignItems: "center" },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 6 }
  });
