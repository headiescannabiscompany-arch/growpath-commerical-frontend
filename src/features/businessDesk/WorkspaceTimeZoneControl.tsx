import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  businessDeskWorkspaceKey,
  getBusinessDeskWorkspaceTimeZone,
  normalizeIanaTimeZone,
  patchBusinessDeskWorkspaceTimeZone,
  type BusinessDeskWorkspace,
  type BusinessDeskWorkspaceTimeZone
} from "@/api/businessDesk";
import AppCard from "@/components/layout/AppCard";
import { LabeledInput } from "@/features/businessDesk/RecordFormControls";
import {
  resolveBusinessDeskRetryIdentity,
  type BusinessDeskRetryIdentity
} from "@/features/businessDesk/operationRetry";
import { newBusinessDeskOperationKey } from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type WorkspaceTimeZoneState = {
  value: BusinessDeskWorkspaceTimeZone | null;
  loading: boolean;
  loadError: Error | null;
  saving: boolean;
  saveError: Error | null;
  requiresReload: boolean;
  reload: () => Promise<void>;
  select: (timeZone: string) => Promise<BusinessDeskWorkspaceTimeZone>;
};

function errorCode(error: unknown) {
  return typeof (error as any)?.code === "string" ? String((error as any).code) : "";
}

function requiresAuthoritativeReload(error: unknown) {
  const code = errorCode(error);
  return (
    Number((error as any)?.status) === 403 ||
    code === "BUSINESS_DESK_WORKSPACE_SETTINGS_VERSION_CONFLICT" ||
    code === "BUSINESS_DESK_WORKSPACE_SETTINGS_IDEMPOTENCY_CONFLICT" ||
    code === "BUSINESS_DESK_WORKSPACE_ACCESS_CHANGED" ||
    code === "BUSINESS_DESK_TIME_ZONE_OWNER_REQUIRED"
  );
}

export function useBusinessDeskWorkspaceTimeZone(
  workspace: BusinessDeskWorkspace
): WorkspaceTimeZoneState {
  const workspaceType = workspace.workspaceType;
  const facilityId = workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, workspaceType]
  );
  const workspaceKey = businessDeskWorkspaceKey(stableWorkspace);
  const currentWorkspaceKey = useRef(workspaceKey);
  const loadRequest = useRef<{ epoch: number; controller: AbortController | null }>({
    epoch: 0,
    controller: null
  });
  const saveEpoch = useRef(0);
  const retryIdentity = useRef<BusinessDeskRetryIdentity | null>(null);
  const [state, setState] = useState<{
    workspaceKey: string;
    value: BusinessDeskWorkspaceTimeZone | null;
    loading: boolean;
    loadError: Error | null;
    saving: boolean;
    saveError: Error | null;
    requiresReload: boolean;
  }>({
    workspaceKey,
    value: null,
    loading: true,
    loadError: null,
    saving: false,
    saveError: null,
    requiresReload: false
  });
  currentWorkspaceKey.current = workspaceKey;

  const reload = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    const epoch = loadRequest.current.epoch + 1;
    loadRequest.current.controller?.abort();
    const controller =
      typeof AbortController === "undefined" ? null : new AbortController();
    loadRequest.current = { epoch, controller };
    setState((current) => ({
      ...current,
      workspaceKey: requestWorkspaceKey,
      value: null,
      loading: true,
      loadError: null,
      saveError: null,
      requiresReload: false
    }));
    try {
      const value = await getBusinessDeskWorkspaceTimeZone(stableWorkspace, {
        signal: controller?.signal
      });
      if (
        currentWorkspaceKey.current !== requestWorkspaceKey ||
        loadRequest.current.epoch !== epoch ||
        controller?.signal.aborted
      ) {
        return;
      }
      setState((current) => ({
        ...current,
        workspaceKey: requestWorkspaceKey,
        value,
        loading: false,
        loadError: null,
        requiresReload: false
      }));
    } catch (error) {
      if (
        currentWorkspaceKey.current === requestWorkspaceKey &&
        loadRequest.current.epoch === epoch &&
        !controller?.signal.aborted
      ) {
        setState((current) => ({
          ...current,
          workspaceKey: requestWorkspaceKey,
          value: null,
          loading: false,
          loadError:
            error instanceof Error
              ? error
              : new Error("The workspace time zone could not be loaded.")
        }));
      }
    }
  }, [stableWorkspace, workspaceKey]);

  useEffect(() => {
    void reload();
    return () => loadRequest.current.controller?.abort();
  }, [reload]);

  const select = useCallback(
    async (candidate: string) => {
      const current = state.workspaceKey === workspaceKey ? state.value : null;
      const timeZone = normalizeIanaTimeZone(candidate);
      if (!current || state.loading || state.loadError) {
        throw new Error("Reload the authoritative workspace time zone before saving.");
      }
      if (!timeZone) throw new Error("Choose a valid IANA workspace time zone.");
      const requestWorkspaceKey = workspaceKey;
      const epoch = saveEpoch.current + 1;
      saveEpoch.current = epoch;
      retryIdentity.current = resolveBusinessDeskRetryIdentity(
        retryIdentity.current,
        {
          operation: "select_workspace_time_zone",
          workspaceKey: requestWorkspaceKey,
          timeZone,
          expectedVersion: current.version
        },
        () => newBusinessDeskOperationKey("workspace-time-zone")
      );
      setState((latest) => ({
        ...latest,
        saving: true,
        saveError: null
      }));
      try {
        const selected = await patchBusinessDeskWorkspaceTimeZone(stableWorkspace, {
          timeZone,
          expectedVersion: current.version,
          idempotencyKey: retryIdentity.current.key
        });
        if (
          currentWorkspaceKey.current !== requestWorkspaceKey ||
          saveEpoch.current !== epoch
        ) {
          throw new Error(
            "The selected workspace changed. The time-zone response was discarded."
          );
        }
        retryIdentity.current = null;
        setState((latest) => ({
          ...latest,
          value: selected,
          saving: false,
          saveError: null,
          requiresReload: false
        }));
        return selected;
      } catch (error) {
        const normalized =
          error instanceof Error
            ? error
            : new Error("The workspace time zone could not be saved.");
        if (
          currentWorkspaceKey.current === requestWorkspaceKey &&
          saveEpoch.current === epoch
        ) {
          setState((latest) => ({
            ...latest,
            saving: false,
            saveError: normalized,
            requiresReload: requiresAuthoritativeReload(normalized)
          }));
        }
        throw normalized;
      }
    },
    [
      stableWorkspace,
      state.loadError,
      state.loading,
      state.value,
      state.workspaceKey,
      workspaceKey
    ]
  );

  const visible = state.workspaceKey === workspaceKey ? state : null;
  return {
    value: visible?.value || null,
    loading: visible?.loading ?? true,
    loadError: visible?.loadError || null,
    saving: visible?.saving ?? false,
    saveError: visible?.saveError || null,
    requiresReload: visible?.requiresReload ?? false,
    reload,
    select
  };
}

