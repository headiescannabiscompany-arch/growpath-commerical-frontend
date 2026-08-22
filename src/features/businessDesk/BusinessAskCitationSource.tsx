import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  getBusinessDeskProviderOperation,
  type BusinessAskCitation,
  type BusinessAskResult
} from "@/api/businessDeskProvider";
import {
  businessDeskWorkspaceKey,
  getBusinessDeskRecord,
  getBusinessDeskRevision,
  type BusinessDeskRecord,
  type BusinessDeskRevision,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { getBusinessInventoryItem } from "@/api/businessInventory";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { businessDeskProviderErrorMessage } from "@/features/businessDesk/ProviderOperationStatus";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type SourceState = {
  key: string;
  loading: boolean;
  error: string;
  citation: BusinessAskCitation | null;
  source: unknown;
  sourceNotice: string;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function revisionSnapshot(revision: BusinessDeskRevision) {
  const snapshot = revision.snapshot || revision.after;
  return snapshot && typeof snapshot === "object" ? snapshot : null;
}

function safeDisplay(value: unknown) {
  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized.length <= 30_000
      ? serialized
      : `${serialized.slice(0, 30_000)}\n… display truncated`;
  } catch {
    return "This authorized source could not be displayed safely.";
  }
}

async function exactBusinessDeskSource(
  workspace: BusinessDeskWorkspace,
  citation: BusinessAskCitation,
  signal: AbortSignal
) {
  if (citation.version === null) {
    const record = await getBusinessDeskRecord(workspace, citation.recordId, { signal });
    return {
      source: record,
      notice: "The provider cited the current authorized record without a revision pin."
    };
  }
  const exact = await getBusinessDeskRevision(
    workspace,
    citation.recordId,
    citation.version,
    { signal }
  );
  const snapshot = revisionSnapshot(exact);
  if (!snapshot) {
    return {
      source: null,
      notice: `Exact cited revision ${citation.version} has no displayable snapshot. The current record was not substituted.`
    };
  }
  return {
    source: snapshot,
    notice: `Showing the authorized immutable snapshot for cited revision ${citation.version}.`
  };
}

function inventoryWorkspace(workspace: BusinessDeskWorkspace) {
  return workspace.workspaceType === "facility"
    ? { facilityId: workspace.facilityId }
    : {};
}

async function exactInventoryItemSource(
  workspace: BusinessDeskWorkspace,
  citation: BusinessAskCitation
): Promise<{ source: unknown; notice: string }> {
  const detail = await getBusinessInventoryItem(
    inventoryWorkspace(workspace),
    citation.recordId
  );
  if (String(detail.item?.id || detail.item?._id || "") !== citation.recordId) {
    return {
      source: null,
      notice:
        "The authorized inventory response did not contain the cited item identity. Nothing else was substituted."
    };
  }
  return {
    source: detail.item,
    notice: `Showing the current authorized projection for the exact cited item identity. The answer used the source-dated projection from ${new Date(citation.sourceDate).toLocaleString()}; inventory is mutable, so this current view may have changed.`
  };
}

async function exactInventoryLotSource(
  workspace: BusinessDeskWorkspace,
  citation: BusinessAskCitation
): Promise<{ source: unknown; notice: string }> {
  if (!citation.parentRecordId) {
    return {
      source: null,
      notice:
        "The cited lot is missing its server-attested parent item. Nothing else was substituted."
    };
  }
  const detail = await getBusinessInventoryItem(
    inventoryWorkspace(workspace),
    citation.parentRecordId
  );
  if (String(detail.item?.id || detail.item?._id || "") !== citation.parentRecordId) {
    return {
      source: null,
      notice:
        "The authorized inventory response did not contain the cited parent item. Nothing else was substituted."
    };
  }
  const lot = detail.lots.find(
    (entry) => String(entry.id || entry._id || "") === citation.recordId
  );
  if (!lot) {
    return {
      source: null,
      notice:
        "The exact cited inventory lot identity is unavailable. No current item or different lot was substituted."
    };
  }
  return {
    source: lot,
    notice: `Showing the current authorized projection for the exact cited lot identity. The answer used the source-dated projection from ${new Date(citation.sourceDate).toLocaleString()}; inventory is mutable, so this current view may have changed.`
  };
}

export default function BusinessAskCitationSource({
  workspace,
  workspaceLabel,
  basePath
}: {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    operationId?: string | string[];
    citationId?: string | string[];
  }>();
  const operationId = firstParam(params.operationId).trim();
  const citationId = firstParam(params.citationId).trim();
  const workspaceKey = businessDeskWorkspaceKey(workspace);
  const facilityId = workspace.workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspace.workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, workspace.workspaceType]
  );
  const requestKey = `${workspaceKey}:${operationId}:${citationId}`;
  const activeKey = useRef(requestKey);
  activeKey.current = requestKey;
  const [state, setState] = useState<SourceState>({
    key: requestKey,
    loading: true,
    error: "",
    citation: null,
    source: null,
    sourceNotice: ""
  });

  useEffect(() => {
    const controller = new AbortController();
    const key = requestKey;
    setState({
      key,
      loading: true,
      error: "",
      citation: null,
      source: null,
      sourceNotice: ""
    });
    void (async () => {
      try {
        if (
          !operationId ||
          operationId.length > 256 ||
          !citationId ||
          citationId.length > 256
        ) {
          throw new Error("The cited source link is incomplete or invalid.");
        }
        const packet = await getBusinessDeskProviderOperation<BusinessAskResult>(
          stableWorkspace,
          operationId,
          "business_ask",
          { signal: controller.signal }
        );
        const result = packet.operation.result;
        if (packet.operation.state !== "succeeded" || result?.type !== "business_ask") {
          throw new Error("The cited Business Ask result is not available.");
        }
        const citation = result.citations.find((entry) => entry.id === citationId);
        if (!citation) {
          throw new Error("That citation does not belong to this authorized answer.");
        }
        let exact: { source: unknown; notice: string };
        if (citation.sourceType === "business_desk_record") {
          exact = await exactBusinessDeskSource(
            stableWorkspace,
            citation,
            controller.signal
          );
        } else if (citation.sourceType === "business_inventory_item") {
          exact = await exactInventoryItemSource(stableWorkspace, citation);
        } else {
          exact = await exactInventoryLotSource(stableWorkspace, citation);
        }
        if (!controller.signal.aborted && activeKey.current === key) {
          setState({
            key,
            loading: false,
            error: "",
            citation,
            source: exact.source,
            sourceNotice: exact.notice
          });
        }
      } catch (error) {
        if (!controller.signal.aborted && activeKey.current === key) {
          setState({
            key,
            loading: false,
            error: businessDeskProviderErrorMessage(
              error instanceof Error
                ? error
                : new Error("The cited source could not be opened.")
            ),
            citation: null,
            source: null,
            sourceNotice: ""
          });
        }
      }
    })();
    return () => controller.abort();
  }, [citationId, operationId, requestKey, stableWorkspace]);

  const active = state.key === requestKey ? state : null;
  return (
    <AppPage
      routeKey="business-desk-business-ask-source"
      railOverride={null}
      longContent
      backFallbackHref={`${basePath}/ask-ai`}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} Business Desk</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Cited source
          </Text>
          <Text style={styles.subtitle}>
            Read-only inspection of the exact authorized source referenced by a Business
            Ask draft. No source can be selected by URL alone.
          </Text>
        </View>
      }
    >
      <AppCard title="Citation verification" titleLevel={2}>
        {active?.loading ? (
          <Text accessibilityLiveRegion="polite" style={styles.meta}>
            Verifying the answer, workspace, citation, and source…
          </Text>
        ) : active?.error ? (
          <Text accessibilityLiveRegion="assertive" style={styles.error}>
            {active.error}
          </Text>
        ) : active?.citation ? (
          <View style={styles.stack}>
            <Text style={styles.sourceTitle}>{active.citation.title}</Text>
            <Text style={styles.meta}>
              {active.citation.sourceType.replace(/_/g, " ")} ·{" "}
              {active.citation.recordKind}
              {active.citation.version
                ? ` · revision ${active.citation.version}`
                : " · source-dated"}
            </Text>
            <Text style={styles.meta}>
              Source date {new Date(active.citation.sourceDate).toLocaleString()} ·
              last-updated selection window {active.citation.dateRange.from} through{" "}
              {active.citation.dateRange.to}
            </Text>
            <Text selectable style={styles.identifier}>
              Source ID: {active.citation.recordId}
            </Text>
            <Text style={styles.notice}>{active.sourceNotice}</Text>
            {active.source ? (
              <View style={styles.snapshotBox}>
                <Text
                  accessibilityRole="header"
                  aria-level={3}
                  style={styles.snapshotTitle}
                >
                  Authorized source snapshot
                </Text>
                <Text selectable style={styles.snapshotText}>
                  {safeDisplay(active.source)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </AppCard>
    </AppPage>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    error: { color: palette.danger, fontSize: 13, fontWeight: "800", lineHeight: 19 },
    header: { gap: 6 },
    identifier: {
      color: palette.textMuted,
      fontFamily: "monospace",
      fontSize: 11,
      lineHeight: 17
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    notice: { color: palette.text, fontSize: 13, fontWeight: "700", lineHeight: 19 },
    snapshotBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    snapshotText: {
      color: palette.text,
      fontFamily: "monospace",
      fontSize: 11,
      lineHeight: 17
    },
    snapshotTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    sourceTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    stack: { gap: 10 },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 820 },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" }
  });
}
