import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  businessDeskWorkspaceKey,
  listBusinessDeskRecords,
  requireBusinessDeskWorkspace,
  type BusinessDeskRecord,
  type BusinessDeskRecordKind,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { businessDeskRecordId } from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type RelatedRecordState = {
  workspaceKey: string;
  records: BusinessDeskRecord[];
  loading: boolean;
  error: Error | null;
};

export function useAuthorizedBusinessDeskRecords(
  workspace: BusinessDeskWorkspace,
  allowedKinds: readonly BusinessDeskRecordKind[]
) {
  const workspaceType = workspace.workspaceType;
  const facilityId = workspaceType === "facility" ? workspace.facilityId : "";
  const resolvedWorkspace = useMemo(
    () =>
      requireBusinessDeskWorkspace(
        workspaceType === "facility"
          ? { workspaceType: "facility", facilityId }
          : { workspaceType: "commercial" }
      ),
    [facilityId, workspaceType]
  );
  const workspaceKey = businessDeskWorkspaceKey(resolvedWorkspace);
  const currentWorkspaceKey = useRef(workspaceKey);
  const request = useRef<{ epoch: number; controller: AbortController | null }>({
    epoch: 0,
    controller: null
  });
  currentWorkspaceKey.current = workspaceKey;

  const allowedKindKey = allowedKinds.join("|");
  const allowedKindSet = useMemo(
    () => new Set<BusinessDeskRecordKind>(allowedKinds),
    // The joined value makes an equivalent caller-provided array stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allowedKindKey]
  );
  const [state, setState] = useState<RelatedRecordState>({
    workspaceKey,
    records: [],
    loading: true,
    error: null
  });

  const reload = useCallback(async () => {
    const requestWorkspaceKey = workspaceKey;
    const epoch = request.current.epoch + 1;
    request.current.controller?.abort();
    const controller =
      typeof AbortController === "undefined" ? null : new AbortController();
    request.current = { epoch, controller };
    setState({
      workspaceKey: requestWorkspaceKey,
      records: [],
      loading: true,
      error: null
    });
    try {
      const records = await listBusinessDeskRecords(
        resolvedWorkspace,
        {},
        { signal: controller?.signal }
      );
      if (
        currentWorkspaceKey.current !== requestWorkspaceKey ||
        request.current.epoch !== epoch ||
        controller?.signal.aborted
      ) {
        return;
      }
      setState({
        workspaceKey: requestWorkspaceKey,
        records: records
          .filter(
            (record) =>
              allowedKindSet.has(record.kind) &&
              !record.archivedAt &&
              Boolean(businessDeskRecordId(record))
          )
          .sort((left, right) => {
            const recent = String(right.updatedAt || right.createdAt || "").localeCompare(
              String(left.updatedAt || left.createdAt || "")
            );
            return recent || left.title.localeCompare(right.title);
          }),
        loading: false,
        error: null
      });
    } catch (error) {
      if (
        currentWorkspaceKey.current === requestWorkspaceKey &&
        request.current.epoch === epoch &&
        !controller?.signal.aborted
      ) {
        setState({
          workspaceKey: requestWorkspaceKey,
          records: [],
          loading: false,
          error:
            error instanceof Error
              ? error
              : new Error("Related Business Desk records could not be loaded.")
        });
      }
    }
  }, [allowedKindSet, resolvedWorkspace, workspaceKey]);

  useEffect(() => {
    void reload();
    return () => request.current.controller?.abort();
  }, [reload]);

  return {
    records: state.workspaceKey === workspaceKey ? state.records : [],
    loading: state.workspaceKey === workspaceKey ? state.loading : true,
    error: state.workspaceKey === workspaceKey ? state.error : null,
    reload
  };
}

function kindLabel(kind: BusinessDeskRecordKind) {
  return kind.replace(/_/g, " ");
}

export function AuthorizedRelatedRecordPicker({
  label,
  hint,
  records,
  loading,
  error,
  selectedIds,
  multiple,
  excludeId,
  onChange,
  onRetry
}: {
  label: string;
  hint: string;
  records: BusinessDeskRecord[];
  loading: boolean;
  error: Error | null;
  selectedIds: string[];
  multiple: boolean;
  excludeId?: string;
  onChange: (ids: string[]) => void;
  onRetry: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const options = records.filter(
    (record) => businessDeskRecordId(record) !== String(excludeId || "")
  );

  const toggle = (id: string) => {
    if (!multiple) {
      onChange(selectedIds.includes(id) ? [] : [id]);
      return;
    }
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((candidate) => candidate !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {loading ? <Text style={styles.status}>Loading authorized records…</Text> : null}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retry ${label}`}
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && !error && options.length === 0 ? (
        <Text style={styles.status}>No authorized records are available to link.</Text>
      ) : null}
      <View
        accessibilityRole={multiple ? undefined : "radiogroup"}
        style={styles.options}
      >
        {!multiple && options.length > 0 ? (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${label} None`}
            accessibilityState={{ checked: selectedIds.length === 0 }}
            onPress={() => onChange([])}
            style={[styles.option, selectedIds.length === 0 && styles.optionSelected]}
          >
            <Text
              style={[
                styles.optionTitle,
                selectedIds.length === 0 && styles.optionTitleSelected
              ]}
            >
              None
            </Text>
          </Pressable>
        ) : null}
        {options.map((record) => {
          const id = businessDeskRecordId(record);
          const selected = selectedIds.includes(id);
          return (
            <Pressable
              key={`${record.kind}:${id}`}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              accessibilityLabel={`${label} ${record.title}`}
              accessibilityState={{ checked: selected }}
              onPress={() => toggle(id)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                {record.title}
              </Text>
              <Text style={[styles.optionMeta, selected && styles.optionMetaSelected]}>
                {kindLabel(record.kind)} · {record.status} · revision {record.version}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    errorBox: { alignItems: "flex-start", gap: 8 },
    errorText: { color: palette.danger, fontSize: 12, fontWeight: "700" },
    hint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    label: { color: palette.text, fontSize: 13, fontWeight: "800" },
    option: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 2,
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    optionMeta: { color: palette.textMuted, fontSize: 11, textTransform: "capitalize" },
    optionMetaSelected: { color: palette.accentText },
    optionSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    optionTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
    optionTitleSelected: { color: palette.accentText },
    options: { gap: 7 },
    retryButton: {
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 38,
      paddingHorizontal: 14,
      paddingVertical: 8
    },
    retryText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    status: { color: palette.textMuted, fontSize: 12 },
    wrap: { gap: 7 }
  });
}
