import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from "react-native";

import type { PersonalLog } from "@/api/logs";
import {
  getWorkspaceTimelineLog,
  updateWorkspaceTimelineLog,
  type GrowWorkspace
} from "@/features/grows/workspaceData";
import { useAppTheme } from "@/theme/appTheme";
import JournalEntryEditor from "./JournalEntryEditor";
import { createLogDetailStyles } from "./logDetailStyles";

export default function TimelineJournalEditSheet({
  workspace,
  growId,
  logId,
  onClose,
  onSaved
}: {
  workspace: GrowWorkspace;
  growId: string;
  logId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLogDetailStyles(palette), [palette]);
  const busy = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [log, setLog] = useState<PersonalLog | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    setLog(undefined);
    void getWorkspaceTimelineLog(workspace, growId, logId).then(
      (row) => {
        if (current) setLog(row);
      },
      () => {
        if (current) setLog(null);
      }
    );
    return () => {
      current = false;
    };
  }, [attempt, workspace, growId, logId]);
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!busy.current) onClose();
      }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={styles.title}>
            Edit journal entry
          </Text>
          {log === undefined ? (
            <ActivityIndicator
              accessibilityLabel="Loading journal entry"
              color={palette.accent}
            />
          ) : null}
          {log ? (
            <JournalEntryEditor
              log={log}
              changedFieldsOnly
              saveLog={(patch) =>
                updateWorkspaceTimelineLog(workspace, growId, logId, patch)
              }
              onSaved={onSaved}
              onBusyChange={(value) => {
                busy.current = value;
              }}
              onCancel={onClose}
            />
          ) : (
            <View style={styles.row}>
              {log === null ? (
                <>
                  <Text accessibilityRole="alert" style={styles.feedback}>
                    Could not open this journal entry.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.secondaryButton}
                    onPress={() => setAttempt((previous) => previous + 1)}
                  >
                    <Text style={styles.secondaryButtonText}>Retry</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={onClose}
              >
                <Text style={styles.secondaryButtonText}>Back to timeline</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
