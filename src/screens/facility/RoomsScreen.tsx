import React from "react";
import { FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import RoomCard from "../../components/RoomCard";
import { useRooms } from "../../hooks/useRooms";

export default function RoomsScreen() {
  const navigation = useNavigation<any>();
  const { data: rooms, isLoading, error, refetch } = useRooms();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message="Failed to load rooms" onRetry={refetch} />;

  if (!rooms || rooms.length === 0) {
    return (
      <EmptyState
        title="No rooms yet"
        description="Create your first room to start tracking plants."
        actionLabel="Create Room"
        onAction={() => navigation.navigate("CreateRoom")}
      />
    );
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(r) => r.id}
      renderItem={({ item }) => (
        <RoomCard
          room={item}
          onPress={() => navigation.navigate("RoomDetail", { roomId: item.id })}
        />
      )}
    />
  );
}
