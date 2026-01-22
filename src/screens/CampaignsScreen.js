import React from "react";
import { View, Text, FlatList, StyleSheet, Button } from "react-native";

const campaigns = [
  { id: "1", name: "Spring Sale", status: "Active" },
  { id: "2", name: "Summer Launch", status: "Draft" },
  { id: "3", name: "Holiday Promo", status: "Completed" }
];

export default function CampaignsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Campaigns</Text>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.campaignRow}>
            <Text style={styles.campaignName}>{item.name}</Text>
            <Text style={styles.campaignStatus}>{item.status}</Text>
            <Button title="Edit" onPress={() => {}} />
          </View>
        )}
        ListEmptyComponent={<Text>No campaigns available.</Text>}
      />
      <View style={styles.actions}>
        <Button title="Add Campaign" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  campaignRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  campaignName: { fontSize: 18 },
  campaignStatus: { fontSize: 16, color: "#888" },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24
  }
});
