import React, { useState } from "react";
import { Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import PlantCard from "../components/PlantCard";
import PrimaryButton from "../components/PrimaryButton";
import { uploadPlantPhoto } from "../api/plants";
import { addPlantToGrow } from "../api/grows";
import * as ImagePicker from "expo-image-picker";
import { CommonActions } from "@react-navigation/native";

const initialPlant = () => ({
  name: "",
  strain: "",
  breeder: "",
  stage: "",
  photoUrl: null,
  photoPreview: null,
  uploadingPhoto: false
});

function sanitizePlant(plant) {
  const trim = (value) => (typeof value === "string" ? value.trim() : value);
  const payload = {
    name: trim(plant.name) || undefined,
    strain: trim(plant.strain) || undefined,
    breeder: trim(plant.breeder) || undefined,
    stage: trim(plant.stage) || undefined
  };
  if (plant.photoUrl) {
    payload.photos = [plant.photoUrl];
  }
  return payload;
}

export default function GrowAddPlantScreen({ route, navigation }) {
  const growId = route.params?.growId;
  const growName = route.params?.growName || "Grow";
  const parentKey = route.params?.parentKey;

  const [plant, setPlant] = useState(initialPlant());
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setPlant((prev) => ({ ...prev, [field]: value }));
  }

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

  async function handleSave() {
    if (!growId) {
      Alert.alert("Missing Grow", "Return to the grow and try again.");
      return;
    }
    if (!plant.name.trim() && !plant.strain.trim()) {
      Alert.alert("Add details", "Enter at least a plant name or strain.");
      return;
    }

    try {
      setSaving(true);
      const payload = sanitizePlant(plant);
      const response = await addPlantToGrow(growId, payload);
      if (parentKey) {
        navigation.dispatch((state) => {
          const routes = state.routes.slice(0, state.routes.length - 1).map((route) =>
            route.key === parentKey
              ? {
                  ...route,
                  params: { ...(route.params || {}), appendedPlant: response?.plant }
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
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to add plant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <PlantCard
        mode="create"
        title={`Add Plant to ${growName}`}
        value={plant}
        onChange={updateField}
        onAddPhoto={handleAddPhoto}
        uploadingPhoto={plant.uploadingPhoto}
      />

      <PrimaryButton title={saving ? "Adding..." : "Add Plant"} onPress={handleSave} disabled={saving} />
    </ScreenContainer>
  );
}
