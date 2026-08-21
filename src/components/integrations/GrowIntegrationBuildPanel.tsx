import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  autoBuildIntegrationSpaces,
  confirmIntegrationMapping,
  createIntegrationConnection,
  fetchIntegrationStructure,
  importIntegrationHistory,
  listIntegrationConnections,
  listIntegrationProviders,
  listIntegrationSpaces,
  previewIntegrationMapping,
  testIntegrationConnection,
  type IntegrationConnection,
  type IntegrationDeviceMapping,
  type IntegrationGrowSpace,
  type IntegrationProvider
} from "@/api/integrations";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type WorkspaceMode = "personal" | "commercial" | "facility";

function errorMessage(error: any) {
  return String(
    error?.message || error?.error?.message || "The integration request failed."
  );
}

export default function GrowIntegrationBuildPanel({
  mode,
  targetRef,
  facilityId,
  canConfigure = true
}: {
  mode: WorkspaceMode;
  targetRef: string;
  facilityId?: string;
  canConfigure?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [spaces, setSpaces] = useState<IntegrationGrowSpace[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [mappings, setMappings] = useState<IntegrationDeviceMapping[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [credential, setCredential] = useState("");
  const workspaceScope = useMemo(
    () => ({
      workspaceType: mode,
      ...(mode === "facility" && facilityId ? { facilityId } : {})
    }),
    [facilityId, mode]
  );
  const workspaceScopeReady = mode !== "facility" || Boolean(facilityId);

  const load = useCallback(async () => {
    if (!targetRef || !workspaceScopeReady) return;
    try {
      const [connectionRows, spaceRows, providerRows] = await Promise.all([
        listIntegrationConnections(workspaceScope),
        listIntegrationSpaces({ mode, targetRef, targetType: "grow" }),
        listIntegrationProviders()
      ]);
      setConnections(connectionRows);
      setSpaces(spaceRows);
      setProviders(providerRows);
      setSelectedProviderId(
        (current) =>
          current ||
          providerRows.find(
            (provider) =>
              provider.contractStatus === "implemented" || provider.credentialRequired
          )?.id ||
          ""
      );
    } catch (error) {
      setStatus(errorMessage(error));
    }
  }, [mode, targetRef, workspaceScope, workspaceScopeReady]);

  useEffect(() => {
    void load();
  }, [load]);

  const connectableProviders = providers.filter(
    (provider) => provider.contractStatus === "implemented" || provider.credentialRequired
  );
  const selectedProvider = providers.find(
    (provider) => provider.id === selectedProviderId
  );

  async function saveProviderConnection() {
    if (
      !selectedProvider ||
      !credential.trim() ||
      !canConfigure ||
      !targetRef ||
      !workspaceScopeReady
    )
      return;
    setBusy(true);
    try {
      const connection = await createIntegrationConnection({
        provider: selectedProvider.id,
        label: selectedProvider.name,
        credentials: { apiKey: credential.trim() },
        workspaceType: mode,
        ...(mode === "facility" && facilityId ? { facilityId } : {}),
        config: mode === "facility" && facilityId ? { facilityId } : undefined
      });
      setCredential("");
      if (selectedProvider.contractStatus === "implemented") {
        const tested = await testIntegrationConnection(connection.id);
        setConnections((rows) => [tested, ...rows.filter((row) => row.id !== tested.id)]);
        setStatus(
          `${selectedProvider.name} connected. Discover its devices below, then review every space mapping before creating anything.`
        );
      } else {
        setConnections((rows) => [
          connection,
          ...rows.filter((row) => row.id !== connection.id)
        ]);
        setStatus(
          `${selectedProvider.name} key saved securely. Provider API access still has to expose the subscribed device endpoints before GrowPath can discover devices.`
        );
      }
    } catch (error) {
      setStatus(errorMessage(error));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function discover(connection: IntegrationConnection) {
    setBusy(true);
    setStatus(`Testing ${connection.label} and discovering its devices...`);
    setConfirmed(false);
    try {
      await testIntegrationConnection(connection.id);
      const structure = await fetchIntegrationStructure(connection.id);
      setConnectionId(connection.id);
      setMappings(structure.suggestedMappings);
      setStatus(
        structure.suggestedMappings.length
          ? "Review every suggested space and zone. Nothing has been created yet."
          : "The connection worked, but the provider returned no devices to map."
      );
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function updateMapping(index: number, field: "roomName" | "zoneName", value: string) {
    setMappings((current) =>
      current.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, [field]: value } : mapping
      )
    );
    setConfirmed(false);
  }

  async function confirm() {
    if (!connectionId || !mappings.length) return;
    setBusy(true);
    try {
      const preview = await previewIntegrationMapping(connectionId, mappings);
      await confirmIntegrationMapping(connectionId, preview.mappings);
      setMappings(preview.mappings);
      setConfirmed(true);
      setStatus(
        `Reviewed ${preview.deviceCount} device${preview.deviceCount === 1 ? "" : "s"} across ${preview.roomCount} space${preview.roomCount === 1 ? "" : "s"}. Confirm below to create or update them.`
      );
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function build() {
    if (!confirmed || !connectionId || !targetRef || !workspaceScopeReady) return;
    setBusy(true);
    try {
      const result = await autoBuildIntegrationSpaces(connectionId, {
        mode,
        targetRef,
        targetType: "grow"
      });
      setStatus(
        `Created or updated ${result.createdOrUpdated} read-only grow space${result.createdOrUpdated === 1 ? "" : "s"}. Running this again will update the same spaces instead of duplicating them.`
      );
      setConfirmed(false);
      await load();
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function importHistory(connection: IntegrationConnection, days: number) {
    if (!targetRef || !canConfigure || !workspaceScopeReady) return;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setBusy(true);
    setStatus(`Importing ${days} days of ${connection.label} history...`);
    try {
      const summary = await importIntegrationHistory(connection.id, {
        mode,
        targetRef,
        targetType: "grow",
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
      });
      setStatus(
        summary.failures
          ? `Imported ${summary.ingested} new and ${summary.updated} updated readings; ${summary.failures} of ${summary.devices} devices need attention.`
          : `Imported ${summary.ingested} new and ${summary.updated} updated readings from ${summary.devices} device${summary.devices === 1 ? "" : "s"}.`
      );
      await load();
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" aria-level={2} style={styles.title}>
        Devices, rooms, and imported history
      </Text>
      <Text style={styles.body}>
        Connect a supported controller or monitor, discover its devices, review the room
        and zone mapping, then create read-only spaces for this grow. Imported readings
        keep their provider, device, timestamp, metric, and unit provenance.
      </Text>
      {!targetRef ? (
        <Text style={styles.warning}>
          Select or create a grow before connecting devices or importing history.
        </Text>
      ) : null}
      {mode === "facility" && !facilityId ? (
        <Text style={styles.warning}>
          Select a Facility before loading connections or changing grow mappings.
        </Text>
      ) : null}

      {canConfigure && targetRef && workspaceScopeReady && connectableProviders.length ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Add a controller or monitor</Text>
          <Text style={styles.body}>
            Choose the provider and enter the key or token issued to this customer.
            GrowPath encrypts it and starts read only.
          </Text>
          <View style={styles.providerChoices}>
            {connectableProviders.map((provider) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: selectedProviderId === provider.id }}
                key={provider.id}
                onPress={() => setSelectedProviderId(provider.id)}
                style={[
                  styles.providerChoice,
                  selectedProviderId === provider.id && styles.providerChoiceSelected
                ]}
              >
                <Text style={styles.secondaryButtonText}>{provider.name}</Text>
              </Pressable>
            ))}
          </View>
          {selectedProvider?.setupNote ? (
            <Text style={styles.body}>{selectedProvider.setupNote}</Text>
          ) : null}
          <TextInput
            accessibilityLabel={`${selectedProvider?.name || "Provider"} API key or token`}
            autoCapitalize="none"
            onChangeText={setCredential}
            placeholder="API key or token"
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            style={styles.input}
            value={credential}
          />
          <View style={styles.connectionActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy || !credential.trim() }}
              disabled={busy || !credential.trim()}
              onPress={() => void saveProviderConnection()}
              style={[
                styles.primaryButton,
                (busy || !credential.trim()) && styles.disabled
              ]}
            >
              <Text style={styles.primaryButtonText}>Save and test connection</Text>
            </Pressable>
            {selectedProvider?.requestUrl ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL(selectedProvider.requestUrl || "")}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Open provider API setup</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {spaces.length ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Connected grow spaces</Text>
          {spaces.map((space) => (
            <View key={space.id} style={styles.spaceRow}>
              <Text style={styles.spaceName}>
                {space.name}
                {space.zoneName ? ` / ${space.zoneName}` : ""}
              </Text>
              <Text style={styles.body}>
                {space.provider} · {space.devices.length} device
                {space.devices.length === 1 ? "" : "s"} · read only
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.subtitle}>Available connections</Text>
        {connections.length ? (
          connections.map((connection) => (
            <View key={connection.id} style={styles.connectionRow}>
              <View style={styles.connectionCopy}>
                <Text style={styles.spaceName}>{connection.label}</Text>
                <Text style={styles.body}>
                  {connection.provider} · {connection.status} · read only
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Discover devices from ${connection.label}`}
                accessibilityState={{ disabled: busy || !canConfigure || !targetRef }}
                disabled={busy || !canConfigure || !targetRef}
                onPress={() => void discover(connection)}
                style={[
                  styles.secondaryButton,
                  (busy || !canConfigure || !targetRef) && styles.disabled
                ]}
              >
                <Text style={styles.secondaryButtonText}>Discover devices</Text>
              </Pressable>
              {spaces.some((space) => space.connectionId === connection.id) ? (
                <View style={styles.historyActions}>
                  {[7, 30, 90].map((days) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Import the last ${days} days from ${connection.label}`}
                      accessibilityState={{ disabled: busy || !canConfigure }}
                      disabled={busy || !canConfigure}
                      key={days}
                      onPress={() => void importHistory(connection, days)}
                      style={[styles.secondaryButton, busy && styles.disabled]}
                    >
                      <Text style={styles.secondaryButtonText}>{days} day history</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.body}>
            No controller connection is saved yet. Add Pulse, ZENTRA, or UbiBot with the
            customer account key; save an issued TrolMaster key; or import an AC Infinity
            or Bluelab history export.
          </Text>
        )}
      </View>

      {mappings.length ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Review mapping</Text>
          {mappings.map((mapping, index) => (
            <View key={mapping.deviceId} style={styles.mappingRow}>
              <Text style={styles.spaceName}>{mapping.deviceName}</Text>
              <Text style={styles.body}>
                {mapping.metrics.join(", ") || "Provider metrics need manual review"}
              </Text>
              <TextInput
                accessibilityLabel={`Space name for ${mapping.deviceName}`}
                editable={!busy && canConfigure}
                onChangeText={(value) => updateMapping(index, "roomName", value)}
                placeholder="Room, tent, greenhouse, or outdoor area"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={mapping.roomName}
              />
              <TextInput
                accessibilityLabel={`Zone name for ${mapping.deviceName}`}
                editable={!busy && canConfigure}
                onChangeText={(value) => updateMapping(index, "zoneName", value)}
                placeholder="Optional zone"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={mapping.zoneName}
              />
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm reviewed grow space mappings"
            accessibilityState={{ disabled: busy || !canConfigure }}
            disabled={busy || !canConfigure}
            onPress={() => void confirm()}
            style={[styles.primaryButton, (busy || !canConfigure) && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>Review mapping summary</Text>
          </Pressable>
          {confirmed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create or update the confirmed grow spaces"
              accessibilityState={{ disabled: busy || !canConfigure }}
              disabled={busy || !canConfigure}
              onPress={() => void build()}
              style={[styles.primaryButton, (busy || !canConfigure) && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>Create / update grow spaces</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {status ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {status}
        </Text>
      ) : null}
      {!canConfigure ? (
        <Text style={styles.warning}>
          You can review connected data, but this workspace role cannot change device
          mappings.
        </Text>
      ) : null}
    </View>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      padding: 14
    },
    title: { color: palette.text, fontSize: 19, fontWeight: "900" },
    subtitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    body: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
    warning: { color: palette.warning, fontSize: 14, lineHeight: 20 },
    status: { color: palette.link, fontSize: 14, fontWeight: "700", lineHeight: 20 },
    section: { gap: 9 },
    providerChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    providerChoice: {
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    providerChoiceSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    connectionActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    spaceRow: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 3,
      padding: 11
    },
    spaceName: { color: palette.text, fontSize: 14, fontWeight: "800" },
    connectionRow: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
      padding: 11
    },
    connectionCopy: { flex: 1, minWidth: 180 },
    historyActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    mappingRow: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 7,
      padding: 11
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      color: palette.text,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.pill,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      borderColor: palette.accent,
      borderRadius: radius.pill,
      borderWidth: 1,
      minHeight: 42,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    disabled: { opacity: 0.5 }
  });
}
