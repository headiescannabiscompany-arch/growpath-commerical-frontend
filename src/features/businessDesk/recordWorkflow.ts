import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  archiveBusinessDeskRecord,
  businessDeskWorkspaceKey,
  createBusinessDeskRecord,
  listBusinessDeskRecords,
  updateBusinessDeskRecord,
  type BusinessDeskRecord,
  type BusinessDeskRecordKind,
  type BusinessDeskTransitionEvidence,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import {
  resolveBusinessDeskRetryIdentity,
  type BusinessDeskRetryIdentity
} from "@/features/businessDesk/operationRetry";

export function businessDeskRecordId(record: BusinessDeskRecord | null | undefined) {
  return String(record?.id || record?._id || "");
}

export function newBusinessDeskOperationKey(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  const suffix =
    randomUuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return `${String(prefix || "business-desk").replace(/[^a-z0-9_-]/gi, "-")}-${suffix}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function isoToLocalDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isoToLocalDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localDateToIso(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) throw new Error("Choose a valid date.");
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
    0
  );
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    throw new Error("Choose a valid date.");
  }
  return date.toISOString();
}

export function localDateTimeToIso(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw);
  if (!match) throw new Error("Choose a valid local date and time.");
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3]) ||
    date.getHours() !== Number(match[4]) ||
    date.getMinutes() !== Number(match[5])
  ) {
    throw new Error("Choose a valid local date and time.");
  }
  return date.toISOString();
}

type SaveRecordInput = {
  title: string;
  status: string;
  payload: Record<string, unknown>;
  sourceLinks?: Array<Record<string, unknown>>;
};

type TransitionRecordInput = {
  status: string;
  transitionEvidence?: BusinessDeskTransitionEvidence;
};

type BusinessDeskRecordCollectionOptions = {
  sanitizeRecord?: (record: BusinessDeskRecord) => BusinessDeskRecord;
};

export function useBusinessDeskRecordCollection(
  workspace: BusinessDeskWorkspace,
  kind: BusinessDeskRecordKind,
  options: BusinessDeskRecordCollectionOptions = {}
) {
  const workspaceType = workspace.workspaceType;
  const workspaceFacilityId = workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspaceType === "facility"
        ? { workspaceType: "facility", facilityId: workspaceFacilityId }
        : { workspaceType: "commercial" },
    [workspaceFacilityId, workspaceType]
  );
  const workspaceKey = businessDeskWorkspaceKey(stableWorkspace);
  const currentWorkspaceKey = useRef(workspaceKey);
  const listRequest = useRef<{ epoch: number; controller: AbortController | null }>({
    epoch: 0,
    controller: null
  });
  const mutationRequest = useRef<{ epoch: number }>({ epoch: 0 });
  const mutationRetryIdentities = useRef(new Map<string, BusinessDeskRetryIdentity>());
  const sanitizeRecord = options.sanitizeRecord;
  currentWorkspaceKey.current = workspaceKey;

  const [recordState, setRecordState] = useState<{
    workspaceKey: string;
    records: BusinessDeskRecord[];
  }>({ workspaceKey, records: [] });
  const [loadingState, setLoadingState] = useState({ workspaceKey, value: true });
  const [savingState, setSavingState] = useState({ workspaceKey, value: false });
  const [errorState, setErrorState] = useState<{
    workspaceKey: string;
    error: Error | null;
  }>({ workspaceKey, error: null });

  const records = recordState.workspaceKey === workspaceKey ? recordState.records : [];
  const loading = loadingState.workspaceKey === workspaceKey ? loadingState.value : true;
  const saving = savingState.workspaceKey === workspaceKey ? savingState.value : false;
  const error = errorState.workspaceKey === workspaceKey ? errorState.error : null;

  const changedWorkspaceError = useCallback(
    () =>
      new Error(
        "The selected workspace changed. The prior Business Desk response was discarded."
      ),
    []
  );

  const reload = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    const epoch = listRequest.current.epoch + 1;
    listRequest.current.controller?.abort();
    const controller =
      typeof AbortController === "undefined" ? null : new AbortController();
    listRequest.current = { epoch, controller };
    setRecordState({ workspaceKey: requestWorkspaceKey, records: [] });
    setLoadingState({ workspaceKey: requestWorkspaceKey, value: true });
    setErrorState({ workspaceKey: requestWorkspaceKey, error: null });
    try {
      const nextRecords = await listBusinessDeskRecords(
        stableWorkspace,
        { kind },
        { signal: controller?.signal }
      );
      if (
        currentWorkspaceKey.current !== requestWorkspaceKey ||
        listRequest.current.epoch !== epoch ||
        controller?.signal.aborted
      ) {
        return;
      }
      setRecordState({
        workspaceKey: requestWorkspaceKey,
        records: sanitizeRecord ? nextRecords.map(sanitizeRecord) : nextRecords
      });
    } catch (nextError) {
      if (
        currentWorkspaceKey.current === requestWorkspaceKey &&
        listRequest.current.epoch === epoch &&
        !controller?.signal.aborted
      ) {
        setErrorState({
          workspaceKey: requestWorkspaceKey,
          error:
            nextError instanceof Error
              ? nextError
              : new Error("Business Desk records could not be loaded.")
        });
      }
    } finally {
      if (
        currentWorkspaceKey.current === requestWorkspaceKey &&
        listRequest.current.epoch === epoch
      ) {
        setLoadingState({ workspaceKey: requestWorkspaceKey, value: false });
      }
    }
  }, [kind, sanitizeRecord, stableWorkspace, workspaceKey]);

  useEffect(() => {
    void reload();
    return () => {
      listRequest.current.controller?.abort();
    };
  }, [reload, workspaceKey]);

  const save = useCallback(
    async (input: SaveRecordInput, current?: BusinessDeskRecord | null) => {
      const requestWorkspaceKey = workspaceKey;
      const epoch = mutationRequest.current.epoch + 1;
      mutationRequest.current = { epoch };
      setSavingState({ workspaceKey: requestWorkspaceKey, value: true });
      setErrorState({ workspaceKey: requestWorkspaceKey, error: null });
      try {
        const id = businessDeskRecordId(current);
        const slot = id ? `update:${id}` : `create:${kind}`;
        const expectedVersion = id ? Number(current?.version) : null;
        const retryIdentity = resolveBusinessDeskRetryIdentity(
          mutationRetryIdentities.current.get(slot),
          {
            workspaceKey: requestWorkspaceKey,
            kind,
            operation: id ? "update" : "create",
            recordId: id || null,
            expectedVersion,
            input
          },
          () => newBusinessDeskOperationKey(`${kind}-${id ? "update" : "create"}`)
        );
        mutationRetryIdentities.current.set(slot, retryIdentity);
        const record = id
          ? await updateBusinessDeskRecord(stableWorkspace, id, {
              expectedVersion: Number(expectedVersion),
              ...input,
              idempotencyKey: retryIdentity.key
            })
          : await createBusinessDeskRecord(stableWorkspace, {
              kind,
              ...input,
              idempotencyKey: retryIdentity.key
            });
        if (
          currentWorkspaceKey.current !== requestWorkspaceKey ||
          mutationRequest.current.epoch !== epoch
        ) {
          throw changedWorkspaceError();
        }
        const safeRecord = sanitizeRecord ? sanitizeRecord(record) : record;
        const nextId = businessDeskRecordId(safeRecord);
        setRecordState((currentState) => {
          const currentRecords =
            currentState.workspaceKey === requestWorkspaceKey ? currentState.records : [];
          const without = currentRecords.filter(
            (candidate) => businessDeskRecordId(candidate) !== nextId
          );
          return {
            workspaceKey: requestWorkspaceKey,
            records: [safeRecord, ...without]
          };
        });
        mutationRetryIdentities.current.delete(slot);
        return safeRecord;
      } catch (nextError) {
        const normalized =
          nextError instanceof Error
            ? nextError
            : new Error("The Business Desk record could not be saved.");
        if (
          currentWorkspaceKey.current === requestWorkspaceKey &&
          mutationRequest.current.epoch === epoch
        ) {
          setErrorState({ workspaceKey: requestWorkspaceKey, error: normalized });
        }
        throw normalized;
      } finally {
        if (
          currentWorkspaceKey.current === requestWorkspaceKey &&
          mutationRequest.current.epoch === epoch
        ) {
          setSavingState({ workspaceKey: requestWorkspaceKey, value: false });
        }
      }
    },
    [changedWorkspaceError, kind, sanitizeRecord, stableWorkspace, workspaceKey]
  );

  const transition = useCallback(
    async (record: BusinessDeskRecord, input: TransitionRecordInput) => {
      const id = businessDeskRecordId(record);
      if (!id) throw new Error("The selected record has no identifier.");
      const requestWorkspaceKey = workspaceKey;
      const epoch = mutationRequest.current.epoch + 1;
      mutationRequest.current = { epoch };
      setSavingState({ workspaceKey: requestWorkspaceKey, value: true });
      setErrorState({ workspaceKey: requestWorkspaceKey, error: null });
      try {
        const slot = `transition:${id}`;
        const retryIdentity = resolveBusinessDeskRetryIdentity(
          mutationRetryIdentities.current.get(slot),
          {
            workspaceKey: requestWorkspaceKey,
            kind,
            operation: "transition",
            recordId: id,
            expectedVersion: Number(record.version),
            input
          },
          () => newBusinessDeskOperationKey(`${kind}-transition`)
        );
        mutationRetryIdentities.current.set(slot, retryIdentity);
        const transitioned = await updateBusinessDeskRecord(stableWorkspace, id, {
          expectedVersion: Number(record.version),
          status: input.status,
          ...(input.transitionEvidence !== undefined
            ? { transitionEvidence: input.transitionEvidence }
            : {}),
          idempotencyKey: retryIdentity.key
        });
        if (
          currentWorkspaceKey.current !== requestWorkspaceKey ||
          mutationRequest.current.epoch !== epoch
        ) {
          throw changedWorkspaceError();
        }
        const safeRecord = sanitizeRecord ? sanitizeRecord(transitioned) : transitioned;
        const nextId = businessDeskRecordId(safeRecord);
        setRecordState((currentState) => {
          const currentRecords =
            currentState.workspaceKey === requestWorkspaceKey ? currentState.records : [];
          return {
            workspaceKey: requestWorkspaceKey,
            records: [
              safeRecord,
              ...currentRecords.filter(
                (candidate) => businessDeskRecordId(candidate) !== nextId
              )
            ]
          };
        });
        mutationRetryIdentities.current.delete(slot);
        return safeRecord;
      } catch (nextError) {
        const normalized =
          nextError instanceof Error
            ? nextError
            : new Error("The Business Desk record status could not be changed.");
        if (
          currentWorkspaceKey.current === requestWorkspaceKey &&
          mutationRequest.current.epoch === epoch
        ) {
          setErrorState({ workspaceKey: requestWorkspaceKey, error: normalized });
        }
        throw normalized;
      } finally {
        if (
          currentWorkspaceKey.current === requestWorkspaceKey &&
          mutationRequest.current.epoch === epoch
        ) {
          setSavingState({ workspaceKey: requestWorkspaceKey, value: false });
        }
      }
    },
    [changedWorkspaceError, kind, sanitizeRecord, stableWorkspace, workspaceKey]
  );

  const archive = useCallback(
    async (record: BusinessDeskRecord, reason: string) => {
      const id = businessDeskRecordId(record);
      if (!id) throw new Error("The selected record has no identifier.");
      const requestWorkspaceKey = workspaceKey;
      const epoch = mutationRequest.current.epoch + 1;
      mutationRequest.current = { epoch };
      setSavingState({ workspaceKey: requestWorkspaceKey, value: true });
      setErrorState({ workspaceKey: requestWorkspaceKey, error: null });
      try {
        const slot = `archive:${id}`;
        const retryIdentity = resolveBusinessDeskRetryIdentity(
          mutationRetryIdentities.current.get(slot),
          {
            workspaceKey: requestWorkspaceKey,
            kind,
            operation: "archive",
            recordId: id,
            expectedVersion: Number(record.version),
            reason
          },
          () => newBusinessDeskOperationKey(`${kind}-archive`)
        );
        mutationRetryIdentities.current.set(slot, retryIdentity);
        const archived = await archiveBusinessDeskRecord(stableWorkspace, id, {
          expectedVersion: Number(record.version),
          reason,
          idempotencyKey: retryIdentity.key
        });
        if (
          currentWorkspaceKey.current !== requestWorkspaceKey ||
          mutationRequest.current.epoch !== epoch
        ) {
          throw changedWorkspaceError();
        }
        setRecordState((currentState) => ({
          workspaceKey: requestWorkspaceKey,
          records:
            currentState.workspaceKey === requestWorkspaceKey
              ? currentState.records.filter(
                  (candidate) => businessDeskRecordId(candidate) !== id
                )
              : []
        }));
        mutationRetryIdentities.current.delete(slot);
        return sanitizeRecord ? sanitizeRecord(archived) : archived;
      } catch (nextError) {
        const normalized =
          nextError instanceof Error
            ? nextError
            : new Error("The Business Desk record could not be archived.");
        if (
          currentWorkspaceKey.current === requestWorkspaceKey &&
          mutationRequest.current.epoch === epoch
        ) {
          setErrorState({ workspaceKey: requestWorkspaceKey, error: normalized });
        }
        throw normalized;
      } finally {
        if (
          currentWorkspaceKey.current === requestWorkspaceKey &&
          mutationRequest.current.epoch === epoch
        ) {
          setSavingState({ workspaceKey: requestWorkspaceKey, value: false });
        }
      }
    },
    [changedWorkspaceError, kind, sanitizeRecord, stableWorkspace, workspaceKey]
  );

  return { records, loading, saving, error, reload, save, transition, archive };
}
