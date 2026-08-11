import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link } from "expo-router";

import {
  createIntegrationConnection,
  listIntegrationDevices,
  testIntegrationConnection
} from "@/api/integrations";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export function canConfigureFacilityIntegration(role: string | null | undefined = "") {
  const normalized = String(role).toUpperCase();
  return normalized === "OWNER" || normalized === "MANAGER";
}

function deviceName(device: any, index: number) {
  return String(
    device?.name ??
      device?.deviceName ??
      device?.displayName ??
      device?.label ??
      device?.guid ??
      device?.id ??
      `Pulse device ${index + 1}`
  );
}

export default function FacilityPulseConnectionRoute() {
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityPulseStyles(palette), [palette]);
  const { selectedId: facilityId } = useFacility();
  const canConfigure = canConfigureFacilityIntegration(entitlements.facilityRole);
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("Pulse facility telemetry");
  const [devices, setDevices] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const connectInFlight = useRef(false);

  async function connect() {
    if (connectInFlight.current) return;
    if (!apiKey.trim()) {
      setStatus("Enter the API key created in the Pulse grow account.");
      return;
    }
    connectInFlight.current = true;
    setBusy(true);
    setStatus("Verifying the Pulse key and discovering devices...");
    try {
      const connection = await createIntegrationConnection({
        provider: "pulse",
        label: label.trim() || "Pulse facility telemetry",
        credentials: { apiKey: apiKey.trim() },
        config: { facilityId: String(facilityId || "") }
      });
      if (!connection?.id) {
        throw new Error("Pulse did not return a connection record. Try again.");
      }
      await testIntegrationConnection(connection.id);
      const discovered = await listIntegrationDevices(connection.id);
      const discoveredDevices = Array.isArray(discovered) ? discovered : [];
      setDevices(discoveredDevices);
      setApiKey("");
      setStatus(
        discoveredDevices.length
          ? `${discoveredDevices.length} Pulse device${discoveredDevices.length === 1 ? "" : "s"} discovered. Review the room mapping next.`
          : "Pulse connected, but this grow-scoped key returned no devices. Check the key's Pulse grow and device access."
      );
    } catch (error: any) {
      setStatus(String(error?.message || "Pulse connection failed."));
    } finally {
      connectInFlight.current = false;
      setBusy(false);
    }
  }

  if (!canConfigure) {
    return (
      <ScreenBoundary
        title="Connect Pulse"
        showBack
        backFallbackHref="/home/facility/integrations"
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.card} accessibilityRole="alert">
            <Text accessibilityRole="header" aria-level={2} style={styles.title}>
              Pulse connection setup is read-only
            </Text>
            <Text style={styles.body}>
              Your Facility role can view connected telemetry, but only owners and
              managers can add or verify provider credentials.
            </Text>
            <Link href="/home/facility/integrations" asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Return to Facility integrations"
                style={styles.primary}
              >
                <Text style={styles.primaryText}>Return to Integrations</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </ScreenBoundary>
    );
  }

  return (
    <ScreenBoundary
      title="Connect Pulse"
      showBack
      backFallbackHref="/home/facility/integrations"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.title}>
            Pulse read-only telemetry
          </Text>
          <Text style={styles.body}>
            In Pulse, open Account, create an API key for the grow you want to connect,
            and paste it here. Pulse keys are grow-scoped; GrowPath encrypts the key and
            uses it only for authorized device metadata and readings.
          </Text>
          <TextInput
            accessibilityLabel="Pulse connection label"
            value={label}
            onChangeText={setLabel}
            placeholder="Connection name"
            placeholderTextColor={palette.textMuted}
            editable={!busy}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Pulse API key"
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Pulse API key"
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
            secureTextEntry
            editable={!busy}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Verify Pulse connection and discover devices"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={connect}
            style={[styles.primary, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator
                accessibilityLabel="Verifying Pulse connection and discovering devices"
                color={palette.accentText}
              />
            ) : (
              <Text style={styles.primaryText}>Verify and discover devices</Text>
            )}
          </Pressable>
          {status ? (
            <Text accessibilityRole="alert" style={styles.status}>
              {status}
            </Text>
          ) : null}
        </View>

        {devices.length ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Discovered devices
            </Text>
            {devices.map((device, index) => (
              <Text
                key={String(device?.id ?? device?.guid ?? index)}
                style={styles.device}
              >
                {deviceName(device, index)}
              </Text>
            ))}
            <Link
              href={{
                pathname: "/home/facility/rooms",
                params: {
                  importProvider: "Pulse",
                  importDevices: devices.map(deviceName).join("\n")
                }
              }}
              asChild
            >
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Review Pulse room mappings"
                style={styles.primary}
              >
                <Text style={styles.primaryText}>Review room mappings</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createFacilityPulseStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { backgroundColor: palette.page, padding: 16, paddingBottom: 40, gap: 12 },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 16
    },
    title: { color: palette.text, fontSize: 24, fontWeight: "900", marginBottom: 8 },
    cardTitle: { color: palette.text, fontSize: 18, fontWeight: "900", marginBottom: 8 },
    body: { color: palette.textMuted, lineHeight: 21, marginBottom: 14 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      color: palette.text,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 10,
      minHeight: 46,
      paddingHorizontal: 12
    },
    primary: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: 10,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 14
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    status: { color: palette.success, marginTop: 12 },
    device: {
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      color: palette.text,
      paddingVertical: 9
    }
  });
}
