import React from "react";
import { View, Text, ActivityIndicator, FlatList, Button } from "react-native";
import EmptyState from "../../components/EmptyState";
import NotEntitledScreen from "../common/NotEntitledScreen";
import { useEntitlements } from "../../context/EntitlementsContext";
import { useLinks } from "../../hooks/useLinks";

export default function LinksScreen({ navigation }: any) {
  const { capabilities } = useEntitlements();
  if (!capabilities?.commercial) return <NotEntitledScreen />;

  const { data, isLoading, error, refetch } = useLinks();
  const links = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
          Couldn’t load links
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (links.length === 0) {
    return (
      <EmptyState
        title="No links yet"
        description="Generate your first link to drive traffic to your store."
        actionLabel="Generate your first link"
        onAction={() => navigation?.navigate?.("CreateLink")}
      />
    );
  }

  return (
    <FlatList
      data={links}
      keyExtractor={(l: any) => l.id}
      renderItem={({ item }) => (
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {item.label || item.url || "Untitled link"}
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>{item.url}</Text>

          <View style={{ marginTop: 8 }}>
            <Button
              title="Edit"
              onPress={() => navigation?.navigate?.("EditLink", { linkId: item.id })}
            />
          </View>
        </View>
      )}
    />
  );
}
