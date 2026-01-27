import React, { useState } from "react";
import { View, Text, TextInput, Button } from "react-native";

export default function CreateVendorGuide() {
  const [title, setTitle] = useState("");

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Create Vendor Guide</Text>
      <TextInput
        placeholder="Guide title"
        value={title}
        onChangeText={setTitle}
        style={{ borderWidth: 1, padding: 10, marginVertical: 10 }}
      />
      <Button title="Save Guide" onPress={() => alert("Saved")} />
    </View>
  );
}
