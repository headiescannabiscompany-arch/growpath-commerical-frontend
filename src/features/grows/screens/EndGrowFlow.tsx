import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useUpdateGrow } from "../hooks";

export default function EndGrowFlow() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = (route.params || {}) as any;
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [yieldAmount, setYieldAmount] = useState("");
  const updateGrow = useUpdateGrow();

  const handleEnd = async () => {
    await updateGrow.mutateAsync({ id, endDate, notes, yield: yieldAmount });
    (navigation as any).navigate("HarvestSummary", { id });
  };

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>End Grow</Text>
      <TextInput
        placeholder="End Date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        style={{ borderWidth: 1, marginVertical: 8, padding: 8 }}
      />
      <TextInput
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        style={{ borderWidth: 1, marginVertical: 8, padding: 8 }}
      />
      <TextInput
        placeholder="Yield (optional)"
        value={yieldAmount}
        onChangeText={setYieldAmount}
        style={{ borderWidth: 1, marginVertical: 8, padding: 8 }}
      />
      <Button title="End Grow" onPress={handleEnd} disabled={!endDate} />
    </View>
  );
}
