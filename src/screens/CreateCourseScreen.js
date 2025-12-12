import React, { useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import { createCourse } from "../api/courses";

export default function CreateCourseScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [cover, setCover] = useState("");

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync();
    if (!result.canceled) {
      setCover(result.assets[0].uri);
    }
  }

  async function submit() {
    await createCourse({
      title,
      description: desc,
      category,
      coverImage: cover,
      price: Number(price)
    });

    navigation.goBack();
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Create New Course</Text>

      <TouchableOpacity onPress={pickImage}>
        <Image
          source={{ uri: cover || "https://placehold.co/600x300" }}
          style={styles.cover}
        />
      </TouchableOpacity>

      <TextInput style={styles.input} placeholder="Course Title" value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.desc]}
        placeholder="Course Description"
        value={desc}
        onChangeText={setDesc}
        multiline
      />
      <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
      <TextInput style={styles.input} placeholder="Price ($0 for Free)" value={price} onChangeText={setPrice} />

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Create Course</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: "700", marginBottom: 10 },
  cover: { width: "100%", height: 200, borderRadius: 10, marginBottom: 15 },
  input: { backgroundColor: "#eee", padding: 12, borderRadius: 8, marginBottom: 10 },
  desc: { height: 120, textAlignVertical: "top" },
  btn: { backgroundColor: "#2ecc71", padding: 12, borderRadius: 10, marginTop: 10 },
  btnText: { color: "white", textAlign: "center", fontWeight: "700", fontSize: 16 }
});
