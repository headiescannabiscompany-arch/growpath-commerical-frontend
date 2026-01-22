import React from "react";
import { View, Text, FlatList, StyleSheet, Button } from "react-native";

const products = [
  { id: "1", name: "Product A", price: "$19.99" },
  { id: "2", name: "Product B", price: "$29.99" },
  { id: "3", name: "Product C", price: "$39.99" }
];

export default function StorefrontScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Storefront</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.productRow}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productPrice}>{item.price}</Text>
            <Button title="Edit" onPress={() => {}} />
          </View>
        )}
        ListEmptyComponent={<Text>No products available.</Text>}
      />
      <View style={styles.actions}>
        <Button title="Add Product" onPress={() => {}} />
        <Button title="Storefront Settings" onPress={() => {}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  productName: { fontSize: 18 },
  productPrice: { fontSize: 16, color: "#888" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 24
  }
});
