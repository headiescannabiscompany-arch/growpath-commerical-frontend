import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  cancelBusinessDeskProviderOperation,
  getBusinessDeskProviderCapabilities,
  getBusinessDeskProviderOperation,
  listBusinessDeskProviderOperations,
  type BusinessDeskProviderCapabilities,
  type BusinessDeskProviderOperation,
  type BusinessDeskProviderOperationKind,
  type BusinessDeskProviderOperationPacket,
  type BusinessDeskProviderResult
} from "@/api/businessDeskProvider";
import { ApiError } from "@/api/apiRequest";
import { businessDeskWorkspaceKey, type BusinessDeskWorkspace } from "@/api/businessDesk";
import { useOptionalAuth } from "@/auth/AuthContext";
import {
  businessDeskProviderPersistenceScopeKey,
  forgetPersistedProviderIdentity,
  getOrCreatePersistedProviderIdentity,
  loadLatestPersistedProviderOperation,
  rememberPersistedProviderOperation,
  type BusinessDeskProviderOperationSlot,
  type PersistedBusinessDeskOperation
} from "@/features/businessDesk/providerOperationPersistence";

type CapabilityState = {
  workspaceKey: string;
  loading: boolean;
  value: BusinessDeskProviderCapabilities | null;
  error: Error | null;
};

export function useBusinessDeskProviderCapabilities(workspace: BusinessDeskWorkspace) {
  const auth = useOptionalAuth();
  const routeWorkspaceKey = businessDeskWorkspaceKey(workspace);
  const accountId = String(auth?.user?.id || auth?.user?._id || "");
  const facilityRole =
    workspace.workspaceType === "facility"
      ? String(auth?.ctx?.facilityRole || "UNKNOWN").toUpperCase()
      : "";
  const accountSubject = facilityRole
    ? `${accountId}:facility-role:${facilityRole}`
    : accountId;
  const persistenceScopeKey = businessDeskProviderPersistenceScopeKey(
    accountSubject,
    routeWorkspaceKey
  );
  const workspaceKey = persistenceScopeKey || `unscoped:${routeWorkspaceKey}`;
  const facilityId = workspace.workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspace.workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, workspace.workspaceType]
  );
  const activeWorkspaceKey = useRef(workspaceKey);
  useLayoutEffect(() => {
    activeWorkspaceKey.current = workspaceKey;
  }, [workspaceKey]);
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<CapabilityState>({
    workspaceKey,
    loading: true,
    value: null,
    error: null
  });

  const load = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setState({
      workspaceKey: requestWorkspaceKey,
      loading: true,
      value: null,
      error: null
    });
    try {
      const value = await getBusinessDeskProviderCapabilities(stableWorkspace, {
        signal: nextController.signal
      });
      if (
        activeWorkspaceKey.current === requestWorkspaceKey &&
        !nextController.signal.aborted
      ) {
        setState({
          workspaceKey: requestWorkspaceKey,
          loading: false,
          value,
          error: null
        });
      }
    } catch (error) {
      if (
        activeWorkspaceKey.current === requestWorkspaceKey &&
        !nextController.signal.aborted
      ) {
        setState({
          workspaceKey: requestWorkspaceKey,
          loading: false,
          value: null,
          error:
            error instanceof Error
              ? error
              : new Error("Business Desk AI availability could not be checked.")
        });
      }
    }
  }, [stableWorkspace, workspaceKey]);

  useLayoutEffect(() => {
    void load();
    return () => controller.current?.abort();
  }, [load]);

  const active = state.workspaceKey === workspaceKey ? state : null;
  return {
    capabilities: active?.value || null,
    loading: active?.loading ?? true,
    error: active?.error || null,
    reload: load
  };
}

type OperationBusy = "restoring" | "starting" | "refreshing" | "canceling" | null;

type OperationState<TResult extends BusinessDeskProviderResult> = {
  workspaceKey: string;
  operation: BusinessDeskProviderOperation<TResult> | null;
  busy: OperationBusy;
  error: Error | null;
  notice: string;
  autoPoll: boolean;
};

export function useBusinessDeskProviderOperation<
  TResult extends BusinessDeskProviderResult
