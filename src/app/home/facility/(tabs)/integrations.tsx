import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import GrowIntegrationBuildPanel from "@/components/integrations/GrowIntegrationBuildPanel";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";

const PLANNED = ["Growlink", "AROYA", "SensorPush", "Aranet", "HOBOlink", "Monnit"];

function growRows(response: any) {
  const rows =
    response?.grows ??
    response?.items ??
    response?.data?.grows ??
    response?.data?.items ??
    response?.data ??
    response;
  return Array.isArray(rows) ? rows : [];
}

function growId(row: any) {
  return String(row?.id || row?._id || row?.growId || "").trim();
}

function growName(row: any) {
  return String(row?.name || row?.title || row?.strain || "Facility grow");
}

export default function FacilityIntegrationsRoute() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityIntegrationsStyles(palette), [palette]);
  const entitlements = useEntitlements();
  const { selectedId: selectedFacilityId } = useFacility();
  const role = String(entitlements.facilityRole || "VIEWER").toUpperCase();
  const facilityId = String(
    selectedFacilityId || entitlements.selectedFacilityId || entitlements.facilityId || ""
  );
  const canConfigure = role === "OWNER" || role === "MANAGER";
  const [selected, setSelected] = useState<"pulse" | "trolmaster">("pulse");
  const [grows, setGrows] = useState<any[]>([]);
  const [selectedGrowId, setSelectedGrowId] = useState("");
  const [loadingGrows, setLoadingGrows] = useState(false);
  const [growError, setGrowError] = useState("");
  const growLoadInFlight = useRef(false);

  const loadGrows = useCallback(async () => {
    if (!facilityId || growLoadInFlight.current) return;
    growLoadInFlight.current = true;
    setLoadingGrows(true);
    setGrowError("");
    try {
      const response = await apiRequest(endpoints.grows(facilityId), {
        method: "GET",
        cache: "no-store"
      });
      const rows = growRows(response).filter((row) => growId(row));
      setGrows(rows);
      setSelectedGrowId((current) =>
        rows.some((row) => growId(row) === current) ? current : ""
      );
    } catch (error: any) {
      setGrowError(error?.message || "Unable to load Facility grows.");
      setGrows([]);
      setSelectedGrowId("");
    } finally {
      growLoadInFlight.current = false;
      setLoadingGrows(false);
    }
  }, [facilityId]);

  useEffect(() => {
    void loadGrows();
  }, [loadGrows]);

  function requestProvider(provider: string) {
    Alert.alert(
      `${provider} is not enabled yet`,
      "Email GrowPath to request this integration for your facility.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Email GrowPath",
          onPress: () =>
            Linking.openURL(
              `mailto:support@growpathai.com?subject=${encodeURIComponent(`${provider} facility integration`)}`
            )
        }
      ]
    );
  }

  const selectedGrow = grows.find((row) => growId(row) === selectedGrowId);

  return (
    <ScreenBoundary
      title="Integrations"
      showBack
      backFallbackHref="/home/facility/dashboard"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Facility setup</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Connect rooms and sensor data
          </Text>
          <Text style={styles.subtitle}>
            Choose the destination grow before mapping devices or importing readings.
            Supported connections stay read-only; provider structure, room names, zones,
            and history remain review steps instead of automatic guesses.
          </Text>
        </View>

        <View style={styles.choiceRow}>
          {(["pulse", "trolmaster"] as const).map((provider) => (
            <Pressable
              key={provider}
              accessibilityRole="button"
              accessibilityLabel={`Select ${provider} integration`}
              accessibilityState={{ selected: selected === provider }}
              onPress={() => setSelected(provider)}
              style={[
                styles.providerChoice,
                selected === provider && styles.providerChoiceActive
              ]}
            >
              <Text style={styles.providerChoiceTitle}>
                {provider === "pulse" ? "Pulse" : "TrolMaster"}
              </Text>
              <Text style={styles.providerChoiceText}>
                {provider === "pulse"
                  ? "Read-only setup available"
                  : "Key storage only · API access required"}
              </Text>
            </Pressable>
          ))}
        </View>

        {selected === "pulse" ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Pulse read-only telemetry
            </Text>
            <Text style={styles.body}>
              Verify a Pulse API key, choose devices, create telemetry sources, and pull
              environment history.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Connect Facility Pulse"
              disabled={!canConfigure}
              style={[styles.primaryAction, !canConfigure && styles.disabled]}
              onPress={() => router.push("/home/facility/tools/pulse" as any)}
            >
              <Text style={styles.primaryActionText}>Connect Pulse</Text>
            </Pressable>
            {!canConfigure ? (
              <Text style={styles.body}>
                Owners and managers can add connections. Your role can view connected
                facility data.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              TrolMaster developer access
            </Text>
            <Text style={styles.body}>
              TrolMaster publishes an official developer portal for API subscriptions,
              credentials, usage, documentation, and live API testing. GrowPath will
              enable this connection after its read-only adapter is implemented and
              verified.
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Open the TrolMaster developer portal"
              style={styles.primaryAction}
              onPress={() => Linking.openURL("https://developer.trolmaster.com/")}
            >
              <Text style={styles.primaryActionText}>Open developer portal</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Request the TrolMaster Facility integration"
              style={styles.secondaryAction}
              onPress={() => requestProvider("TrolMaster")}
            >
              <Text style={styles.secondaryActionText}>Ask GrowPath to enable it</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Choose the destination grow
          </Text>
          <Text style={styles.body}>
            A Facility is the ownership boundary, not a grow-history destination. Select
            the exact grow before discovering mappings, creating spaces, or importing
            readings.
          </Text>
          {loadingGrows ? (
            <View
              accessibilityLabel="Loading Facility grows for integrations"
              accessibilityRole="progressbar"
              style={styles.loadingRow}
            >
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.body}>Loading grows...</Text>
            </View>
          ) : null}
          {growError ? (
            <View accessibilityRole="alert" style={styles.errorPanel}>
              <Text style={styles.errorText}>{growError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading Facility grows for integrations"
                disabled={loadingGrows}
                onPress={() => void loadGrows()}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.growChoices}>
            {grows.map((grow) => {
              const id = growId(grow);
              const name = growName(grow);
              return (
                <Pressable
                  accessibilityLabel={`Use ${name} for Facility integrations`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedGrowId === id }}
                  key={id}
                  onPress={() => setSelectedGrowId(id)}
                  style={[
                    styles.growChoice,
                    selectedGrowId === id && styles.growChoiceSelected
                  ]}
                >
                  <Text style={styles.connectionTitle}>{name}</Text>
                  <Text style={styles.body}>
                    {grow.roomName || grow.stage || grow.status || "Facility grow"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!loadingGrows && !growError && !grows.length ? (
            <>
              <Text style={styles.body}>
                No Facility grows are available. Create a grow before building device
                spaces or importing history.
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open Facility grows"
                onPress={() => router.push("/home/facility/grows" as any)}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Open Grows</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {selectedGrowId ? (
          <View style={styles.selectedGrowSection}>
            <Text style={styles.status}>
              Destination: {selectedGrow ? growName(selectedGrow) : "Selected grow"}
            </Text>
            <GrowIntegrationBuildPanel
              mode="facility"
              targetRef={selectedGrowId}
              facilityId={facilityId}
              canConfigure={canConfigure}
            />
          </View>
        ) : (
          <Text accessibilityRole="alert" style={styles.status}>
            No grow selected. Connection setup may be opened above, but mapping, build,
            and history actions stay unavailable until you choose a grow.
          </Text>
        )}

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Import controller and grow history
          </Text>
          <Text style={styles.body}>
            Upload an exported CSV, map its timestamp, temperature, and humidity columns,
            then save the readings to the selected grow. This works without sharing a
            manufacturer password and preserves older grow records for environment
            analysis.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Import Facility grow history"
            disabled={!canConfigure}
            style={[styles.primaryAction, !canConfigure && styles.disabled]}
            onPress={() =>
              router.push(
                selectedGrowId
                  ? ({
                      pathname: "/home/facility/tools/history-import",
                      params: {
                        growId: selectedGrowId,
                        growName: selectedGrow ? growName(selectedGrow) : "Facility grow",
                        roomId: String(selectedGrow?.roomId || ""),
                        roomName: String(selectedGrow?.roomName || "")
                      }
                    } as any)
                  : ("/home/facility/tools/history-import" as any)
              )
            }
          >
            <Text style={styles.primaryActionText}>Import grow history</Text>
          </Pressable>
          {!canConfigure ? (
            <Text style={styles.body}>
              Owners and managers can import controller history. Your role can review
              saved Facility records.
            </Text>
          ) : null}
          <Text style={styles.body}>Import methods:</Text>
          <View style={styles.providerGrid}>
            <View style={styles.importProvider}>
              <Text style={styles.importProviderText}>Controller CSV</Text>
              <Text style={styles.importStatus}>Available · review required</Text>
            </View>
            <View style={styles.importProvider}>
              <Text style={styles.importProviderText}>PDF source document</Text>
              <Text style={styles.comingSoon}>Reviewed extraction planned</Text>
            </View>
          </View>
          <Text style={styles.body}>
            CSV is the verified structured-data path today. GrowPath detects supported
            layouts when possible and still lets you map unknown controller exports
            manually. PDF reports can be retained as source evidence once reviewed
            extraction is enabled.
          </Text>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            More providers
          </Text>
          <Text style={styles.body}>
            These connectors are visible for planning but disabled until their production
            contract is enabled.
          </Text>
          <View style={styles.providerGrid}>
            {PLANNED.map((provider) => (
              <Pressable
                key={provider}
                accessibilityRole="button"
                accessibilityLabel={`Request the ${provider} Facility integration`}
                onPress={() => requestProvider(provider)}
                style={styles.disabledProvider}
              >
                <Text style={styles.disabledProviderText}>{provider}</Text>
                <Text style={styles.comingSoon}>Email to request</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createFacilityIntegrationsStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { backgroundColor: palette.page, gap: 14, padding: 16, paddingBottom: 32 },
    header: { gap: 6 },
    kicker: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 28, fontWeight: "900" },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 820 },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    providerChoice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 180,
      padding: 14
    },
    providerChoiceActive: { borderColor: palette.accent, borderWidth: 2 },
    providerChoiceTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    providerChoiceText: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 4
    },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    cardTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    body: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 11
    },
    primaryAction: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 16,
      paddingVertical: 11
    },
    primaryActionText: { color: palette.accentText, fontWeight: "900" },
    secondaryAction: {
      alignSelf: "flex-start",
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryActionText: { color: palette.link, fontWeight: "900" },
    status: {
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      color: palette.link,
      fontWeight: "800",
      padding: 12
    },
    selectedGrowSection: { gap: 10 },
    growChoices: { gap: 8 },
    growChoice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 3,
      padding: 12
    },
    growChoiceSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderWidth: 2
    },
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    errorPanel: { alignItems: "flex-start", gap: 8 },
    connectionRow: {
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      paddingVertical: 8
    },
    connectionTitle: { color: palette.text, fontWeight: "900" },
    errorText: { color: palette.danger, fontSize: 13, marginTop: 4 },
    wizardPanel: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      gap: 10,
      paddingTop: 12
    },
    mappingRow: { gap: 6 },
    providerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    disabledProvider: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      opacity: 0.7,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    disabledProviderText: { color: palette.textMuted, fontWeight: "800" },
    importProvider: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    importProviderText: { color: palette.text, fontWeight: "800" },
    importStatus: { color: palette.success, fontSize: 10, marginTop: 2 },
    comingSoon: { color: palette.textMuted, fontSize: 10, marginTop: 2 },
    disabled: { opacity: 0.5 }
  });
}
