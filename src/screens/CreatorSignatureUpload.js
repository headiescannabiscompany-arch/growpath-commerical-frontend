import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import { uploadSignature } from "../api/creator";

export default function CreatorSignatureUpload({ navigation }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 1],
        quality: 1,
      });

      if (!res.canceled) {
        setImage(res.assets[0].uri);
      }
    } catch (_err) {
      Alert.alert("Error", "Failed to pick image");
    }
  }

  async function saveSignature() {
    if (!image) {
      Alert.alert("Error", "Please select a signature image");
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      data.append("signature", {
        uri: image,
        name: "signature.png",
        type: "image/png",
      });

      const res = await uploadSignature(data);
      setLoading(false);
      
      Alert.alert("Success", "Signature uploaded successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (_err) {
      setLoading(false);
      Alert.alert("Error", "Failed to upload signature");
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Upload Signature</Text>
      <Text style={styles.subtitle}>
        Your signature will appear on all certificates you issue
      </Text>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.pickBtn}
          onPress={pickImage}
          disabled={loading}
        >
          <Text style={styles.pickBtnText}>Select Signature Image</Text>
        </TouchableOpacity>

        {image && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Preview:</Text>
            <Image source={{ uri: image }} style={styles.preview} />
            <Text style={styles.previewNote}>
              Ideal signature size: 300x100 pixels (landscape)
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Guidelines</Text>
        <Text style={styles.guideline}>Use a transparent PNG image</Text>
        <Text style={styles.guideline}>Minimum width: 200px</Text>
        <Text style={styles.guideline}>Keep signature clear and readable</Text>
        <Text style={styles.guideline}>File size should be under 1MB</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, loading && styles.saveBtn_disabled]}
        onPress={saveSignature}
        disabled={loading || !image}
      >
        <Text style={styles.saveText}>
          {loading ? "Uploading..." : "Save Signature"}
        </Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  pickBtn: {
    backgroundColor: "#3498db",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  pickBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  previewContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12,
  },
  preview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    marginBottom: 12,
    resizeMode: "contain",
  },
  previewNote: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 12,
  },
  guideline: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
  saveBtn: {
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  saveBtn_disabled: {
    backgroundColor: "#bdc3c7",
  },
  saveText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
