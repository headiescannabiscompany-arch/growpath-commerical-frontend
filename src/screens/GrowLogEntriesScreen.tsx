import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from "react-native";

import ScreenContainer from "../components/ScreenContainer.js";
import Card from "../components/Card.js";
import PrimaryButton from "../components/PrimaryButton.js";
import { InlineError } from "../components/InlineError";
import EmptyState from "../components/EmptyState";

import { colors, spacing, radius } from "../theme/theme.js";
import { useAuth } from "@/auth/AuthContext";
import { useApiErrorHandler } from "../hooks/useApiErrorHandler";

import { getGrowlogs, createGrowlog, deleteGrowlog, type Growlog } from "../api/growlogs";

/**
 * IMPORTANT:
 * This app currently has screens that are not facility-scoped.
 * Growlogs API is facility-scoped. We need a facilityId.
 *
 * Wire this to your real source of truth:
 * - selected facility store/context
 * - route params
 * - auth context
 */
function getActiveFacilityId(user: any): string | null {
  return (
    user?.facilityId ||
    user?.activeFacilityId ||
    user?.facility?._id ||
    user?.facility?.id ||
    null
  );
}

export default function GrowLogEntriesScreen() {
  const { user } = useAuth();

  const facilityId = React.useMemo(() => getActiveFacilityId(user), [user]);

  const { toInlineError } = useApiErrorHandler();

  const [items, setItems] = React.useState<Growlog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [rawError, setRawError] = React.useState<any>(null);

  // Create form
  const [title, setTitle] = React.useState("");
  const [note, setNote] = React.useState("");

  const inlineError = React.useMemo(
    () => (rawError ? toInlineError(rawError) : null),
    [rawError, toInlineError]
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setRawError(null);

    if (!facilityId) {
      // No alerts â€” show inline, contract-style error object
      setItems([]);
      setRawError({
        code: "FACILITY_REQUIRED",
        message: "Select a facility to view grow log entries."
      });
      setLoading(false);
      return;
    }

    try {
      const data = await getGrowlogs(facilityId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setRawError(e);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onCreate = React.useCallback(async () => {
    setRawError(null);

    if (!facilityId) {
      setRawError({
        code: "FACILITY_REQUIRED",
        message: "Select a facility to create a grow log entry."
      });
      return;
    }

    // Minimal validation (no alerts)
    if (!title.trim() && !note.trim()) {
      setRawError({
        code: "VALIDATION",
        message: "Add a title or a note before saving."
      });
      return;
    }

    try {
      const created = await createGrowlog(facilityId, {
        title: title.trim() || undefined,
        note: note.trim() || undefined
      });

      // Optimistic prepend
      if (created) {
        setItems((prev) => [created, ...prev]);
      } else {
        await load();
      }

      setTitle("");
      setNote("");
    } catch (e) {
      setRawError(e);
    }
  }, [facilityId, title, note, load]);

  const onDelete = React.useCallback(
    async (id: string) => {
      setRawError(null);

      if (!facilityId) {
        setRawError({
          code: "FACILITY_REQUIRED",
          message: "Select a facility to delete a grow log entry."
        });
        return;
      }

      try {
        await deleteGrowlog(facilityId, id);
        setItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
      } catch (e) {
        setRawError(e);
      }
    },
    [facilityId]
  );

  return (
    <ScreenContainer>
      {inlineError ? (
        <InlineError
          error={inlineError}
          onRetry={() => load()}
          style={{ marginBottom: spacing(4) }}
        />
      ) : null}

      <Card style={{ marginBottom: spacing(6) }}>
        <Text style={styles.title}>Grow Log Entries</Text>
        <Text style={styles.sub}>
          Quick notes per facility (grow-scoping can be added next).
        </Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Day 21 â€” canopy dialed in"
          placeholderTextColor={colors.textSoft}
          style={styles.input}
        />

        <Text style={styles.label}>Note</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What changed today? Environment, feed, training, observations..."
          placeholderTextColor={colors.textSoft}
          style={[styles.input, { minHeight: 96 }]}
          multiline
        />

        <PrimaryButton
          title="button"
          onPress={onCreate}
          disabled={loading}
          style={{ marginTop: spacing(3) }}
          testID="growlog-create"
        >
          <Text style={styles.primaryText}>Save entry</Text>
        </PrimaryButton>
      </Card>

      {loading ? (
        <Text style={{ color: colors.textSoft }}>Loadingâ€¦</Text>
      ) : items.length === 0 ? (
        <EmptyState
          title="No entries yet"
          description="Add a quick note to start building your run history."
          actionLabel="Add your first entry"
          onAction={onCreate}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => String(item?.id ?? (item as any)?._id ?? idx)}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: spacing(4) }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item?.title || "Untitled entry"}</Text>
                  {item?.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                  {item?.createdAt ? (
                    <Text style={styles.itemMeta}>{item.createdAt}</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  onPress={() => onDelete(String(item.id))}
                  style={styles.deleteBtn}
                  testID={`growlog-delete-${String(item.id)}`}
                >
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(1)
  },
  sub: {
    color: colors.textSoft,
    marginBottom: spacing(4)
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1)
  },
  input: {
    backgroundColor: "#fff",
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text
  },
  primaryText: {
    color: colors.accent,
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3)
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text
  },
  itemNote: {
    marginTop: spacing(1),
    color: colors.text
  },
  itemMeta: {
    marginTop: spacing(2),
    color: colors.textSoft,
    fontSize: 12
  },
  deleteBtn: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border
  },
  deleteText: {
    color: colors.textSoft,
    fontWeight: "600"
  }
});

