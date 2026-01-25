import React from "react";
import { View, Text, ActivityIndicator, FlatList, Button } from "react-native";
import EmptyState from "../../components/EmptyState";
import NotEntitledScreen from "../common/NotEntitledScreen";
import { useEntitlements } from "../../context/EntitlementsContext";
import { useCampaigns } from "../../hooks/useCampaigns";

export default function CampaignsScreen({ navigation }: any) {
  const { capabilities } = useEntitlements();
  if (!capabilities?.commercial) return <NotEntitledScreen />;

  const { data, isLoading, error, refetch } = useCampaigns();
  const campaigns = Array.isArray(data) ? data : [];

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
          Couldn’t load campaigns
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="No campaigns yet"
        description="Create a campaign to promote products and drive traffic to your store."
        actionLabel="Create your first campaign"
        onAction={() => navigation?.navigate?.("CreateCampaign")}
      />
    );
  }

  return (
    <FlatList
      data={campaigns}
      keyExtractor={(c: any) => c.id}
      renderItem={({ item }) => (
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {item.name || "Untitled campaign"}
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>{item.status || "draft"}</Text>

          <View style={{ marginTop: 8 }}>
            <Button
              title="Edit"
              onPress={() =>
                navigation?.navigate?.("EditCampaign", { campaignId: item.id })
              }
            />
          </View>
        </View>
      )}
    />
  );
}
