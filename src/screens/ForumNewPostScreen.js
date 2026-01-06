import React, { useState, useMemo } from "react";
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
import { useQueryClient } from "@tanstack/react-query";

import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { createPost } from "../api/forum";
import { uploadImage } from "../api/uploads";
import { getAllTags } from "../config/interests";

const categoryOptions = [
  { key: "general", label: "General", desc: "Updates, questions, daily logs" },
  { key: "diagnostics", label: "Diagnostics", desc: "Ask for help identifying issues" },
  { key: "training", label: "Training", desc: "Techniques, LST/HST, shaping" },
  { key: "harvest", label: "Harvest", desc: "Drying, curing, post-harvest" },
  { key: "gear", label: "Gear & Setup", desc: "Lights, tents, hardware" }
];

const MASTER_TAGS = getAllTags();

export default function ForumNewPostScreen({ route, navigation }) {
  const queryClient = useQueryClient();
  const photosFromLog = route.params?.photos || [];
  const notesFromLog = route.params?.content || "";
  const strainFromLog = route.params?.strain || "";
  const tagsFromLog = route.params?.tags || [];
  const growLogId = route.params?.fromGrowLogId || null;

  const [content, setContent] = useState(notesFromLog);
  const [photos, setPhotos] = useState(photosFromLog);
  const [strain, setStrain] = useState(strainFromLog);
  
  // Tagging state
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState(tagsFromLog);
  const [suggestions, setSuggestions] = useState([]);

  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);

  // ... rest of state

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
  // TAGGING LOGIC
  // ---------------------------------------
  const handleTagTextChange = (text) => {
    setTagInput(text);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    const query = text.toLowerCase();
    const matches = MASTER_TAGS.filter(
      (t) => t.toLowerCase().includes(query) && !selectedTags.includes(t)
    ).slice(0, 5); // Limit suggestions
    setSuggestions(matches);
  };

  const addTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagInput("");
    setSuggestions([]);
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  // ---------------------------------------
  // SUBMIT POST
  // ---------------------------------------
  async function handleSubmit() {
    let finalContent = content;
    const finalTags = [...selectedTags];

    // Process pending tag input if any
    if (tagInput.trim()) {
      const inputs = tagInput.split(",").map(t => t.trim()).filter(Boolean);
      inputs.forEach(input => {
        // Check exact match (case insensitive)
        const match = MASTER_TAGS.find(t => t.toLowerCase() === input.toLowerCase());
        if (match) {
          if (!finalTags.includes(match)) finalTags.push(match);
        } else {
          // Invalid tag -> inject as hashtag
          // Remove punctuation for cleanliness
          const cleanTag = input.replace(/[^\w]/g, "");
          if (cleanTag) {
            finalContent += ` #${cleanTag}`;
          }
        }
      });
    }

    if (!finalContent.trim() && photos.length === 0) {
      return Alert.alert("Empty Post", "Add text or at least one photo.");
    }

    try {
      setLoading(true);

      const uploadedPhotos = [];
      for (const uri of photos) {
        // If it looks like a remote URL, keep it
        if (uri.startsWith("http") || uri.startsWith("/")) {
          uploadedPhotos.push(uri);
        } else {
          // Upload local file
          const res = await uploadImage(uri);
          if (res?.url) {
            uploadedPhotos.push(res.url);
          }
        }
      }

      const payload = {
        content: finalContent,
        photos: uploadedPhotos,
        tags: finalTags,
        strain,
        category,
        growLogId
      };

      await createPost(payload);
      
      // Invalidate feed cache
      queryClient.invalidateQueries({ queryKey: ["forum-feed"] });

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
      <Text style={styles.header}>New Forum Post</Text>

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

      {/* TAGS INPUT */}
      <Text style={styles.label}>Tags</Text>
      <View style={styles.tagInputContainer}>
        {selectedTags.map((tag) => (
          <TouchableOpacity key={tag} onPress={() => removeTag(tag)} style={styles.selectedTag}>
            <Text style={styles.selectedTagText}>{tag} ✕</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.tagInput}
          placeholder={selectedTags.length === 0 ? "Type to search tags..." : "Add more..."}
          value={tagInput}
          onChangeText={handleTagTextChange}
          onSubmitEditing={() => {
             // Treat enter as comma
             if(tagInput.trim()) {
                // If exact match found in master, add it. Else add comma to trigger processing later?
                // Actually handleSubmit handles leftover.
                // But for UX, let's just clear and let submit handle it, OR try to resolve now.
                // Let's resolve valid ones immediately for feedback.
                const match = MASTER_TAGS.find(t => t.toLowerCase() === tagInput.trim().toLowerCase());
                if (match) {
                    addTag(match);
                }
             }
          }}
        />
      </View>
      
      {/* SUGGESTIONS */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s} onPress={() => addTag(s)} style={styles.suggestionPill}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={styles.helperText}>
        Custom tags will be converted to #hashtags in your post body.
      </Text>

      {/* PHOTO GRID */}
      <Text style={[styles.label, { marginTop: 16 }]}>Photos</Text>
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
  tagInputContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    padding: 8,
    minHeight: 50,
    alignItems: "center",
    gap: 8
  },
  tagInput: {
    flex: 1,
    minWidth: 120,
    fontSize: 15
  },
  selectedTag: {
    backgroundColor: "#2ecc71",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12
  },
  selectedTagText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 4
  },
  suggestionPill: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#c8e6c9"
  },
  suggestionText: {
    color: "#2ecc71",
    fontSize: 13,
    fontWeight: "500"
  },
  helperText: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 10
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
