import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Platform } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { createPost } from "../api/posts";
import { useAuth } from "../context/AuthContext.js";
import { useNavigation } from "@react-navigation/native";
let ImagePicker;
if (Platform.OS !== "web") {
  ImagePicker = require("expo-image-picker");
}

export default function CreatePostScreen() {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]);
  const { isPro } = useAuth();
  const navigation = useNavigation();

  async function pickImage() {
    if (Platform.OS === "web") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  async function submit() {
    const form = new FormData();
    form.append("text", text);

    for (const photo of photos) {
      // For web/TypeScript compatibility, use Blob and filename
      if (Platform.OS === "web") {
        const response = await fetch(photo);
        const blob = await response.blob();
        form.append("photos", blob, photo.fileName || `photo.jpg`);
      } else {
        form.append("photos", {
          uri: photo,
          name: `photo_${photos.indexOf(photo)}.jpg`,
          type: "image/jpeg"
        });
      }
    }

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
        style={{
          marginTop: 12,
          padding: 10,
          backgroundColor: "#eee",
          borderRadius: 8,
          height: 120
        }}
        editable={isPro}
      />

      {Platform.OS === "web" ? (
        <View
          style={{ marginTop: 12, backgroundColor: "#eee", padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: "#888", textAlign: "center" }}>
            Photo upload is available on mobile only.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={{
            marginTop: 12,
            backgroundColor: isPro ? "#3498db" : "#ccc",
            padding: 12,
            borderRadius: 8
          }}
          onPress={isPro ? pickImage : undefined}
          disabled={!isPro}
        >
          <Text style={{ color: isPro ? "white" : "#888", textAlign: "center" }}>
            Add Photos
          </Text>
        </TouchableOpacity>
      )}

      {photos.map((uri) => (
        <Image
          key={uri}
          source={{ uri }}
          style={{ width: "100%", height: 180, marginTop: 10 }}
        />
      ))}

      {!isPro && (
        <View
          style={{
            marginTop: 18,
            backgroundColor: "#FEF3C7",
            borderRadius: 8,
            padding: 14
          }}
        >
          <Text style={{ color: "#92400E", textAlign: "center", fontSize: 15 }}>
            Posting is a Pro feature. Upgrade to Pro to share posts and photos with the
            community.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 10,
              backgroundColor: "#10B981",
              padding: 10,
              borderRadius: 8
            }}
            onPress={() => navigation.navigate && navigation.navigate("Subscription")}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
              Upgrade to Pro
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={{
          marginTop: 20,
          backgroundColor: isPro ? "#2ecc71" : "#ccc",
          padding: 14,
          borderRadius: 8
        }}
        onPress={isPro ? submit : undefined}
        disabled={!isPro}
      >
        <Text
          style={{ color: isPro ? "white" : "#888", fontSize: 18, textAlign: "center" }}
        >
          Post
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}
