import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from "react-native";
import { useAuth } from "../../context/AuthContext.js";
import { listVerifications, verifyTask } from "../../api/verification.js";

export default function VerificationScreen() {
  const { selectedFacilityId } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

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

  const handleVerify = async (taskId) => {
    try {
      setVerifyingId(taskId);
      await verifyTask(selectedFacilityId, taskId, { verified: true });
      Alert.alert("Success", "Task verified successfully");
      await loadTasks();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to verify task");
    } finally {
      setVerifyingId(null);
    }
  };

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskName}>{item.name || "Unnamed Task"}</Text>
        <Text style={styles.taskStatus}>Awaiting Verification</Text>
      </View>
      <Text style={styles.taskDescription}>{item.description || ""}</Text>
      {item.completedAt && (
        <Text style={styles.completedDate}>
          Completed: {new Date(item.completedAt).toLocaleDateString()}
        </Text>
      )}
      <TouchableOpacity
        style={styles.verifyButton}
        onPress={() => handleVerify(item.id)}
        disabled={verifyingId === item.id}
      >
        {verifyingId === item.id ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify Task</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task Verification</Text>
      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No tasks awaiting verification</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333"
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50"
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  taskName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1
  },
  taskStatus: {
    fontSize: 12,
    color: "#FF9800",
    fontWeight: "500"
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8
  },
  completedDate: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12
  },
  verifyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: "center"
  },
  verifyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyText: {
    fontSize: 16,
    color: "#999"
  },
  listContent: {
    paddingBottom: 16
  }
});
