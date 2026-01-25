import React, { useState } from "react";
import { FlatList, TextInput, Pressable, View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFacilityTasks } from "../../hooks/useFacilityTasks";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";

function TaskRow({ task, onComplete }: { task: any; onComplete: () => void }) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <View>
        <Text style={{ fontWeight: "600" }}>{task.title}</Text>
        <Text style={{ opacity: 0.6 }}>{task.status}</Text>
      </View>
      {task.status !== "done" && (
        <Pressable
          onPress={onComplete}
          style={{ padding: 8, backgroundColor: "#22c55e", borderRadius: 6 }}
        >
          <Text style={{ color: "#fff" }}>Complete</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function FacilityTasksScreen() {
  const navigation = useNavigation<any>();
  const {
    data: tasks,
    isLoading,
    error,
    createTask,
    completeTask,
    creating
  } = useFacilityTasks();
  const [title, setTitle] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await createTask({ title });
    setTitle("");
  };

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorState
        message="Failed to load tasks"
        onRetry={() => window.location.reload()}
      />
    );

  if (!tasks || tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks yet"
        description="Create your first task to organize work."
        actionLabel={creating ? "Creating..." : "Create Task"}
        onAction={submit}
      />
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
        Facility Tasks
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="New task title..."
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 8 }}
        />
        <Pressable
          onPress={submit}
          style={{ padding: 10, borderWidth: 1, borderRadius: 8 }}
        >
          <Text>{creating ? "Adding..." : "Add"}</Text>
        </Pressable>
      </View>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskRow task={item} onComplete={() => completeTask(item.id)} />
        )}
      />
    </View>
  );
}
