import { useState } from "react";
import { View, TextInput, Button } from "react-native";
import { useInventoryItem, useUpdateInventoryItem } from "../hooks";

export default function InventoryEdit({ route, navigation }: any) {
  const { id } = route.params;
  const { data } = useInventoryItem(id);
  const update = useUpdateInventoryItem(id);

  const [quantity, setQuantity] = useState(String(data?.quantity || ""));

  if (!data) return null;

  return (
    <View>
      <TextInput value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <Button
        title="Save"
        onPress={() =>
          update.mutate(
            { quantity: Number(quantity) },
            { onSuccess: () => navigation.goBack() }
          )
        }
      />
    </View>
  );
}
