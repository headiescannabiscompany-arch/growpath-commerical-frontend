import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useAuth } from "@/auth/AuthContext";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import CannabisContentControls from "@/components/account/CannabisContentControls";
import { updateNotificationPreferences } from "@/api/users";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_OPTIONS,
  NotificationPreferenceState
} from "@/notifications/notificationPreferences";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.facilities)) return res.facilities;
  if (Array.isArray(res?.data?.facilities)) return res.data.facilities;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
}

function unwrapRecord(res: any): AnyRec | null {
  const value = res?.data?.user ?? res?.user ?? res?.data ?? res;
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function renderKV(
  obj: AnyRec | null,
  key: string,
  styles: ReturnType<typeof createStyles>
) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;
  const displayValue =
    key === "createdAt" && !Number.isNaN(Date.parse(String(v)))
      ? new Date(String(v)).toLocaleDateString()
      : key === "role" || key === "plan"
        ? String(v)
            .toLowerCase()
            .replace(/(^|[_-])\w/g, (match) => match.replace(/[_-]/, " ").toUpperCase())
        : typeof v === "string"
          ? v
          : JSON.stringify(v);

  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>
        {(
          {
            displayName: "Display name",
            legalName: "Legal name",
            createdAt: "Created",
            license: "License number",
            id: "Facility ID"
          } as Record<string, string>
        )[key] || key.replace(/Id$/, " ID")}
      </Text>
      <Text style={styles.v}>{displayValue}</Text>
    </View>
  );
}

function ProfileAction({
  label,
  onPress,
  accessibilityLabel,
  danger = false,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        danger && styles.dangerActionButton,
        disabled && styles.disabledActionButton
      ]}
    >
      <Text style={[styles.actionText, danger && styles.dangerActionText]}>{label}</Text>
    </Pressable>
  );
}

