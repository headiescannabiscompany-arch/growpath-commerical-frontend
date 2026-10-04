import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useAuth } from "@/auth/AuthContext";
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
  canConfigure = true,
  onBusyChange,
  unavailableReason
}: {
  mode: WorkspaceMode;
  targetRef: string;
  facilityId?: string;
  canConfigure?: boolean;
  onBusyChange?: (busy: boolean) => void;
  unavailableReason?: string;
}) {
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [spaces, setSpaces] = useState<IntegrationGrowSpace[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const connectionIdRef = useRef(connectionId);
  connectionIdRef.current = connectionId;
  const [mappings, setMappings] = useState<IntegrationDeviceMapping[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusyState] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const selectedProviderRef = useRef(selectedProviderId);
  selectedProviderRef.current = selectedProviderId;
  const [credential, setCredential] = useState("");
  const [readState, setReadState] = useState<"loading" | "ready" | "error">("loading");
  const [readError, setReadError] = useState("");
  const accountId = auth.user?.id || auth.user?._id;
  const context = useMemo(
    () => ({
      mode,
      targetRef,
      facilityId,
      canConfigure,
      accountId,
      session: auth.token,
      isHydrating: auth.isHydrating,
      isAuthed: auth.isAuthed
    }),
    [
      mode,
      targetRef,
      facilityId,
      canConfigure,
      accountId,
      auth.token,
      auth.isHydrating,
      auth.isAuthed
    ]
  );
  const [snapshotContext, setSnapshotContext] = useState<typeof context | null>(null);
  const currentContextRef = useRef(context);
  currentContextRef.current = context;
  const mountedRef = useRef(false);
  const readLockRef = useRef<object | null>(null);
  const operationRef = useRef<object | null>(null);
  const readyContextRef = useRef<typeof context | null>(null);
  const actionGenerationRef = useRef(0);
  const actionGeneration = actionGenerationRef.current;
  const busyCallbackRef = useRef(onBusyChange);
  busyCallbackRef.current = onBusyChange;
  const workspaceScope = useMemo(
    () => ({
      workspaceType: mode,
      ...(mode === "facility" && facilityId ? { facilityId } : {})
    }),
    [facilityId, mode]
  );
  const workspaceScopeReady = mode !== "facility" || Boolean(facilityId);
  const sessionReady = Boolean(
    accountId && auth.token && auth.isAuthed && !auth.isHydrating
  );
  const canRead = Boolean(targetRef && workspaceScopeReady && sessionReady);
  const isCurrent = useCallback(
    () => mountedRef.current && currentContextRef.current === context,
    [context]
  );
  const isOperationCurrent = (operation: object) =>
    isCurrent() && operationRef.current === operation;
  const setBusy = (value: boolean) => {
    setBusyState(value);
    busyCallbackRef.current?.(value);
  };

  const load = useCallback(
    async (operation?: object) => {
      // Check the captured context before touching shared locks: an old handler must
      // not invalidate a newer workspace's in-flight read.
      if (
        !isCurrent() ||
        !canRead ||
        readLockRef.current ||
        (operation ? operationRef.current !== operation : operationRef.current)
      )
        return;
      const read = {};
      readLockRef.current = read;
      readyContextRef.current = null;
      actionGenerationRef.current += 1;
      setReadState("loading");
      setReadError("");
      setConfirmed(false);
      busyCallbackRef.current?.(true);
      const readIsCurrent = () => isCurrent() && readLockRef.current === read;
      try {
        const [connectionRows, spaceRows, providerRows] = await Promise.all([
          listIntegrationConnections(workspaceScope),
          listIntegrationSpaces({ ...workspaceScope, targetRef, targetType: "grow" }),
          listIntegrationProviders()
        ]);
        if (!readIsCurrent()) return;
        if (
          !Array.isArray(connectionRows) ||
          !Array.isArray(spaceRows) ||
          !Array.isArray(providerRows)
        ) {
          throw new Error(
            "Integration data is unavailable. Retry to verify the saved records."
          );
        }
        setConnections(connectionRows);
        setSpaces(spaceRows);
        setProviders(providerRows);
        if (
          connectionIdRef.current &&
          !connectionRows.some((row) => row.id === connectionIdRef.current)
        ) {
          setConnectionId("");
          setMappings([]);
        }
        const connectable = providerRows.filter(
          (provider) =>
            provider.contractStatus === "implemented" || provider.credentialRequired
        );
        const nextProviderId = connectable.some(
          (provider) => provider.id === selectedProviderRef.current
        )
          ? selectedProviderRef.current
          : connectable[0]?.id || "";
        if (nextProviderId !== selectedProviderRef.current) setCredential("");
        setSelectedProviderId(nextProviderId);
        setSnapshotContext(context);
        readyContextRef.current = context;
        setReadState("ready");
      } catch (error) {
        if (!readIsCurrent()) return;
        setReadError(errorMessage(error));
        setReadState("error");
      } finally {
        if (readIsCurrent()) {
          readLockRef.current = null;
          if (!operationRef.current) busyCallbackRef.current?.(false);
        }
      }
    },
    [canRead, context, isCurrent, targetRef, workspaceScope]
  );

  useEffect(() => {
    mountedRef.current = true;
    readLockRef.current = null;
    operationRef.current = null;
    readyContextRef.current = null;
    actionGenerationRef.current += 1;
    setConnections([]);
    setProviders([]);
    setSpaces([]);
    setSnapshotContext(null);
    setConnectionId("");
    setMappings([]);
    setConfirmed(false);
    setCredential("");
    setSelectedProviderId("");
    setStatus("");
    setReadError("");
    setReadState("loading");
    setBusyState(false);
    busyCallbackRef.current?.(false);
    void load();
    return () => {
      mountedRef.current = false;
      readLockRef.current = null;
      operationRef.current = null;
      readyContextRef.current = null;
      actionGenerationRef.current += 1;
      busyCallbackRef.current?.(false);
    };
  }, [load]);

  const hasSnapshot = snapshotContext === context;
  const visibleConnections = hasSnapshot ? connections : [];
  const visibleSpaces = hasSnapshot ? spaces : [];
  const connectableProviders = (hasSnapshot ? providers : []).filter(
    (provider) => provider.contractStatus === "implemented" || provider.credentialRequired
  );
  const selectedProvider = connectableProviders.find(
    (provider) => provider.id === selectedProviderId
  );
  const recordsReady = canRead && hasSnapshot && readState === "ready";
  const controlsDisabled = busy || !canConfigure || !recordsReady;
  const canAct = () =>
    isCurrent() &&
    canRead &&
    canConfigure &&
    readyContextRef.current === context &&
    !readLockRef.current &&
    !operationRef.current &&
    actionGeneration === actionGenerationRef.current;
  const beginOperation = () => {
    if (!canAct()) return null;
    const operation = {};
    operationRef.current = operation;
    actionGenerationRef.current += 1;
    setBusy(true);
    return operation;
  };
  const finishOperation = (operation: object) => {
    if (!isOperationCurrent(operation)) return;
    operationRef.current = null;
    setBusy(false);
  };

  async function saveProviderConnection() {
    if (!selectedProvider || !credential.trim() || !canAct()) return;
    const operation = beginOperation();
    if (!operation) return;
    let saved = false;
    setStatus(`Saving ${selectedProvider.name} connection...`);
    try {
      const connection = await createIntegrationConnection({
        provider: selectedProvider.id,
        label: selectedProvider.name,
        credentials: { apiKey: credential.trim() },
        workspaceType: mode,
        ...(mode === "facility" && facilityId ? { facilityId } : {}),
        config: mode === "facility" && facilityId ? { facilityId } : undefined
      });
      if (!isOperationCurrent(operation)) return;
      saved = true;
      setCredential("");
      setConnections((rows) => [
        connection,
        ...rows.filter((row) => row.id !== connection.id)
      ]);
      if (selectedProvider.contractStatus === "implemented") {
        const tested = await testIntegrationConnection(connection.id);
        if (!isOperationCurrent(operation)) return;
        if (tested.id !== connection.id)
          throw new Error(
            "Connection test returned an unavailable record. Retry to verify the saved connection."
          );
        setConnections((rows) => [tested, ...rows.filter((row) => row.id !== tested.id)]);
        setStatus(
          tested.status === "connected"
            ? `${selectedProvider.name} connected. Discover its devices below, then review every space mapping before creating anything.`
            : `${selectedProvider.name} key saved securely, but the connection test did not confirm a connected state. Review its status before discovering devices.`
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
      if (!isOperationCurrent(operation)) return;
      setStatus(
        saved
          ? `Key saved securely, but connection verification failed. ${errorMessage(error)}`
          : errorMessage(error)
      );
      await load(operation);
    } finally {
      finishOperation(operation);
    }
  }

  async function discover(connection: IntegrationConnection) {
    if (!visibleConnections.some((row) => row.id === connection.id)) return;
    const operation = beginOperation();
    if (!operation) return;
    setStatus(`Testing ${connection.label} and discovering its devices...`);
    setConfirmed(false);
    setConnectionId("");
    setMappings([]);
    try {
      const tested = await testIntegrationConnection(connection.id);
      if (!isOperationCurrent(operation)) return;
      if (tested.id !== connection.id)
        throw new Error(
          "Connection test returned an unavailable record. Retry to verify the saved connection."
        );
      setConnections((rows) => [tested, ...rows.filter((row) => row.id !== tested.id)]);
      if (tested.status !== "connected") {
        setStatus(
          "Connection testing did not confirm a connected state. No devices were discovered; review the connection status and try again."
        );
        return;
      }
      const structure = await fetchIntegrationStructure(connection.id);
      if (!isOperationCurrent(operation)) return;
      setConnectionId(connection.id);
      setMappings(structure.suggestedMappings);
      setStatus(
        structure.suggestedMappings.length
          ? "Review every suggested space and zone. Nothing has been created yet."
          : "The connection worked, but the provider returned no devices to map."
      );
    } catch (error) {
      if (!isOperationCurrent(operation)) return;
      setStatus(errorMessage(error));
    } finally {
      finishOperation(operation);
    }
  }

  function updateMapping(index: number, field: "roomName" | "zoneName", value: string) {
    if (!canAct()) return;
    actionGenerationRef.current += 1;
    setMappings((current) =>
      current.map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, [field]: value } : mapping
      )
    );
    setConfirmed(false);
  }

  async function confirm() {
    if (
      !connectionId ||
      !mappings.length ||
      !visibleConnections.some((connection) => connection.id === connectionId)
    )
      return;
    const operation = beginOperation();
    if (!operation) return;
    setConfirmed(false);
    setStatus("Reviewing grow space mappings...");
    try {
      const preview = await previewIntegrationMapping(connectionId, mappings);
      if (!isOperationCurrent(operation)) return;
      await confirmIntegrationMapping(connectionId, preview.mappings);
      if (!isOperationCurrent(operation)) return;
      setMappings(preview.mappings);
      setConfirmed(true);
      setStatus(
        `Reviewed ${preview.deviceCount} device${preview.deviceCount === 1 ? "" : "s"} across ${preview.roomCount} space${preview.roomCount === 1 ? "" : "s"}. Confirm below to create or update them.`
      );
    } catch (error) {
      if (!isOperationCurrent(operation)) return;
      setStatus(errorMessage(error));
    } finally {
      finishOperation(operation);
    }
  }

  async function build() {
    if (
      !confirmed ||
      !connectionId ||
      !visibleConnections.some((connection) => connection.id === connectionId)
    )
      return;
    const operation = beginOperation();
    if (!operation) return;
    setStatus("Creating or updating reviewed grow spaces...");
    try {
      const result = await autoBuildIntegrationSpaces(connectionId, {
        mode,
        targetRef,
        targetType: "grow"
      });
      if (!isOperationCurrent(operation)) return;
      setStatus(
        `Created or updated ${result.createdOrUpdated} read-only grow space${result.createdOrUpdated === 1 ? "" : "s"}. Running this again will update the same spaces instead of duplicating them.`
      );
      setConfirmed(false);
      await load(operation);
    } catch (error) {
      if (!isOperationCurrent(operation)) return;
      setStatus(errorMessage(error));
    } finally {
      finishOperation(operation);
    }
  }

  async function importHistory(connection: IntegrationConnection, days: number) {
    if (
      !visibleConnections.some((row) => row.id === connection.id) ||
      !visibleSpaces.some((space) => space.connectionId === connection.id)
    )
      return;
    const operation = beginOperation();
    if (!operation) return;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
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
      if (!isOperationCurrent(operation)) return;
      setStatus(
        summary.failures
          ? `Imported ${summary.ingested} new and ${summary.updated} updated readings; ${summary.failures} of ${summary.devices} devices need attention.`
          : `Imported ${summary.ingested} new and ${summary.updated} updated readings from ${summary.devices} device${summary.devices === 1 ? "" : "s"}.`
      );
      await load(operation);
    } catch (error) {
      if (!isOperationCurrent(operation)) return;
      setStatus(errorMessage(error));
    } finally {
      finishOperation(operation);
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
      {!sessionReady ? (
        <Text style={styles.warning}>
          Sign in and wait for your workspace to load before viewing integration data.
        </Text>
      ) : null}

      {canRead ? (
        <View style={styles.section}>
          {readState === "loading" ? (
            <Text accessibilityLiveRegion="polite" style={styles.body}>
              {hasSnapshot
                ? "Refreshing integrations… Previously loaded data is shown until verification finishes."
                : "Loading integration connections, providers, and grow spaces…"}
            </Text>
          ) : null}
          {readState === "error" ? (
            <>
              <Text accessibilityRole="alert" style={styles.warning}>
                {hasSnapshot
                  ? "Previously loaded integration data is shown. Setup, mapping, and history actions are paused until Retry succeeds."
                  : "Integration data is unavailable. Retry to verify connections, providers, and grow spaces."}
              </Text>
              <Text style={styles.warning}>{readError}</Text>
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || readState === "loading" }}
            disabled={busy || readState === "loading"}
            onPress={() => void load()}
            style={[
              styles.secondaryButton,
              (busy || readState === "loading") && styles.disabled
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {readState === "error" ? "Retry integrations" : "Refresh integrations"}
            </Text>
          </Pressable>
        </View>
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
                accessibilityState={{
                  selected: selectedProviderId === provider.id,
                  disabled: controlsDisabled
                }}
                disabled={controlsDisabled}
                key={provider.id}
                onPress={() => {
                  if (!canAct() || selectedProviderId === provider.id) return;
                  actionGenerationRef.current += 1;
                  setSelectedProviderId(provider.id);
                  setCredential("");
                }}
                style={[
                  styles.providerChoice,
                  selectedProviderId === provider.id && styles.providerChoiceSelected,
                  controlsDisabled && styles.disabled
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
            editable={!controlsDisabled}
            onChangeText={(value) => {
              if (!canAct() || value === credential) return;
              actionGenerationRef.current += 1;
              setCredential(value);
            }}
            placeholder="API key or token"
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            style={styles.input}
            value={credential}
          />
          <View style={styles.connectionActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: controlsDisabled || !credential.trim() }}
              disabled={controlsDisabled || !credential.trim()}
              onPress={() => void saveProviderConnection()}
              style={[
                styles.primaryButton,
                (controlsDisabled || !credential.trim()) && styles.disabled
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

      {visibleSpaces.length ? (
        <View style={styles.section}>
          <Text style={styles.subtitle}>Connected grow spaces</Text>
          {visibleSpaces.map((space) => (
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
        {visibleConnections.length ? (
          visibleConnections.map((connection) => (
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
                accessibilityState={{ disabled: controlsDisabled }}
                disabled={controlsDisabled}
                onPress={() => void discover(connection)}
                style={[styles.secondaryButton, controlsDisabled && styles.disabled]}
              >
                <Text style={styles.secondaryButtonText}>Discover devices</Text>
              </Pressable>
              {visibleSpaces.some((space) => space.connectionId === connection.id) ? (
                <View style={styles.historyActions}>
                  {[7, 30, 90].map((days) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Import the last ${days} days from ${connection.label}`}
                      accessibilityState={{ disabled: controlsDisabled }}
                      disabled={controlsDisabled}
                      key={days}
                      onPress={() => void importHistory(connection, days)}
                      style={[
                        styles.secondaryButton,
                        controlsDisabled && styles.disabled
                      ]}
                    >
                      <Text style={styles.secondaryButtonText}>{days} day history</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        ) : recordsReady ? (
          <Text style={styles.body}>
            No controller connection is saved yet. Add Pulse, ZENTRA, or UbiBot with the
            customer account key; save an issued TrolMaster key; or import an AC Infinity
            or Bluelab history export.
          </Text>
        ) : null}
      </View>

      {hasSnapshot && mappings.length ? (
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
                editable={!controlsDisabled}
                onChangeText={(value) => updateMapping(index, "roomName", value)}
                placeholder="Room, tent, greenhouse, or outdoor area"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={mapping.roomName}
              />
              <TextInput
                accessibilityLabel={`Zone name for ${mapping.deviceName}`}
                editable={!controlsDisabled}
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
            accessibilityState={{ disabled: controlsDisabled }}
            disabled={controlsDisabled}
            onPress={() => void confirm()}
            style={[styles.primaryButton, controlsDisabled && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>Review mapping summary</Text>
          </Pressable>
          {confirmed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create or update the confirmed grow spaces"
              accessibilityState={{ disabled: controlsDisabled }}
              disabled={controlsDisabled}
              onPress={() => void build()}
              style={[styles.primaryButton, controlsDisabled && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>Create / update grow spaces</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {hasSnapshot && status ? (
        <Text accessibilityLiveRegion="polite" style={styles.status}>
          {status}
        </Text>
      ) : null}
      {!canConfigure ? (
        <Text style={styles.warning}>
          {unavailableReason ||
            "You can review connected data, but this workspace role cannot change device mappings."}
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
