import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { addEntry, uploadEntryPhoto } from "../api/grows";
import { useAuth } from "../context/AuthContext";

export default function GrowJournalScreen({ route, navigation }) {
  const { isPro } = useAuth();
  const grow = route.params.grow;
  const [entries, setEntries] = useState(grow.entries || []);
  const [note, setNote] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleAddEntry() {
    if (!note.trim()) {
      return Alert.alert("Missing Note", "Please add a brief note before saving.");
    }

    try {
      setAddingEntry(true);
      const entry = await addEntry(grow._id, note.trim(), []);
      setEntries((prev) => [entry, ...prev]);
      setNote("");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setAddingEntry(false);
    }
  }

  async function pickImage() {
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
        const uploaded = await uploadEntryPhoto(grow._id, file);
        if (uploaded?.url) {
          const photoEntry = {
            photos: [uploaded.url],
            createdAt: new Date().toISOString()
          };
          setEntries((prev) => [photoEntry, ...prev]);
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

      {/* Add note */}
      <Card style={{ marginBottom: spacing(6) }}>
        <Text style={styles.label}>New Entry</Text>

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
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
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
