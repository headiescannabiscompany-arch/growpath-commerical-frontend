import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput
} from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { listVerifications, verifyTask } from "../../api/verification.js";

export default function VerificationScreen() {
  const { selectedFacilityId } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // all, pending, approved, rejected
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadTasks();
  }, [selectedFacilityId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      if (!selectedFacilityId) {
        setTasks([]);
        return;
      }
      const data = await listVerifications(selectedFacilityId);
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn("Error loading verification tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks().then(() => setRefreshing(false));
  };

  const handleApprove = (taskId) => {
    Alert.alert("Approve Record", "Are you sure you want to approve this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        style: "default",
        onPress: async () => {
          setProcessingId(taskId);
          try {
            await verifyTask(selectedFacilityId, taskId, {
              verified: true,
              status: "approved"
            });
            await loadTasks();
            Alert.alert("Success", "Record approved");
          } catch (error) {
            Alert.alert("Error", error.message || "Failed to approve");
          } finally {
            setProcessingId(null);
          }
        }
      }
    ]);
  };

  const handleReject = (taskId) => {
    Alert.alert("Reject Record", "Are you sure you want to reject this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setProcessingId(taskId);
          try {
            await verifyTask(selectedFacilityId, taskId, {
              verified: false,
              status: "rejected"
            });
            await loadTasks();
            Alert.alert("Success", "Record rejected");
          } catch (error) {
            Alert.alert("Error", error.message || "Failed to reject");
          } finally {
            setProcessingId(null);
          }
        }
      }
    ]);
  };

  const getFilteredTasks = () => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => (t.status || "pending") === filter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#f59e0b";
    }
  };

  const getStatusLabel = (status) => {
    return (status || "pending").charAt(0).toUpperCase() + (status || "pending").slice(1);
  };

  const renderTask = ({ item }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Text style={styles.recordName}>{item.name || "Unnamed Record"}</Text>
          <Text style={[styles.recordStatus, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>
      {item.description && (
        <Text style={styles.recordDescription}>{item.description}</Text>
      )}
      {item.completedAt && (
        <Text style={styles.recordDate}>
          Submitted: {new Date(item.completedAt).toLocaleDateString()}
        </Text>
      )}
      {item.status === "pending" && (
        <View style={styles.recordActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleApprove(item._id || item.id)}
            disabled={processingId === item._id || item.id}
          >
            {processingId === item._id || item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveBtnText}>✓ Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleReject(item._id || item.id)}
            disabled={processingId === item._id || item.id}
          >
            {processingId === item._id || item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.rejectBtnText}>✕ Reject</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {["all", "pending", "approved", "rejected"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === f && styles.filterButtonTextActive
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {filter === "all" ? "No records to review" : `No ${filter} records`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
