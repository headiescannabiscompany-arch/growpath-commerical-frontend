import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function InventoryRow({
  item,
  onEdit
}: {
  item: { id: string; name: string; quantity: number; unit?: string };
  onEdit?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.qty}>
          {item.quantity} {item.unit || ""}
        </Text>
      </View>
      {onEdit && (
        <Pressable style={styles.editBtn} onPress={onEdit}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8
  },
  name: {
    fontWeight: "600",
    fontSize: 16
  },
  qty: {
    opacity: 0.7,
    fontSize: 14
  },
  editBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  editText: {
    color: "#fff",
    fontWeight: "bold"
  }
});
