import { Link } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  type BusinessAskCitation,
  type BusinessAskKpiMetricKey,
  type BusinessAskResult
} from "@/api/businessDeskProvider";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const KPI_LABELS: Record<BusinessAskKpiMetricKey, string> = {
  open_quotes: "Open quotes",
  open_leads: "Open leads",
  active_jobs: "Active jobs",
  reviewed_expenses: "Reviewed expenses",
  low_stock_items: "Low-stock items",
  held_inventory_warnings: "Held-inventory warnings"
};

function CitationLinks({
  ids,
  citations,
  basePath,
  operationId,
  styles,
  labelPrefix = "Inspect cited source"
}: {
  ids: string[];
  citations: Map<string, BusinessAskCitation>;
  basePath: string;
  operationId: string;
  styles: ReturnType<typeof createStyles>;
  labelPrefix?: string;
}) {
  if (!ids.length) return null;
  return (
    <View style={styles.citationRow}>
      {ids.map((id) => {
        const citation = citations.get(id);
        if (!citation) return null;
        const revision = citation.version ? ` · revision ${citation.version}` : "";
        return (
          <Link
            key={id}
            href={
              `${basePath}/source?operationId=${encodeURIComponent(
                operationId
              )}&citationId=${encodeURIComponent(id)}` as any
            }
            asChild
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${labelPrefix} ${citation.title}${revision}`}
              style={styles.citationChip}
            >
              <Text style={styles.citationText}>
                {citation.title}
                {revision}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

function ResultSection({
  title,
  empty,
  entries,
  citations,
  basePath,
  operationId,
  styles
}: {
  title: string;
  empty: string;
  entries: Array<{ statement: string; citationIds: string[]; detail?: string }>;
  citations: Map<string, BusinessAskCitation>;
  basePath: string;
  operationId: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.resultSection}>
      <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
        {title}
      </Text>
      {entries.length ? (
        entries.map((entry, index) => (
          <View key={`${title}-${index}`} style={styles.resultEntry}>
            <Text style={styles.resultText}>{entry.statement}</Text>
            {entry.detail ? (
              <Text style={styles.resultDetail}>{entry.detail}</Text>
            ) : null}
            <CitationLinks
              ids={entry.citationIds}
              citations={citations}
              basePath={basePath}
              operationId={operationId}
              styles={styles}
            />
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{empty}</Text>
      )}
    </View>
  );
}

export default function BusinessAskResultContent({
  result,
  basePath,
  operationId
}: {
  result: BusinessAskResult;
  basePath: string;
  operationId: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const citations = useMemo(
    () => new Map(result.citations.map((citation) => [citation.id, citation])),
    [result.citations]
  );

  return (
    <View style={styles.stack}>
      <View style={styles.answerBox}>
        <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
          Cited answer
        </Text>
        <Text style={styles.answerText}>{result.answer}</Text>
        <CitationLinks
          ids={result.answerCitationIds}
          citations={citations}
          basePath={basePath}
          operationId={operationId}
          styles={styles}
        />
        {result.incomplete ? (
          <Text style={styles.warningText}>
            The authorized records were insufficient for a sourced answer. This is an
            explicit incomplete result, not a zero or a complete business summary.
          </Text>
        ) : null}
      </View>

      <Text style={styles.boundaryText}>
        Server-selected {result.selectedRecordCount} authorized source
        {result.selectedRecordCount === 1 ? "" : "s"} from {result.dateRange.from} through{" "}
        {result.dateRange.to} UTC, using each source last-updated timestamp.
      </Text>
      {result.truncated ? (
        <Text style={styles.warningText}>
          The authorized source limit was reached and{" "}
          {result.kpiSnapshot.omittedSourceCount} additional matching source
          {result.kpiSnapshot.omittedSourceCount === 1 ? " was" : "s were"} omitted. This
          is partial evidence, not a zero or complete workspace summary.
        </Text>
      ) : null}

      <View style={styles.resultSection}>
        <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
          KPI snapshot · in selected sources
        </Text>
        <Text style={styles.boundaryText}>
          These deterministic counts cover only the selected, authorized, last-updated UTC
          source window. They are not global business totals.
        </Text>
        {result.kpiSnapshot.metrics.length ? (
          <View style={styles.kpiGrid}>
            {result.kpiSnapshot.metrics.map((metric) => (
              <View key={metric.key} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{KPI_LABELS[metric.key]}</Text>
                <Text style={styles.kpiValue}>
                  {metric.complete
                    ? `${metric.count} in selected sources`
                    : metric.count
                      ? `At least ${metric.count} in partial sources`
                      : "Unknown · partial sources"}
                </Text>
                {!metric.complete ? (
                  <Text style={styles.warningText}>
                    Incomplete because matching sources were omitted. A displayed zero is
                    not a real zero.
                  </Text>
                ) : null}
                <CitationLinks
                  ids={metric.sourceIds}
                  citations={citations}
                  basePath={basePath}
                  operationId={operationId}
                  styles={styles}
                  labelPrefix={`Inspect ${KPI_LABELS[metric.key]} KPI source`}
                />
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No KPI categories were included in this source selection. That is not a zero.
          </Text>
        )}
      </View>

      <ResultSection
        title="Facts"
        empty="No additional source-backed facts were returned."
        entries={result.facts}
        citations={citations}
        basePath={basePath}
        operationId={operationId}
        styles={styles}
      />
      <ResultSection
        title="Calculations"
        empty="No source-backed calculations were returned."
        entries={result.calculations.map((entry) => ({
          statement: entry.statement,
          citationIds: entry.citationIds,
          detail: `${entry.incomplete ? "Incomplete" : "Provider-unverified"} calculation · review required · ${entry.formula}${entry.inputs.length ? ` · inputs: ${entry.inputs.join(", ")}` : ""}`
        }))}
        citations={citations}
        basePath={basePath}
        operationId={operationId}
        styles={styles}
      />
      <ResultSection
        title="Assumptions"
        empty="No assumptions were returned."
        entries={result.assumptions}
        citations={citations}
        basePath={basePath}
        operationId={operationId}
        styles={styles}
      />
      <ResultSection
        title="Scenarios"
        empty="No scenarios were returned."
        entries={result.scenarios}
        citations={citations}
        basePath={basePath}
        operationId={operationId}
        styles={styles}
      />
      <ResultSection
        title="Recommendations requiring review"
        empty="No source-backed recommendations were returned."
        entries={result.recommendations.map((entry) => ({
          statement: entry.statement,
          citationIds: entry.citationIds,
          detail: "Review required · no action was performed"
        }))}
        citations={citations}
        basePath={basePath}
        operationId={operationId}
        styles={styles}
      />
      <View style={styles.resultSection}>
        <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
          Limitations
        </Text>
        {result.limitations.length ? (
          result.limitations.map((entry, index) => (
            <Text key={`limitation-${index}`} style={styles.resultText}>
              {entry}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>No additional limitations were returned.</Text>
        )}
      </View>
      <View style={styles.resultSection}>
        <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
          Missing information
        </Text>
        {result.missingInformation.length ? (
          result.missingInformation.map((entry, index) => (
            <Text key={`missing-${index}`} style={styles.resultText}>
              {entry}
            </Text>
          ))
        ) : (
          <Text style={styles.emptyText}>
            No additional missing information was returned.
          </Text>
        )}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    answerBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    answerText: { color: palette.text, fontSize: 15, lineHeight: 23 },
    boundaryText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    citationChip: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 999,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 38,
      paddingHorizontal: 11,
      paddingVertical: 7
    },
    citationRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    citationText: { color: palette.link, fontSize: 11, fontWeight: "900" },
    emptyText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    kpiCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: 220,
      flexGrow: 1,
      gap: 7,
      minWidth: 200,
      padding: 11
    },
    kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    kpiLabel: { color: palette.textMuted, fontSize: 11, fontWeight: "900" },
    kpiValue: { color: palette.text, fontSize: 17, fontWeight: "900" },
    resultDetail: { color: palette.textMuted, fontSize: 11, lineHeight: 17 },
    resultEntry: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 11
    },
    resultSection: { gap: 9 },
    resultText: { color: palette.text, fontSize: 13, lineHeight: 20 },
    sectionTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    stack: { gap: 14 },
    warningText: {
      color: palette.warning,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 18
    }
  });
}
