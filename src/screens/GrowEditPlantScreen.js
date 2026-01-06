import React, { useState } from "react";
import { Alert, Text } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import PlantCard from "../components/PlantCard";
import PrimaryButton from "../components/PrimaryButton";
import { uploadPlantPhoto, updatePlant } from "../api/plants";
import * as ImagePicker from "expo-image-picker";
import PlantSaveModal from "../components/PlantSaveModal";
import { spacing } from "../theme/theme";
import { CommonActions } from "@react-navigation/native";

function sanitizePlant(payload) {
  const trim = (value) => (typeof value === "string" ? value.trim() : value);
  const result = {
    name: trim(payload.name) || undefined,
    strain: trim(payload.strain) || undefined,
    breeder: trim(payload.breeder) || undefined,
    stage: payload.stage || undefined
  };
  if (payload.photoUrl) {
    result.photos = [payload.photoUrl];
  } else if (Array.isArray(payload.photos)) {
    result.photos = payload.photos;
  }
  return result;
}

export default function GrowEditPlantScreen({ route, navigation }) {
  const initialPlant = route.params?.plant;
  const parentGrow = route.params?.grow;
  const parentKey = route.params?.parentKey;
  if (!initialPlant || !parentGrow) {
    return (
      <ScreenContainer>
        <Text style={{ padding: spacing(4), fontSize: 16 }}>
          We couldn’t load this plant. Please go back to the grow and try again.
        </Text>
        <PrimaryButton title="Back to Grow" onPress={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }
  const [plant, setPlant] = useState({
    ...initialPlant,
    photoPreview: null,
    photoUrl: null,
    uploadingPhoto: false
  });
  const [saving, setSaving] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);

  async function handleAddPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Photo library access is required to add plant photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const file = {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || asset.uri.split("/").pop() || "plant-photo.jpg"
    };
    setPlant((prev) => ({ ...prev, uploadingPhoto: true }));
    try {
      const uploaded = await uploadPlantPhoto(file);
      if (uploaded?.url) {
        setPlant((prev) => ({
          ...prev,
          photoUrl: uploaded.url,
          photoPreview: asset.uri
        }));
      }
    } catch (err) {
      Alert.alert("Upload failed", err.message || "Unable to upload plant photo.");
    } finally {
      setPlant((prev) => ({ ...prev, uploadingPhoto: false }));
    }
  }

  function updateField(field, value) {
    setPlant((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!initialPlant?._id) {
      Alert.alert("Missing Plant", "Return to the grow and try again.");
      return;
    }
    try {
      setSaving(true);
      const payload = sanitizePlant(plant);
      const updated = await updatePlant(initialPlant._id, payload);
      setPendingUpdate(updated);
      setSuccessModalVisible(true);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update plant.");
    } finally {
      setSaving(false);
    }
  }

  function handleSuccessConfirm() {
    setSuccessModalVisible(false);
    if (parentKey) {
      navigation.dispatch((state) => {
        const routes = state.routes.slice(0, state.routes.length - 1).map((route) =>
          route.key === parentKey
            ? {
                ...route,
                params: { ...(route.params || {}), grow: parentGrow, updatedPlant: pendingUpdate }
              }
            : route
        );
        return CommonActions.reset({
          ...state,
          routes,
          index: routes.length - 1
        });
      });
    } else {
      navigation.goBack();
    }
    setPendingUpdate(null);
  }

  return (
    <ScreenContainer scroll>
      <PlantCard
        mode="edit"
        title={`Edit ${initialPlant?.name || "Plant"}`}
        value={plant}
        onChange={updateField}
        onAddPhoto={handleAddPhoto}
        uploadingPhoto={plant.uploadingPhoto}
      />

      <PrimaryButton title={saving ? "Saving..." : "Save Changes"} onPress={handleSave} disabled={saving} />
      <PlantSaveModal
        visible={successModalVisible}
        plantName={pendingUpdate?.name || initialPlant?.name}
        onConfirm={handleSuccessConfirm}
      />
    </ScreenContainer>
  );
}
