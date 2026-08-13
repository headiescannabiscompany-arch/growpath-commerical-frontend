import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";

export default function InventoryRow({
  item,
  onEdit
}: {
  item: { id: string; name: string; quantity: number; unit?: string };
  onEdit?: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <View>
        <Text style={[styles.name, { color: palette.text }]}>{item.name}</Text>
        <Text style={[styles.qty, { color: palette.textMuted }]}>
          {item.quantity} {item.unit || ""}
        </Text>
      </View>
      {onEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit inventory item ${item.name}`}
          style={[styles.editBtn, { backgroundColor: palette.accent }]}
          onPress={onEdit}
        >
          <Text style={[styles.editText, { color: palette.accentText }]}>Edit</Text>
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
    borderRadius: radius.card,
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
    borderRadius: radius.pill,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44,
    paddingVertical: 6,
    paddingHorizontal: 12
  },
  editText: { fontWeight: "bold" }
});
