import React, { useState, useCallback, useEffect, useRef } from "react";
import { Text, TextInput, TouchableOpacity, Image, FlatList, StyleSheet, Alert, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { addEntry, uploadEntryPhoto } from "../api/grows";
import { getEntries as getGrowEntries } from "../api/growlog";
import { useAuth } from "../context/AuthContext";
import PlantCard from "../components/PlantCard";
import GrowInterestPicker from "../components/GrowInterestPicker";
import {
  buildEmptyTierSelection,
  flattenTierSelections,
  groupTagsByTier
} from "../utils/growInterests";

export default function GrowJournalScreen({ route, navigation }) {
  const { isPro } = useAuth();
  const growRef = useRef(route.params?.grow);
  const GROW_TAG_TIERS = [1, 2, 3, 5, 6];

  useEffect(() => {
    if (route.params?.grow) {
      growRef.current = route.params.grow;
    }
  }, [route.params?.grow]);

  useEffect(() => {
    if (route.params?.grow?.growTags) {
      setGrowInterestSelections(groupTagsByTier(route.params.grow.growTags));
    } else if (route.params?.grow) {
      setGrowInterestSelections(buildEmptyTierSelection());
    }
  }, [route.params?.grow]);

  const grow = growRef.current;
  const [entries, setEntries] = useState(grow?.entries || []);
  const [plants, setPlants] = useState(grow?.plants || []);
  const [note, setNote] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [selectedPlantIds, setSelectedPlantIds] = useState([]);
  const [growInterestSelections, setGrowInterestSelections] = useState(() =>
    groupTagsByTier(grow?.growTags || [])
  );
  const growId = grow?._id;
  if (!grow) {
    return (
      <ScreenContainer>
        <Text style={{ fontSize: 16, padding: spacing(4) }}>
          We couldn’t load this grow. Please return to Plants and open it again.
        </Text>
      </ScreenContainer>
    );
  }

  useEffect(() => {
    if (route.params?.appendedPlant) {
      setPlants((prev) => [...prev, route.params.appendedPlant]);
      navigation.setParams({ appendedPlant: undefined });
    }
  }, [route.params?.appendedPlant, navigation]);

  useEffect(() => {
    if (route.params?.updatedPlant) {
      setPlants((prev) =>
        prev.map((plant) =>
          plant._id === route.params.updatedPlant._id ? route.params.updatedPlant : plant
        )
      );
      navigation.setParams({ updatedPlant: undefined });
    }
  }, [route.params?.updatedPlant, navigation]);

  const loadEntries = useCallback(async () => {
    if (!growId) return;
    try {
      setLoadingEntries(true);
      const response = await getGrowEntries({ grow: growId });
      setEntries(Array.isArray(response) ? response : []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoadingEntries(false);
    }
  }, [growId]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  async function handleAddEntry() {
    if (!note.trim()) {
      return Alert.alert("Missing Note", "Please add a brief note before saving.");
    }
    if (!growId) {
      return Alert.alert("Missing Grow", "Please reopen this grow and try again.");
    }

    try {
      setAddingEntry(true);
      const payload = { note: note.trim() };
      payload.growTags = flattenTierSelections(growInterestSelections);
      if (selectedPlantIds.length > 0) {
        payload.plants = selectedPlantIds;
      }
      await addEntry(growId, payload);
      await loadEntries();
      setNote("");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setAddingEntry(false);
    }
  }

  async function pickImage() {
    if (!growId) {
      return Alert.alert("Missing Grow", "Please reopen this grow and try again.");
    }
    if (!isPro) {
      return Alert.alert("Pro Feature", "Uploading photos requires Pro.", [
        { text: "Cancel" },
        { text: "Go Pro", onPress: () => navigation.navigate("Subscribe") }
      ]);
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });

    if (!result.cancelled && !result.canceled) {
      const file = {
        uri: result.uri || result.assets[0].uri,
        type: "image/jpeg",
        name: "photo.jpg"
      };

      try {
        setUploadingPhoto(true);
        const uploaded = await uploadEntryPhoto(growId, file);
        if (uploaded?.url) {
          const payload = {
            photos: [uploaded.url],
            growTags: flattenTierSelections(growInterestSelections)
          };
          if (selectedPlantIds.length > 0) {
            payload.plants = selectedPlantIds;
          }
          await addEntry(growId, payload);
          await loadEntries();
          Alert.alert("Success", "Photo uploaded to your grow log.");
        }
      } catch (err) {
        Alert.alert("Error", err.message);
      } finally {
        setUploadingPhoto(false);
      }
    }
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>{grow.name}</Text>

      <Card style={{ marginBottom: spacing(5) }}>
        <Text style={styles.label}>Plants in this grow</Text>
        <View style={styles.plantList}>
        {Array.isArray(plants) && plants.length > 0 ? (
          plants.map((plant) => (
            <TouchableOpacity
              key={plant._id || plant.name}
              onPress={() =>
                navigation.navigate("GrowEditPlant", {
                  growId: grow._id,
                  plant,
                  grow,
                  parentKey: route.key
                })
              }
            >
              <PlantCard
                mode="view"
                value={plant}
                placeholderText="No photo uploaded"
                style={{ marginBottom: spacing(3) }}
              />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyCopy}>No plants are linked to this grow yet.</Text>
        )}

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("GrowAddPlant", {
                growId: grow._id,
                growName: grow.name,
                grow,
                parentKey: route.key
              })
            }
          >
            <PlantCard
              mode="view"
              variant="small"
              value={{ name: "Add Plant" }}
              placeholderText="+"
              style={styles.addPlantCard}
            />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Add note */}
      <Card style={{ marginBottom: spacing(6) }}>
        <Text style={styles.label}>New Entry</Text>
        {plants.length > 0 ? (
          <View style={{ marginBottom: spacing(3) }}>
            <Text style={styles.helperText}>Optional: attach this entry to a plant</Text>
            <View style={styles.plantPillRow}>
              <TouchableOpacity
                style={[
                  styles.plantPill,
                  selectedPlantIds.length === 0 && styles.plantPillActive
                ]}
                onPress={() => setSelectedPlantIds([])}
              >
                <Text style={selectedPlantIds.length === 0 ? styles.plantPillTextActive : styles.plantPillText}>
                  Entire grow
                </Text>
              </TouchableOpacity>
              {plants.map((plant) => {
                const isActive = selectedPlantIds.includes(plant._id);
                return (
                  <TouchableOpacity
                    key={plant._id}
                    style={[
                      styles.plantPill,
                      isActive && styles.plantPillActive
                    ]}
                    onPress={() =>
                      setSelectedPlantIds((prev) => {
                         if (prev.includes(plant._id)) {
                           return prev.filter(id => id !== plant._id);
                         }
                         return [...prev, plant._id];
                      })
                    }
                  >
                    <Text style={isActive ? styles.plantPillTextActive : styles.plantPillText}>{plant.name || plant.strain || "Plant"}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <GrowInterestPicker
          title="Grow Interests relevant to this entry"
          helperText="Select the crops, environments, and goals this update relates to."
          enabledTierIds={GROW_TAG_TIERS}
          value={growInterestSelections}
          onChange={setGrowInterestSelections}
          defaultExpanded={Boolean(route.params?.entryId)}
        />

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Write your notes..."
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        <PrimaryButton
          title={addingEntry ? "Adding..." : "Add Note"}
          onPress={handleAddEntry}
          disabled={addingEntry}
          testID="add-grow-entry"
        />

        <TouchableOpacity
          onPress={pickImage}
          style={[styles.photoButton, uploadingPhoto && styles.photoButtonDisabled]}
          disabled={uploadingPhoto}
          testID="upload-grow-photo"
        >
          <Text style={styles.photoText}>
            {uploadingPhoto ? "Uploading..." : "Add Photo"}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Entries list */}
      <Text style={styles.label}>Entries</Text>

      <FlatList
        data={entries}
        keyExtractor={(item, index) => item?._id || index.toString()}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("GrowLogDetail", { id: item._id })}>
            <Card style={{ marginBottom: spacing(4) }}>
              {item.note || item.notes ? (
                <Text style={styles.entryText}>{item.note || item.notes}</Text>
              ) : null}

              {item.photos?.map((url, idx) => (
              <Image
                key={idx}
                source={{ uri: url }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}

              <Text style={styles.date}>
                {item.createdAt || item.date
                  ? new Date(item.createdAt || item.date).toLocaleString()
                  : "Just now"}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(6),
    color: colors.text
  },
  emptyCopy: {
    color: colors.textSoft
  },
  helperText: {
    fontSize: 13,
    color: colors.textSoft,
    marginBottom: spacing(2)
  },
  plantPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(2)
  },
  plantPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(3)
  },
  plantPillActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent
  },
  plantPillText: {
    fontWeight: "600",
    color: colors.text
  },
  plantPillTextActive: {
    color: colors.accent,
    fontWeight: "700"
  },
  plantList: {
    gap: spacing(3)
  },
  addPlantCard: {
    alignSelf: "flex-start"
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing(2),
    color: colors.text
  },
  input: {
    backgroundColor: "#fff",
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(3),
    color: colors.text
  },
  photoButton: {
    marginTop: spacing(3),
    padding: spacing(3),
    backgroundColor: colors.accentSoft,
    borderRadius: radius.card,
    alignItems: "center"
  },
  photoButtonDisabled: {
    opacity: 0.6
  },
  photoText: {
    color: colors.accent,
    fontWeight: "600"
  },
  entryText: {
    color: colors.text,
    marginBottom: spacing(2)
  },
  photo: {
    width: "100%",
    height: 200,
    borderRadius: radius.card,
    marginTop: spacing(2)
  },
  date: {
    marginTop: spacing(2),
    fontSize: 12,
    color: colors.textSoft
  }
});
