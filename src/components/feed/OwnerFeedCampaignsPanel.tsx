import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  listOwnedFeedCampaigns,
  unpublishFeedCampaign,
  type CommercialFeedCampaign
} from "@/api/commercialFeed";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Props = {
  disabled?: boolean;
  onUnpublished: (id: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

function ownerScope(values: unknown[], generation: number) {
  return {
    generation,
    // Session identity is held in a closure, never in a rendered key or prop.
    matches: (candidate: unknown[]) =>
      values.every((value, index) => value === candidate[index])
  };
}

// Reset private state before rendering a changed identity, following the lesson
// read gate's opaque-generation pattern. Layout cleanup invalidates old callbacks.
export default function OwnerFeedCampaignsPanel(props: Props) {
  const auth = useAuth();
  const ent = useEntitlements();
  const values = [
    auth.user?.id,
    auth.token,
    auth.isAuthed,
    auth.isHydrating,
    auth.meStatus,
    auth.user?.role,
    ent.ready,
    ent.mode,
    ent.plan,
    ent.facilityId,
    ent.facilityRole
  ];
  const [scope, setScope] = useState(() => ownerScope(values, 0));
  const currentGeneration = useRef(scope.generation);
  useLayoutEffect(() => {
    currentGeneration.current = scope.generation;
  }, [scope.generation]);
  if (!scope.matches(values)) {
    setScope(ownerScope(values, scope.generation + 1));
    return null;
  }
  const generation = scope.generation;
  if (!auth.isAuthed || auth.isHydrating || !auth.user?.id || !ent.ready) return null;
  return (
    <OwnerCampaigns
      key={generation}
      {...props}
      isCurrentScope={() => currentGeneration.current === generation}
    />
  );
}

function campaignName(item: CommercialFeedCampaign) {
  return item.title?.trim() || "Untitled campaign";
}

function campaignStatus(item: CommercialFeedCampaign) {
  if (item.status === "cancelled") return "Unpublished";
  if (item.isHidden) return "Unavailable";
  if (item.status === "draft") return "Draft";
  if (item.status === "paused") return "Paused";
  if (item.status === "ended" || (item.endsAt && Date.parse(item.endsAt) <= Date.now()))
    return "Ended";
  if (
    (item.startsAt && Date.parse(item.startsAt) > Date.now()) ||
    (item.status === "scheduled" && !item.startsAt)
  )
    return "Scheduled";
  return "Published";
}

function OwnerCampaigns({
  disabled = false,
  onUnpublished,
  onBusyChange,
  isCurrentScope
}: Props & { isCurrentScope: () => boolean }) {
  const { palette } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<CommercialFeedCampaign[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<"read" | "write" | null>(null);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const operation = useRef(false);
  const actionGuard = useRef({
    confirmation: null as string | null,
    recoveryRequired: false
  });
  const latestItems = useRef(items);
  const mounted = useRef(true);
  const disabledRef = useRef(disabled);
  useLayoutEffect(() => {
    disabledRef.current = disabled;
    latestItems.current = items;
  }, [disabled, items]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onBusyChange?.(pending !== null);
    return () => onBusyChange?.(false);
  }, [onBusyChange, pending]);
  const current = () => mounted.current && isCurrentScope();
  const busy = pending !== null || disabled;
  function selectConfirmation(id: string | null) {
    actionGuard.current.confirmation = id;
    setConfirmation(id);
  }

  async function read(more = false) {
    if (!current() || disabledRef.current || operation.current) return;
    if (
      more &&
      (!nextCursor ||
        actionGuard.current.recoveryRequired ||
        actionGuard.current.confirmation)
    )
      return;
    operation.current = true;
    actionGuard.current.recoveryRequired = true;
    setPending("read");
    selectConfirmation(null);
    setError("");
    setFeedback("");
    try {
      const result = await listOwnedFeedCampaigns({
        limit: 20,
        ...(more && nextCursor ? { cursor: nextCursor } : {})
      });
      if (!current()) return;
      const rows = result.items.filter((item) => item.sourceType !== "harvest_readiness");
      setItems((previous) =>
        Array.from(
          new Map(
            [...(more ? previous : []), ...rows].map((row) => [row.id, row])
          ).values()
        )
      );
      setNextCursor(result.nextCursor);
      setLoaded(true);
      setUncertain(false);
      actionGuard.current.recoveryRequired = false;
      for (const row of rows) {
        if (row.status === "cancelled") onUnpublished(row.id);
      }
    } catch {
      if (current())
        setError(
          "Your campaigns could not be loaded. Refresh to check their current status."
        );
    } finally {
      if (current()) {
        operation.current = false;
        setPending(null);
      }
    }
  }

  async function unpublish(id: string) {
    if (
      !current() ||
      disabledRef.current ||
      operation.current ||
      actionGuard.current.recoveryRequired ||
      actionGuard.current.confirmation !== id
    )
      return;
    const selected = latestItems.current.find((item) => item.id === id);
    if (!selected || selected.status === "cancelled") return;
    operation.current = true;
    setPending("write");
    setFeedback("");
    try {
      const result = await unpublishFeedCampaign(selected.id);
      if (!current()) return;
      if (result.id !== selected.id || result.status !== "cancelled")
        throw new Error("Unverified withdrawal");
      setItems((previous) =>
        previous.map((item) => (item.id === result.id ? result : item))
      );
      selectConfirmation(null);
      setFeedback(
        `${campaignName(selected)} is unpublished. Its record and analytics are retained.`
      );
      onUnpublished(result.id);
    } catch {
      if (!current()) return;
      selectConfirmation(null);
      actionGuard.current.recoveryRequired = true;
      setUncertain(true);
      setError(
        "Unpublish could not be confirmed. Refresh your campaigns to check the saved status before trying again."
      );
    } finally {
      if (current()) {
        operation.current = false;
        setPending(null);
      }
    }
  }

  const button = (label: string, action: () => void, blocked = busy) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked }}
      disabled={blocked}
      onPress={action}
      style={[styles.button, { borderColor: palette.border, opacity: blocked ? 0.5 : 1 }]}
    >
      <Text style={{ color: palette.link, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ]}
    >
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.heading, { color: palette.text }]}
      >
        Your campaigns
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Close your campaigns" : "Open your campaigns"}
        accessibilityState={{ expanded, disabled: busy }}
        disabled={busy}
        onPress={() => {
          if (!current() || operation.current || disabledRef.current) return;
          setExpanded(!expanded);
          selectConfirmation(null);
          if (!expanded && !loaded) void read();
        }}
        style={styles.button}
      >
        <Text style={{ color: palette.link }}>
          {expanded ? "Close your campaigns" : "Open your campaigns"}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.content}>
          <Text style={{ color: palette.textMuted }}>
            Review your saved campaigns. Unpublish removes a campaign from new public
            reads and keeps its record and analytics. Previously cached or copied content
            cannot be recalled.
          </Text>
          {button("Refresh your campaigns", () => void read())}
          {pending ? (
            <Text accessibilityLiveRegion="polite" style={{ color: palette.textMuted }}>
              {pending === "write" ? "Unpublishing campaign…" : "Loading your campaigns…"}
            </Text>
          ) : null}
          {error ? (
            <Text accessibilityRole="alert" style={{ color: palette.danger }}>
              {error}
            </Text>
          ) : null}
          {loaded && (pending === "read" || error) ? (
            <Text style={{ color: palette.textMuted }}>
              Previously loaded campaigns; refresh must succeed before another change.
            </Text>
          ) : null}
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={{ color: palette.success }}>
              {feedback}
            </Text>
          ) : null}
          {loaded && !items.length && !pending && !error ? (
            <Text style={{ color: palette.textMuted }}>
              No owned campaigns available.
            </Text>
          ) : null}
          {items.map((item) => (
            <View key={item.id} style={[styles.row, { borderColor: palette.border }]}>
              <Text
                accessibilityRole="header"
                aria-level={3}
                style={[styles.itemTitle, { color: palette.text }]}
              >
                {campaignName(item)}
              </Text>
              <Text style={{ color: palette.textMuted }}>{campaignStatus(item)}</Text>
              {item.status !== "cancelled"
                ? button(
                    `Unpublish ${campaignName(item)}`,
                    () => {
                      if (
                        !current() ||
                        operation.current ||
                        disabledRef.current ||
                        actionGuard.current.recoveryRequired ||
                        actionGuard.current.confirmation ||
                        !latestItems.current.some(
                          (row) => row.id === item.id && row.status !== "cancelled"
                        )
                      )
                        return;
                      selectConfirmation(item.id);
                      setFeedback("");
                    },
                    busy || Boolean(error) || uncertain || Boolean(confirmation)
                  )
                : null}
              {item.id === confirmation ? (
                <View style={styles.content}>
                  <Text style={{ color: palette.text }}>
                    Unpublish “{campaignName(item)}”? Its record and analytics will
                    remain. This screen does not republish campaigns.
                  </Text>
                  {button(
                    `Confirm unpublish ${campaignName(item)}`,
                    () => void unpublish(item.id)
                  )}
                  {button("Cancel unpublish", () => {
                    if (current() && !operation.current) selectConfirmation(null);
                  })}
                </View>
              ) : null}
            </View>
          ))}
          {nextCursor
            ? button(
                "Load more of your campaigns",
                () => void read(true),
                busy || Boolean(error) || uncertain || Boolean(confirmation)
              )
            : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 16, borderWidth: 1, borderRadius: radius.card, gap: 8 },
  content: { gap: 10 },
  heading: { fontSize: 18, fontWeight: "700" },
  itemTitle: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  row: { paddingTop: 12, borderTopWidth: 1, gap: 8 },
  button: {
    minHeight: 44,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: "flex-start",
    maxWidth: "100%"
  }
});
