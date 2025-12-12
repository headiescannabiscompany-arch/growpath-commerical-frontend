import React, { useState } from "react";
import { Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import { uploadLabel } from "../api/feeding";

export default function FeedingLabelScreen({ navigation }) {
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function extract() {
    setLoading(true);
    const res = await uploadLabel(photo);
    setLoading(false);
    navigation.navigate("FeedingConfirm", { nutrientData: res.data.nutrientData });
  }

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 26, fontWeight: "700" }}>Scan Nutrient Label</Text>

      <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: "#3498db", borderRadius: 8 }} onPress={pick}>
        <Text style={{ color: "white", textAlign: "center" }}>Select Label Photo</Text>
      </TouchableOpacity>

      {photo && <Image source={{ uri: photo }} style={{ width: "100%", height: 260, borderRadius: 12, marginTop: 20 }} />}

      {photo && !loading && (
        <TouchableOpacity style={{ marginTop: 20, padding: 12, backgroundColor: "#2ecc71", borderRadius: 8 }} onPress={extract}>
          <Text style={{ color: "white", textAlign: "center" }}>Extract Nutrients</Text>
        </TouchableOpacity>
      )}

      {loading && <ActivityIndicator size="large" color="#2ecc71" />}
    </ScreenContainer>
  );
}