type WorkspaceTimeZoneControlProps = {
  state: WorkspaceTimeZoneState;
  workspaceLabel: "Commercial" | "Facility";
  canConfigure: boolean;
  onSelected?: (
    next: BusinessDeskWorkspaceTimeZone,
    previous: BusinessDeskWorkspaceTimeZone
  ) => void;
};

export function WorkspaceTimeZoneControl({
  state,
  workspaceLabel,
  canConfigure,
  onSelected
}: WorkspaceTimeZoneControlProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setDraft(state.value?.timeZone || "");
  }, [state.value?.timeZone, state.value?.version]);

  useEffect(() => {
    setFeedback("");
  }, [state.value?.workspaceId, state.value?.workspaceType]);

  const save = async () => {
    setFeedback("");
    const previous = state.value;
    if (!previous) return;
    try {
      const next = await state.select(draft);
      onSelected?.(next, previous);
      setFeedback(
        `${workspaceLabel} time zone saved as ${next.timeZone}, version ${next.version}.`
      );
    } catch {
      // The hook retains the exact server/transport error and retry identity.
    }
  };

  return (
    <AppCard
      title="Workspace time zone"
      titleLevel={2}
      subtitle="Cash-flow boundaries and job schedules use this server-authoritative IANA setting, never the browser, device, or Facility profile time zone."
    >
      {state.loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.body}>Loading authoritative workspace time zone…</Text>
        </View>
      ) : state.loadError ? (
        <View style={styles.stack}>
          <Text style={styles.error}>{state.loadError.message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry workspace time zone load"
            onPress={() => void state.reload()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Retry load</Text>
          </Pressable>
        </View>
      ) : state.value ? (
        <View style={styles.stack}>
          <Text style={state.value.configured ? styles.body : styles.warning}>
            {state.value.configured
              ? `Authoritative setting: ${state.value.timeZone} · version ${state.value.version}`
              : "No workspace time zone is configured. Time-sensitive calculations and writes are blocked."}
          </Text>
          {canConfigure && !state.requiresReload ? (
            <View style={styles.stack}>
              <LabeledInput
                label="IANA workspace time zone"
                accessibilityLabel="IANA workspace time zone"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
                value={draft}
                onChangeText={(value) => {
                  setDraft(value);
                  setFeedback("");
                }}
                placeholder="America/New_York"
                hint={`Saving uses expected version ${state.value.version}. Retrying this unchanged request reuses one idempotency key.`}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save workspace time zone"
                accessibilityState={{ busy: state.saving, disabled: state.saving }}
                disabled={state.saving}
                onPress={() => void save()}
                style={[styles.primaryButton, state.saving && styles.disabled]}
              >
                {state.saving ? (
                  <ActivityIndicator color={palette.accentText} />
                ) : (
                  <Text style={styles.primaryText}>Save workspace time zone</Text>
                )}
              </Pressable>
            </View>
          ) : !canConfigure ? (
            <Text style={styles.body}>
              Only the current{" "}
              {workspaceLabel === "Facility" ? "Facility owner" : "workspace owner"} can
              change this setting. This role may read it but never configure it.
            </Text>
          ) : null}
          {state.saveError ? (
            <Text style={styles.error}>{state.saveError.message}</Text>
          ) : null}
          {state.requiresReload ? (
            <View style={styles.stack}>
              <Text style={styles.warning}>
                The setting or your access changed. Reload the authoritative version
                before trying another write.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reload authoritative workspace time zone"
                onPress={() => void state.reload()}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Reload authoritative setting</Text>
              </Pressable>
            </View>
          ) : null}
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              {feedback}
            </Text>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

export function workspaceTimeZoneReady(state: WorkspaceTimeZoneState) {
  return Boolean(
    !state.loading &&
    !state.loadError &&
    !state.requiresReload &&
    state.value?.configured &&
    state.value.timeZone &&
    state.value.version >= 1
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    body: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    disabled: { opacity: 0.6 },
    error: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedback: { color: palette.success, fontSize: 13, fontWeight: "800" },
    primaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: 10,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 16
    },
    primaryText: { color: palette.accentText, fontSize: 14, fontWeight: "900" },
    row: { alignItems: "center", flexDirection: "row", gap: 10 },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    stack: { gap: 10 },
    warning: { color: palette.warning, fontSize: 13, fontWeight: "800", lineHeight: 19 }
  });
}
