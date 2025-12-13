import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Alert
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { createPost } from "../api/forum";

export default function ForumNewPostScreen({ route, navigation }) {
  const photosFromLog = route.params?.photos || [];
  const notesFromLog = route.params?.content || "";
  const strainFromLog = route.params?.strain || "";
  const tagsFromLog = route.params?.tags || [];
  const growLogId = route.params?.fromGrowLogId || null;

  const [content, setContent] = useState(notesFromLog);
  const [photos, setPhotos] = useState(photosFromLog);
  const [strain, setStrain] = useState(strainFromLog);
  const [tags, setTags] = useState(tagsFromLog);
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  const categoryOptions = [
    { key: "general", label: "💬 General", desc: "General discussion" },
    { key: "help", label: "🆘 Help/Advice", desc: "Ask for help" },
    { key: "grow-log", label: "📔 Grow Log", desc: "Share your grow" },
    { key: "harvest", label: "🌿 Harvest/Cure", desc: "Show off results" },
    { key: "nutrients", label: "🧪 Nutrients", desc: "Feeding discussion" },
    { key: "genetics", label: "🧬 Genetics", desc: "Strains & breeders" },
    { key: "equipment", label: "⚡ Equipment", desc: "Lights, tents, etc." },
    { key: "techniques", label: "🎓 Techniques", desc: "Training & methods" }
  ];

  const tagOptions = [
    "yellowing",
    "nuteburn",
    "training",
    "deficiency",
    "overwatered",
    "underwatered",
    "stretch",
    "heatstress",
    "harvest",
    "pest",
    "autoflower",
    "photoperiod",
    "organic",
    "hydro"
  ];

  // ---------------------------------------
  // PICK PHOTOS
  // ---------------------------------------
  async function addPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos([...photos, ...uris]);
    }
  }

  // ---------------------------------------
  // TOGGLE TAG
  // ---------------------------------------
  function toggleTag(tag) {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  }

  // ---------------------------------------
  // SUBMIT POST
  // ---------------------------------------
  async function handleSubmit() {
    if (!content.trim() && photos.length === 0) {
      return Alert.alert("Empty Post", "Add text or at least one photo.");
    }

    try {
      setLoading(true);

      const payload = {
        content,
        photos,
        tags,
        strain,
        category,
        growLogId
      };

      await createPost(payload);

      setLoading(false);
      // Return to feed
      navigation.goBack();
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>New Guild Post</Text>

      {/* TEXT INPUT */}
      <TextInput
        style={[styles.input, styles.textBox]}
        placeholder="Share an update..."
        multiline
        value={content}
        onChangeText={setContent}
      />

      {/* CATEGORY */}
      <Text style={styles.label}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {categoryOptions.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setCategory(cat.key)}
            style={[
              styles.categoryButton,
              category === cat.key && styles.categoryButtonActive
            ]}
          >
            <Text
              style={
                category === cat.key ? styles.categoryTextActive : styles.categoryText
              }
            >
              {cat.label}
            </Text>
            <Text style={styles.categoryDesc}>{cat.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* STRAIN INPUT */}
      <Text style={styles.label}>Strain (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Blueberry Muffin, Gelato #33, etc."
        value={strain}
        onChangeText={setStrain}
      />

      {/* TAGS */}
      <Text style={styles.label}>Tags</Text>
      <View style={styles.tagsContainer}>
        {tagOptions.map((tag) => (
          <TouchableOpacity
            key={tag}
            onPress={() => toggleTag(tag)}
            style={[styles.tag, tags.includes(tag) && styles.tagSelected]}
          >
            <Text style={tags.includes(tag) ? styles.tagTextSelected : styles.tagText}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PHOTO GRID */}
      <Text style={styles.label}>Photos</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.photo} />
        ))}

        <TouchableOpacity style={styles.addPhotoBox} onPress={addPhotos}>
          <Text style={styles.plus}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* SUBMIT BUTTON */}
      <PrimaryButton
        title={loading ? "Posting..." : "Post"}
        onPress={handleSubmit}
        disabled={loading}
        style={{ marginTop: 20 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 10
  },
  input: {
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15
  },
  textBox: {
    height: 140,
    textAlignVertical: "top"
  },
  label: {
    fontWeight: "600",
    marginBottom: 5
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10
  },
  tag: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8
  },
  tagSelected: {
    backgroundColor: "#2ecc71"
  },
  tagText: {
    color: "#333"
  },
  tagTextSelected: {
    color: "white"
  },
  categoryButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 2,
    borderColor: "#E5E7EB"
  },
  categoryButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981"
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2
  },
  categoryTextActive: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2
  },
  categoryDesc: {
    fontSize: 11,
    color: "#9CA3AF"
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10
  },
  addPhotoBox: {
    width: 90,
    height: 90,
    backgroundColor: "#eaeaea",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  plus: {
    fontSize: 30,
    color: "#777"
  }
});
