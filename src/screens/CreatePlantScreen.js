import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { createPlant } from "../api/plants";
import { maybePromptAttachPhotosToGrow } from "@/utils/growPhotoAttachment";
import { persistImageUris } from "@/utils/photoUploads";
import { radius } from "../theme/theme";

export default function CreatePlantScreen({ navigation }) {
  const [name, setName] = useState("");
  const [strain, setStrain] = useState("");
  const [growMedium, setGrowMedium] = useState("Soil");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const mediumOptions = ["Soil", "Coco", "Hydro", "Aeroponics", "Other"];

  // Pick photos
  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Photo library permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos([...photos, ...uris]);
    }
  }

  // Pick video
  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Photo library permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 60 // 60 second limit
    });

    if (!result.canceled && result.assets[0]) {
      setVideo(result.assets[0]);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter a name for your plant");
      return;
    }
    if (!strain.trim()) {
      Alert.alert("Missing Strain", "Please enter the strain name");
      return;
    }
    try {
      setLoading(true);
      const uploadedPhotos = await persistImageUris(photos);
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("strain", strain.trim());
      formData.append("growMedium", growMedium);
      formData.append("notes", notes.trim());
      formData.append("startDate", new Date().toISOString());
      formData.append("stage", "Seedling");
      uploadedPhotos.forEach((uri) => formData.append("photos", uri));
      // Video
      if (video && video.uri) {
        const filename = video.uri.split("/").pop();
        formData.append("video", video.uri, filename);
      }
      const newPlant = await createPlant(formData);
      if (uploadedPhotos.length) {
        try {
          await maybePromptAttachPhotosToGrow(uploadedPhotos);
        } catch (attachError) {
          console.warn("Unable to attach plant photos to grow:", attachError);
        }
      }
      Alert.alert("Success", "Plant created! Start tracking your grow.", [
        {
          text: "View Plant",
          onPress: () => navigation.replace("PlantDetail", { plantId: newPlant._id })
        }
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create plant");
    } finally {
      setLoading(false);
    }
  }

  // Move upload buttons to top for better UX
  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Create New Grow</Text>

        {/* Photos & Video at Top */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos (Optional)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickPhotos}>
            <Text style={styles.uploadButtonText}>Add Photos</Text>
          </TouchableOpacity>
          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.photoThumb} />
              ))}
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Video (Optional)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
            <View style={styles.uploadButtonContent}>
              <MaterialCommunityIcons
                name={video ? "check-circle" : "video-plus"}
                size={18}
                color="#FFF"
              />
              <Text style={styles.uploadButtonText}>
                {video ? "Video Added" : "Add Video"}
              </Text>
            </View>
          </TouchableOpacity>
          {video && (
            <Text style={styles.videoInfo}>Video: {Math.round(video.duration)}s</Text>
          )}
        </View>

        {/* Plant Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Plant Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Plant #1, Northern Lights"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Strain */}
        <View style={styles.section}>
          <Text style={styles.label}>Strain *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Girl Scout Cookies"
            value={strain}
            onChangeText={setStrain}
          />
        </View>

        {/* Grow Medium */}
        <View style={styles.section}>
          <Text style={styles.label}>Grow Medium</Text>
          <View style={styles.mediumGrid}>
            {mediumOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.mediumOption,
                  growMedium === option && styles.mediumOptionSelected
                ]}
                onPress={() => setGrowMedium(option)}
              >
                <Text
                  style={[
                    styles.mediumText,
                    growMedium === option && styles.mediumTextSelected
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add any notes about this grow..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Create Button */}
        <PrimaryButton
          title={loading ? "Creating..." : "Create Grow"}
          onPress={handleCreate}
          disabled={loading}
          style={{}}
          textStyle={{}}
        >
          <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 16 }}>
            {loading ? "Creating..." : "Create Grow"}
          </Text>
        </PrimaryButton>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20
  },
  section: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: radius.card,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#DDD"
  },
  textArea: {
    height: 100
  },
  mediumGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  mediumOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: "#F0F0F0",
    borderWidth: 2,
    borderColor: "#F0F0F0"
  },
  mediumOptionSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#28A745"
  },
  mediumText: {
    fontSize: 14,
    color: "#666"
  },
  mediumTextSelected: {
    color: "#28A745",
    fontWeight: "600"
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: radius.card,
    alignItems: "center"
  },
  uploadButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  uploadButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600"
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.card
  },
  videoInfo: {
    marginTop: 8,
    fontSize: 14,
    color: "#666"
  }
});