>(input: {
  workspace: BusinessDeskWorkspace;
  kind: BusinessDeskProviderOperationKind;
  slot: Exclude<BusinessDeskProviderOperationSlot, "expense_receipt_apply">;
  keyPrefix: string;
}) {
  const auth = useOptionalAuth();
  const routeWorkspaceKey = businessDeskWorkspaceKey(input.workspace);
  const accountId = String(auth?.user?.id || auth?.user?._id || "");
  const facilityRole =
    input.workspace.workspaceType === "facility"
      ? String(auth?.ctx?.facilityRole || "UNKNOWN").toUpperCase()
      : "";
  const accountSubject = facilityRole
    ? `${accountId}:facility-role:${facilityRole}`
    : accountId;
  const persistenceScopeKey = businessDeskProviderPersistenceScopeKey(
    accountSubject,
    routeWorkspaceKey
  );
  const workspaceKey = persistenceScopeKey || `unscoped:${routeWorkspaceKey}`;
  const facilityId =
    input.workspace.workspaceType === "facility" ? input.workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      input.workspace.workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, input.workspace.workspaceType]
  );
  const activeWorkspaceKey = useRef(workspaceKey);
  useLayoutEffect(() => {
    activeWorkspaceKey.current = workspaceKey;
  }, [workspaceKey]);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const identity = useRef<PersistedBusinessDeskOperation | null>(null);
  const [state, setState] = useState<OperationState<TResult>>({
    workspaceKey,
    operation: null,
    busy: null,
    error: null,
    notice: "",
    autoPoll: false
  });

  const begin = useCallback(() => {
    generation.current += 1;
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    return { generation: generation.current, controller: next };
  }, []);

  const isCurrent = useCallback(
    (requestWorkspaceKey: string, requestGeneration: number) =>
      activeWorkspaceKey.current === requestWorkspaceKey &&
      generation.current === requestGeneration,
    []
  );

  const acceptPacket = useCallback(
    async (
      packet: BusinessDeskProviderOperationPacket<TResult>,
      operationIdentity: PersistedBusinessDeskOperation | null,
      requestWorkspaceKey: string,
      requestGeneration: number,
      notice: string
    ) => {
      if (!isCurrent(requestWorkspaceKey, requestGeneration)) return;
      let persistenceNotice = "";
      if (operationIdentity) {
        try {
          const persistedIdentity = await rememberPersistedProviderOperation(
            operationIdentity,
            packet.operation.id
          );
          if (isCurrent(requestWorkspaceKey, requestGeneration)) {
            identity.current = persistedIdentity;
          }
        } catch {
          persistenceNotice =
            " This operation is active, but its safe retry metadata could not be retained on this device.";
        }
      }
      if (!isCurrent(requestWorkspaceKey, requestGeneration)) return;
      const inProgress = ["queued", "processing"].includes(packet.operation.state);
      setState({
        workspaceKey: requestWorkspaceKey,
        operation: packet.operation,
        busy: null,
        error: null,
        notice: `${notice}${
          packet.idempotentReplay === true
            ? " The server recovered the same operation."
            : ""
        }${persistenceNotice}`.trim(),
        autoPoll: inProgress
      });
    },
    [isCurrent]
  );

  useEffect(() => {
    const requestWorkspaceKey = workspaceKey;
    const { generation: requestGeneration, controller: requestController } = begin();
    identity.current = null;
    setState({
      workspaceKey: requestWorkspaceKey,
      operation: null,
      busy: persistenceScopeKey ? "restoring" : null,
      error: null,
      notice: "",
      autoPoll: false
    });
    if (!persistenceScopeKey) return () => requestController.abort();
    void (async () => {
      const persisted = await loadLatestPersistedProviderOperation(
        persistenceScopeKey,
        input.slot
      );
      if (!isCurrent(requestWorkspaceKey, requestGeneration)) return;
      if (!persisted?.operationId) {
        setState((current) => ({ ...current, busy: null }));
        return;
      }
      identity.current = persisted;
      try {
        const packet = await getBusinessDeskProviderOperation<TResult>(
          stableWorkspace,
          persisted.operationId,
          input.kind,
          { signal: requestController.signal }
        );
        await acceptPacket(
          packet,
          persisted,
          requestWorkspaceKey,
          requestGeneration,
          "Recovered a previously submitted operation for this signed-in account and workspace. Verify that its source boundary matches the current draft before relying on it."
        );
      } catch (error) {
        const unavailable =
          error instanceof ApiError && (error.status === 403 || error.status === 404);
        if (unavailable) {
          await forgetPersistedProviderIdentity(
            persisted.scopeKey,
            persisted.slot,
            persisted.signatureSha256
          );
        }
        if (isCurrent(requestWorkspaceKey, requestGeneration)) {
          setState({
            workspaceKey: requestWorkspaceKey,
            operation: null,
            busy: null,
            error: unavailable
              ? null
              : error instanceof Error
                ? error
                : new Error(
                    "The saved Business Desk AI operation could not be restored."
                  ),
            notice: unavailable
              ? "A saved operation is no longer available to this account and workspace. Its local retry metadata was removed."
              : "The saved operation remains available for a later status retry.",
            autoPoll: false
          });
        }
      }
    })();
    return () => requestController.abort();
  }, [
    acceptPacket,
    begin,
    input.kind,
    input.slot,
    isCurrent,
    persistenceScopeKey,
    stableWorkspace,
    workspaceKey
  ]);

  const start = useCallback(
    async (
      signature: string,
      submit: (
        clientOperationKey: string,
        signal: AbortSignal
      ) => Promise<BusinessDeskProviderOperationPacket<TResult>>
    ) => {
      const requestWorkspaceKey = workspaceKey;
      const { generation: requestGeneration, controller: requestController } = begin();
      setState((current) => ({
        ...(current.workspaceKey === requestWorkspaceKey
          ? current
          : {
              workspaceKey: requestWorkspaceKey,
              operation: null,
              notice: "",
              autoPoll: false
            }),
        workspaceKey: requestWorkspaceKey,
        busy: "starting",
        error: null,
        notice: "",
        autoPoll: false
      }));
      try {
        if (!persistenceScopeKey) {
          throw new Error("Sign in again before starting a provider-backed request.");
        }
        const operationIdentity = await getOrCreatePersistedProviderIdentity({
          scopeKey: persistenceScopeKey,
          slot: input.slot,
          signature,
          keyPrefix: input.keyPrefix
        });
        if (
          !isCurrent(requestWorkspaceKey, requestGeneration) ||
          requestController.signal.aborted
        ) {
          return null;
        }
        identity.current = operationIdentity;
        const packet = await submit(
          operationIdentity.clientOperationKey,
          requestController.signal
        );
        await acceptPacket(
          packet,
          operationIdentity,
          requestWorkspaceKey,
          requestGeneration,
          "The provider request was accepted."
        );
        return packet.operation;
      } catch (error) {
        const currentRequest = isCurrent(requestWorkspaceKey, requestGeneration);
        if (currentRequest) {
          setState((current) => ({
            ...current,
            busy: null,
            error:
              error instanceof Error
                ? error
                : new Error("The Business Desk AI request could not be started."),
            autoPoll: false
          }));
        }
        if (currentRequest) throw error;
        return null;
      }
    },
    [
      acceptPacket,
      begin,
      input.keyPrefix,
      input.slot,
      isCurrent,
      persistenceScopeKey,
      workspaceKey
    ]
  );

  const refresh = useCallback(
    async (automatic = false) => {
      const requestWorkspaceKey = workspaceKey;
      const active = state.workspaceKey === requestWorkspaceKey ? state.operation : null;
      if (!active) return null;
      const { generation: requestGeneration, controller: requestController } = begin();
      setState((current) => ({
        ...current,
        busy: automatic ? current.busy : "refreshing",
        error: null
      }));
      try {
        const packet = await getBusinessDeskProviderOperation<TResult>(
          stableWorkspace,
          active.id,
          input.kind,
          { signal: requestController.signal }
        );
        await acceptPacket(
          packet,
          identity.current,
          requestWorkspaceKey,
          requestGeneration,
          automatic ? "" : "Provider status refreshed."
        );
        return packet.operation;
      } catch (error) {
        if (isCurrent(requestWorkspaceKey, requestGeneration)) {
          setState((current) => ({
            ...current,
            busy: null,
            error:
              error instanceof Error
                ? error
                : new Error("The Business Desk AI status could not be refreshed."),
            autoPoll: false
          }));
        }
        if (!automatic) throw error;
        return null;
      }
    },
    [acceptPacket, begin, input.kind, isCurrent, stableWorkspace, state, workspaceKey]
  );

  const cancel = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    const active = state.workspaceKey === requestWorkspaceKey ? state.operation : null;
    if (!active?.cancellable) return null;
    const { generation: requestGeneration, controller: requestController } = begin();
    setState((current) => ({ ...current, busy: "canceling", error: null }));
    try {
      const packet = await cancelBusinessDeskProviderOperation<TResult>(
        stableWorkspace,
        active.id,
        { expectedVersion: active.version },
        input.kind,
        { signal: requestController.signal }
      );
      await acceptPacket(
        packet,
        identity.current,
        requestWorkspaceKey,
        requestGeneration,
        "Cancellation status was recorded by the server."
      );
      return packet.operation;
    } catch (error) {
      if (isCurrent(requestWorkspaceKey, requestGeneration)) {
        setState((current) => ({
          ...current,
          busy: null,
          error:
            error instanceof Error
              ? error
              : new Error("The provider operation could not be cancelled."),
          autoPoll: false
        }));
      }
      throw error;
    }
  }, [acceptPacket, begin, input.kind, isCurrent, stableWorkspace, state, workspaceKey]);

  const recoverRecent = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    const { generation: requestGeneration, controller: requestController } = begin();
    setState({
      workspaceKey: requestWorkspaceKey,
      operation: null,
      busy: "restoring",
      error: null,
      notice: "",
      autoPoll: false
    });
    try {
      const history = await listBusinessDeskProviderOperations<TResult>(
        stableWorkspace,
        { kind: input.kind, limit: 10 },
        { signal: requestController.signal }
      );
      if (!isCurrent(requestWorkspaceKey, requestGeneration)) return null;
      const recovered = history.operations[0] || null;
      if (!recovered) {
        setState({
          workspaceKey: requestWorkspaceKey,
          operation: null,
          busy: null,
          error: null,
          notice: "No recent authorized operation was found for this tool and workspace.",
          autoPoll: false
        });
        return null;
      }
      identity.current = null;
      await acceptPacket(
        { operation: recovered, idempotentReplay: null },
        null,
        requestWorkspaceKey,
        requestGeneration,
        "Recovered the newest authorized operation for this tool and workspace from server history. Verify that its source boundary matches the current draft before relying on it."
      );
      return recovered;
    } catch (error) {
      const currentRequest = isCurrent(requestWorkspaceKey, requestGeneration);
      if (currentRequest) {
        setState({
          workspaceKey: requestWorkspaceKey,
          operation: null,
          busy: null,
          error:
            error instanceof Error
              ? error
              : new Error("Recent provider operations could not be recovered."),
          notice: "",
          autoPoll: false
        });
        throw error;
      }
      return null;
    }
  }, [acceptPacket, begin, input.kind, isCurrent, stableWorkspace, workspaceKey]);

  const startNewAttempt = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    controller.current?.abort();
    generation.current += 1;
    const requestGeneration = generation.current;
    const currentIdentity = identity.current;
    identity.current = null;
    if (currentIdentity) {
      await forgetPersistedProviderIdentity(
        currentIdentity.scopeKey,
        currentIdentity.slot,
        currentIdentity.signatureSha256
      );
    }
    if (!isCurrent(requestWorkspaceKey, requestGeneration)) return;
    setState({
      workspaceKey: requestWorkspaceKey,
      operation: null,
      busy: null,
      error: null,
      notice: "A new attempt will use a new operation key.",
      autoPoll: false
    });
  }, [isCurrent, workspaceKey]);

  const active = state.workspaceKey === workspaceKey ? state : null;
  useEffect(() => {
    if (
      !active?.autoPoll ||
      !active.operation ||
      !["queued", "processing"].includes(active.operation.state) ||
      active.busy
    ) {
      return;
    }
    const timer = setTimeout(() => {
      void refresh(true);
    }, 2_000);
    return () => clearTimeout(timer);
  }, [active?.autoPoll, active?.busy, active?.operation, refresh]);

  return {
    operation: active?.operation || null,
    busy: active?.busy || null,
    error: active?.error || null,
    notice: active?.notice || "",
    start,
    refresh,
    cancel,
    recoverRecent,
    startNewAttempt
  };
}
