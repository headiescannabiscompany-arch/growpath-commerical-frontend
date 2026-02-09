import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from "react-native";

import { useFacility } from "@/state/useFacility";
import { useVerification } from "@/hooks/useVerification";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

export default function VerificationScreen() {
  const { selectedId: facilityId } = useFacility();
  const canInteract = Boolean(facilityId);

  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    records,
    isLoading,
    isRefreshing,
    error,
    refetch,
    approveRecord,
    rejectRecord
  } = useVerification(facilityId);

  const handleApiError = useApiErrorHandler();
  const [actionError, setActionError] = useState<any>(null);

  const tasks = Array.isArray(records) ? records : [];

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => (t.status ?? "pending") === filter);
  }, [tasks, filter]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "approved":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#f59e0b";
    }
  };

  const getStatusLabel = (status?: string) => {
    const s = status ?? "pending";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const runAction = async (fn: () => Promise<void>, recordId: string) => {
    if (!canInteract) return;

    setProcessingId(recordId);
    setActionError(null);

    try {
      await fn();
      await refetch(); // deterministic reload
    } catch (e: any) {
      setActionError(handleApiError(e));
    } finally {
      setProcessingId(null);
    }
  };

  const renderTask = ({ item }: any) => {
    const recordId = String(item?._id || item?.id);
    const isProcessing = processingId === recordId;

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordName}>
            {item.name || "Unnamed Record"}
          </Text>
          <Text style={[styles.recordStatus, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>

        {item.description && (
          <Text style={styles.recordDescription}>{item.description}</Text>
        )}

        {item.completedAt && (
          <Text style={styles.recordDate}>
            Submitted: {new Date(item.completedAt).toLocaleDateString()}
          </Text>
        )}

        {item.status === "pending" && canInteract && (
          <View style={styles.recordActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              disabled={isProcessing}
              onPress={() =>
                runAction(() => approveRecord(recordId), recordId)
              }
            >
              {isProcessing ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.approveBtnText}>✓ Approve</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              disabled={isProcessing}
              onPress={() =>
                runAction(() => rejectRecord({ recordId }), recordId)
              }
            >
              {isProcessing ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.rejectBtnText}>✕ Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter bar */}
      <View style={styles.filterBar}>
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style=[
              styles.filterButton,
              filter === f && styles.filterButtonActive
            ]
            onPress={() => setFilter(f)}
          >
            <Text
              style=[
                styles.filterButtonText,
                filter === f && styles.filterButtonTextActive
              ]
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contract-locked errors */}
      <InlineError error={error || actionError} />

      {!canInteract ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No facility selected</Text>
        </View>
      ) : filteredTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {filter === "all"
              ? "No records to review"
              : `No ${filter} records`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => String(item?._id || item?.id)}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refetch}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    alignItems: "center"
  },
  filterButtonActive: {
    backgroundColor: "#f59e0b"
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280"
  },
  filterButtonTextActive: {
    color: "#fff"
  },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 2
  },
  recordHeader: {
    marginBottom: 8
  },
  recordInfo: {
    gap: 4
  },
  recordName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937"
  },
  recordStatus: {
    fontSize: 12,
    fontWeight: "600",
    alignSelf: "flex-start"
  },
  recordDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 20
  },
  recordDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 12
  },
  recordActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center"
  },
  approveBtn: {
    backgroundColor: "#d1fae5"
  },
  approveBtnText: {
    color: "#065f46",
    fontWeight: "600",
    fontSize: 14
  },
  rejectBtn: {
    backgroundColor: "#fee2e2"
  },
  rejectBtnText: {
    color: "#991b1b",
    fontWeight: "600",
    fontSize: 14
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500"
  },
  listContent: {
    padding: 16,
    flexGrow: 1
  }
});
