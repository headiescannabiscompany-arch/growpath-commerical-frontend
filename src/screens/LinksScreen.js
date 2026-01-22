import React from "react";
import { View, Text, FlatList, StyleSheet, Button, Linking } from "react-native";

const links = [
  { id: "1", label: "Company Website", url: "https://company.com" },
  { id: "2", label: "Product Page", url: "https://company.com/products" },
  { id: "3", label: "Support", url: "https://company.com/support" }
];

export default function LinksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Links</Text>
      <FlatList
        data={links}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.linkRow}>
            <Text style={styles.linkLabel}>{item.label}</Text>
            <Button title="Open" onPress={() => Linking.openURL(item.url)} />
            <Button title="Edit" onPress={() => {}} />
          </View>
        )}
        ListEmptyComponent={<Text>No links available.</Text>}
      />
      <View style={styles.actions}>
        <Button title="Add Link" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  linkLabel: { fontSize: 18 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24
  }
});
