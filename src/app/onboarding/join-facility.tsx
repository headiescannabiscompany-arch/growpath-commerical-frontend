import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Redirect, useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { useFacility } from "@/facility/FacilityProvider";
import { apiRequest } from "@/api/apiRequest";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type InvitePreview = {
  facilityId?: string;
  facilityName?: string;
  inviterName?: string;
  role?: string;
};

function trimToken(value: string) {
  return value.trim();
}

export default function JoinFacilityScreen() {
  const auth = useAuth();
  const router = useRouter();
  const facilityStore = useFacility();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = createJoinFacilityStyles(palette);

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canLoad = useMemo(
    () => trimToken(token).length >= 6 && !loading,
    [token, loading]
  );
  const canAccept = !!preview && !loading;

  if (auth.isHydrating || !entitlements.ready) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  if (!auth.token) {
    return <Redirect href="/login" />;
  }

  if (entitlements.facilityId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Facility already connected
        </Text>
        <Text style={styles.subtitle}>
          This account already belongs to a Facility workspace. Open that workspace
          instead of joining another one.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace("/home/facility" as any)}
          accessibilityRole="button"
          accessibilityLabel="Open facility workspace"
        >
          <Text style={styles.primaryButtonText}>Open facility workspace</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const loadInvite = async () => {
    if (!canLoad) return;
    const t = trimToken(token);
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const data = await apiRequest<InvitePreview>(
        `/api/invites/${encodeURIComponent(t)}`,
        {
          method: "GET"
        }
      );
      setPreview(data || {});
    } catch (err: any) {
      setError(String(err?.message || "Unable to load invite."));
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!canAccept) return;
    const t = trimToken(token);
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<any>(
        `/api/invites/${encodeURIComponent(t)}/accept`,
        {
          method: "POST",
          body: {}
        }
      );

      const facilityId = String(
        result?.facilityId || preview?.facilityId || result?.facility?.id || ""
      );
      const facilityName = String(
        result?.facilityName ||
          preview?.facilityName ||
          result?.facility?.name ||
          facilityId
      );

      if (facilityId) {
        await facilityStore.selectFacility({ id: facilityId, name: facilityName });
        router.replace("/home/facility" as any);
      } else {
        router.replace("/home/facility/select" as any);
      }
    } catch (err: any) {
      setError(String(err?.message || "Unable to accept invite."));
    } finally {
      setLoading(false);
    }
  };

  const declineInvite = async () => {
    const t = trimToken(token);
    if (!t || loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/api/invites/${encodeURIComponent(t)}/decline`, {
        method: "POST",
        body: {}
      });
      setPreview(null);
      Alert.alert("Invite declined", "You can still create your own facility.");
    } catch (err: any) {
      setError(String(err?.message || "Unable to decline invite."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        Join a Facility
      </Text>
      <Text style={styles.subtitle}>
        Paste the invite token from your facility invitation email.
      </Text>

      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Invite token"
        placeholderTextColor={palette.textMuted}
        accessibilityLabel="Invite token"
      />

      <Pressable
        style={[styles.primaryButton, !canLoad && styles.disabled]}
        onPress={loadInvite}
        disabled={!canLoad}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Checking..." : "Load Invite"}
        </Text>
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {preview ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {preview.facilityName || "Facility Invite"}
          </Text>
          {preview.inviterName ? (
            <Text style={styles.meta}>Invited by: {preview.inviterName}</Text>
          ) : null}
          {preview.role ? <Text style={styles.meta}>Role: {preview.role}</Text> : null}

          <Pressable
            style={[styles.primaryButton, !canAccept && styles.disabled]}
            onPress={acceptInvite}
            disabled={!canAccept}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Joining..." : "Accept Invite"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={declineInvite}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Decline</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={styles.linkButton}
        onPress={() => router.replace("/onboarding/create-facility" as any)}
      >
        <Text style={styles.linkText}>No invite? Create a facility instead</Text>
      </Pressable>
    </ScrollView>
  );
}

export const createJoinFacilityStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    content: { padding: 16, gap: 12 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    title: { color: palette.text, fontSize: 24, fontWeight: "800" },
    subtitle: { color: palette.textSoft, fontSize: 14 },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 11,
      fontSize: 15,
      backgroundColor: palette.surface,
      color: palette.text
    },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      gap: 8,
      backgroundColor: palette.surfaceMuted
    },
    cardTitle: { color: palette.text, fontSize: 17, fontWeight: "700" },
    meta: { fontSize: 13, color: palette.textSoft },
    primaryButton: {
      borderRadius: radius.card,
      backgroundColor: palette.accent,
      paddingVertical: 11,
      alignItems: "center"
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "700" },
    secondaryButton: {
      borderRadius: radius.card,
      borderWidth: 1,
      backgroundColor: palette.surface,
      borderColor: palette.border,
      paddingVertical: 10,
      alignItems: "center"
    },
    secondaryButtonText: { color: palette.text, fontWeight: "700" },
    disabled: { opacity: 0.6 },
    errorText: { color: palette.danger, fontSize: 13 },
    linkButton: { paddingVertical: 10, alignItems: "center" },
    linkText: { color: palette.link, fontWeight: "700" }
  });
