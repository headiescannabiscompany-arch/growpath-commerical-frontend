import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import { updateAvatar, updateBanner, updateBio } from "../api/profile";

export default function EditProfileScreen({ navigation }) {
  const [bio, setBio] = useState(global.user.bio || "");
  const [avatar, setAvatar] = useState(global.user.avatar || "");
  const [banner, setBanner] = useState(global.user.banner || "");

  async function pickImage(setter) {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });

    if (!res.canceled) {
      setter(res.assets[0].uri);
    }
  }

  async function save() {
    try {
      if (bio !== global.user.bio) await updateBio(bio);
      if (avatar !== global.user.avatar) await updateAvatar(avatar);
      if (banner !== global.user.banner) await updateBanner(banner);

      Alert.alert("Saved", "Profile updated.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Edit Profile</Text>

      <Text style={styles.label}>Avatar</Text>
      <TouchableOpacity onPress={() => pickImage(setAvatar)}>
        <Image source={{ uri: avatar }} style={styles.avatar} />
      </TouchableOpacity>

      <Text style={styles.label}>Banner</Text>
      <TouchableOpacity onPress={() => pickImage(setBanner)}>
        <Image source={{ uri: banner }} style={styles.banner} />
      </TouchableOpacity>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={styles.input}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <TouchableOpacity style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 22, fontWeight: "700" },
  label: { marginTop: 15, fontWeight: "600" },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  banner: { width: "100%", height: 100, borderRadius: 10, marginTop: 10 },
  input: {
    backgroundColor: "#eee",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    height: 100,
    textAlignVertical: "top"
  },
  saveBtn: {
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20
  },
  saveText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700",
    fontSize: 16
  }
});