export default function FacilityProfileRoute() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const auth = useAuth();
  const { selectedId: facilityId, selected: selectedFacility } = useFacility();

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

  const [me, setMe] = useState<AnyRec | null>(null);
  const [facility, setFacility] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferenceState>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    const storedPrefs =
      ((auth.user as any)
        ?.notificationPreferences as Partial<NotificationPreferenceState>) || {};
    setNotificationPrefs({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...storedPrefs
    });
  }, [auth.user]);

  const saveNotificationPreferences = useCallback(async () => {
    setNotificationSaving(true);
    setNotificationFeedback("");
    setNotificationError("");
    try {
      await updateNotificationPreferences(notificationPrefs);
      await auth.retryMe();
      setNotificationFeedback("Notification settings saved.");
    } catch (saveError: any) {
      setNotificationError(saveError?.message || "Unable to save notification settings.");
    } finally {
      setNotificationSaving(false);
    }
  }, [auth, notificationPrefs]);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();

        const [meResult, facilitiesResult] = await Promise.allSettled([
          apiRequest(endpoints.me, { method: "GET", timeoutMs: 10000 }),
          apiRequest(endpoints.facilities, { method: "GET", timeoutMs: 10000 })
        ]);

        setMe(
          meResult.status === "fulfilled"
            ? unwrapRecord(meResult.value)
            : (auth.user ?? null)
        );

        const facilities =
          facilitiesResult.status === "fulfilled" ? asArray(facilitiesResult.value) : [];
        const found =
          facilities.find(
            (f) =>
              String(f?.id ?? f?._id ?? f?.facilityId) === String(facilityId) ||
              String(f?.facilityId ?? "") === String(facilityId)
          ) ??
          selectedFacility ??
          ({ id: String(facilityId), name: "Selected facility" } as AnyRec);

        setFacility(found);

        if (meResult.status === "rejected" && facilitiesResult.status === "rejected") {
          handleApiError(meResult.reason);
        }
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [auth.user, facilityId, selectedFacility, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const logout = useCallback(async () => {
    await auth.logout();
    router.replace("/login");
  }, [auth, router]);

  const meKeys = useMemo(() => {
    if (!me) return [];
    const preferred = ["email", "name", "displayName", "plan", "role", "createdAt"];
    return preferred.filter((k) => k in me);
  }, [me]);

  const facilityKeys = useMemo(() => {
    if (!facility) return [];
    const facilityPreferred = [
      "name",
      "id",
      "legalName",
      "license",
      "state",
      "createdAt"
    ];
    return facilityPreferred.filter((k) => k in facility);
  }, [facility]);

  return (
    <ScreenBoundary title="Profile">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        {loading ? (
          <View
            accessibilityLabel="Loading facility profile"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading profile...</Text>
          </View>
        ) : null}

        <View style={[styles.card, styles.workspaceCard]}>
          <Text style={styles.kicker}>Facility workspace</Text>
          <Text accessibilityRole="header" aria-level={2} style={styles.workspaceTitle}>
            Operational facility identity
          </Text>
          <Text style={styles.workspaceText}>
            Facility is for rooms, operational runs, team tasks, sensor streams,
            compliance, and audit history. Commercial storefront outreach and Personal
            grow records stay in their own workspaces.
          </Text>
          <View style={styles.actionRow}>
            <ProfileAction
              label="Switch workspace"
              accessibilityLabel="Switch workspace mode"
              onPress={() => router.push("/account/mode" as any)}
            />
            <ProfileAction
              label="Account profile"
              accessibilityLabel="Open account profile"
              onPress={() => router.push("/profile" as any)}
            />
            <ProfileAction
              label="Plans & billing"
              accessibilityLabel="Manage facility plan and billing"
              onPress={() => router.push("/account/billing" as any)}
            />
            <ProfileAction
              label="Gifts you sent"
              accessibilityLabel="View gifts purchased by this account"
              onPress={() => router.push("/account/sent-gifts" as any)}
            />
            <ProfileAction
              label="Log out"
              accessibilityLabel="Log out"
              danger
              onPress={logout}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.h1}>
            Facility
          </Text>

          {facility ? (
            <View style={styles.kvWrap}>
              {facilityKeys.map((k) => renderKV(facility, k, styles))}
            </View>
          ) : (
            <Text style={styles.muted}>
              Facility details are unavailable right now. Pull to refresh or switch
              facilities.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <ThemeModeSelector />
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.h1}>
            Notification settings
          </Text>
          <Text style={styles.mutedText}>
            Choose which inbox items can also reach this device. In-app notifications
            remain available; push delivery requires a registered device.
          </Text>
          {NOTIFICATION_PREFERENCE_OPTIONS.map((option) => (
            <View key={String(option.key)} style={styles.notificationRow}>
              <View style={styles.notificationCopy}>
                <Text style={styles.notificationTitle}>{option.title}</Text>
                <Text style={styles.notificationDescription}>{option.description}</Text>
              </View>
              <Switch
                accessibilityLabel={option.title}
                ios_backgroundColor={palette.surfaceStrong}
                thumbColor={palette.accentText}
                trackColor={{ false: palette.surfaceStrong, true: palette.accent }}
                value={Boolean(notificationPrefs[option.key])}
                onValueChange={(value) =>
                  setNotificationPrefs((current) => ({
                    ...current,
                    [option.key]: value
                  }))
                }
              />
            </View>
          ))}
          <View style={styles.actionRow}>
            <ProfileAction
              label="Open inbox"
              accessibilityLabel="Open notification inbox"
              onPress={() => router.push("/home/notifications?workspace=facility" as any)}
            />
            <ProfileAction
              label={notificationSaving ? "Saving..." : "Save settings"}
              accessibilityLabel="Save notification settings"
              disabled={notificationSaving}
              onPress={() => void saveNotificationPreferences()}
            />
          </View>
          {notificationFeedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              {notificationFeedback}
            </Text>
          ) : null}
          {notificationError ? (
            <Text
              accessibilityLiveRegion="assertive"
              accessibilityRole="alert"
              style={styles.error}
            >
              {notificationError}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.h1}>
            Account
          </Text>

          {me ? (
            <View style={styles.kvWrap}>
              {meKeys.map((k) => renderKV(me, k, styles))}
            </View>
          ) : (
            <Text style={styles.muted}>Account details are unavailable right now.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.h1}>
            AI usage
          </Text>
          <TokenBalanceWidget
            interactive={false}
            workspaceType="facility"
            facilityId={String(facilityId || "")}
            workspaceName={String(
              facility?.name || selectedFacility?.name || "Selected Facility"
            )}
          />
        </View>

        <CannabisContentControls />

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.h1}>
            Facility setup
          </Text>
          <Text style={styles.muted}>
            Manage the people, sensor connections, training, and community attached to
            this workspace.
          </Text>
          <View style={styles.actionRow}>
            <ProfileAction
              label="Team"
              accessibilityLabel="Open facility team"
              onPress={() => router.push("/home/facility/team" as any)}
            />
            <ProfileAction
              label="Pulse / TrolMaster"
              accessibilityLabel="Open facility integrations"
              onPress={() => router.push("/home/facility/integrations" as any)}
            />
            <ProfileAction
              label="Courses"
              accessibilityLabel="Open courses"
              onPress={() => router.push("/courses" as any)}
            />
            <ProfileAction
              label="Videos"
              accessibilityLabel="Open Facility video library"
              onPress={() => router.push("/videos?tab=library" as any)}
            />
            <ProfileAction
              label="Forum"
              accessibilityLabel="Open forum"
              onPress={() => router.push("/forum" as any)}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { padding: 16, paddingBottom: 28 },

    loading: { paddingVertical: 18, alignItems: "center" },
    muted: { color: palette.textMuted },
    mutedText: { color: palette.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
    feedback: { color: palette.success, fontSize: 12, fontWeight: "700", marginTop: 8 },
    error: { color: palette.danger, fontSize: 12, fontWeight: "700", marginTop: 8 },

    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface,
      marginBottom: 12
    },
    workspaceCard: {
      backgroundColor: palette.hero,
      borderColor: palette.border
    },
    kicker: {
      color: palette.heroMuted,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0,
      marginBottom: 6,
      textTransform: "uppercase"
    },
    h1: { color: palette.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
    workspaceTitle: {
      color: palette.heroText,
      fontSize: 18,
      fontWeight: "900",
      marginBottom: 6
    },
    workspaceText: { color: palette.heroMuted, fontSize: 14, lineHeight: 21 },
    actionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 12
    },
    actionButton: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    actionText: { color: palette.text, fontWeight: "900" },
    disabledActionButton: { opacity: 0.55 },
    dangerActionButton: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.danger
    },
    dangerActionText: { color: palette.danger },
    notificationRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingVertical: 8
    },
    notificationCopy: { flex: 1, minWidth: 0 },
    notificationTitle: { color: palette.text, fontSize: 14, fontWeight: "800" },
    notificationDescription: {
      color: palette.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2
    },

    kvWrap: { marginTop: 8 },
    kv: { marginBottom: 10 },
    k: { color: palette.textMuted, fontSize: 12, marginBottom: 3 },
    v: { color: palette.text, fontSize: 14 }
  });
