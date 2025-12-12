import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import { createPost } from "../api/posts";

export default function CreatePostScreen({ navigation }) {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  async function submit() {
    const form = new FormData();
    form.append("text", text);

    photos.forEach((uri, i) => {
      form.append("photos", { uri, name: `photo_${i}.jpg`, type: "image/jpeg" });
    });

    await createPost(form);
    navigation.goBack();
  }

  return (
    <ScreenContainer>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Create Post</Text>

      <TextInput
        placeholder="Say something about your grow..."
        multiline
        value={text}
        onChangeText={setText}
        style={{ marginTop: 12, padding: 10, backgroundColor: "#eee", borderRadius: 8, height: 120 }}
      />

      <TouchableOpacity style={{ marginTop: 12, backgroundColor: "#3498db", padding: 12, borderRadius: 8 }} onPress={pickImage}>
        <Text style={{ color: "white", textAlign: "center" }}>Add Photos</Text>
      </TouchableOpacity>

      {photos.map((uri) => (
        <Image key={uri} source={{ uri }} style={{ width: "100%", height: 180, marginTop: 10 }} />
      ))}

      <TouchableOpacity style={{ marginTop: 20, backgroundColor: "#2ecc71", padding: 14, borderRadius: 8 }} onPress={submit}>
        <Text style={{ color: "white", fontSize: 18, textAlign: "center" }}>Post</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
