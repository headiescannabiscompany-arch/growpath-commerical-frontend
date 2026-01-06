import React from "react";
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { colors, radius, spacing } from "../theme/theme";
import StageSlider from "./StageSlider";
import { resolveImageUrl } from "../utils/images";

function resolvePhoto(value = {}) {
  if (value.photoPreview) return value.photoPreview;
  if (typeof value.photoUrl === "string") return resolveImageUrl(value.photoUrl);
  if (Array.isArray(value.photos) && value.photos.length) {
    const raw = value.photos[value.photos.length - 1];
    return resolveImageUrl(raw);
  }
  return null;
}

export default function PlantCard({
  mode = "view",
  value = {},
  variant = "default",
  title,
  allowRemove = false,
  onRemove,
  onChange,
  onAddPhoto,
  uploadingPhoto = false,
  placeholderText = "No photo added",
  style
}) {
  const previewUrl = resolvePhoto(value);

  const handleChange = (field, text) => {
    if (typeof onChange === "function") {
      onChange(field, text);
    }
  };

  if (mode === "view" && variant === "small") {
    return (
      <View style={[styles.smallCard, style]}>
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={styles.smallPhoto} />
        ) : (
          <View style={styles.smallPhotoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>{placeholderText}</Text>
          </View>
        )}
        <Text style={styles.viewName}>{value.name || value.strain || "Unnamed Plant"}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      {(title || allowRemove) && (
        <View style={styles.header}>
          {title ? <Text style={styles.headerText}>{title}</Text> : <View />}
          {allowRemove && onRemove ? (
            <TouchableOpacity onPress={onRemove}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {mode === "view" ? (
        <View style={{ gap: spacing(1) }}>
          <Text style={styles.viewName}>{value.name || value.strain || "Unnamed Plant"}</Text>
          {value.strain ? <Text style={styles.metaText}>{value.strain}</Text> : null}
          {value.stage ? <Text style={styles.metaText}>{value.stage}</Text> : null}
        </View>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Plant Name</Text>
          <TextInput
            value={value.name}
            onChangeText={(text) => handleChange("name", text)}
            placeholder="e.g., Tent Left, Balcony Clone"
            style={styles.input}
            placeholderTextColor={colors.textSoft}
          />

          <Text style={styles.fieldLabel}>Strain</Text>
          <TextInput
            value={value.strain}
            onChangeText={(text) => handleChange("strain", text)}
            placeholder="Blueberry Muffin, Gelato #33, etc."
            style={styles.input}
            placeholderTextColor={colors.textSoft}
          />

          <Text style={styles.fieldLabel}>Breeder</Text>
          <TextInput
            value={value.breeder}
            onChangeText={(text) => handleChange("breeder", text)}
            placeholder="Barney's Farm, Mephisto, etc."
            style={styles.input}
            placeholderTextColor={colors.textSoft}
          />

          <Text style={styles.fieldLabel}>Growth Stage</Text>
          <StageSlider value={value.stage} onChange={(option) => handleChange("stage", option)} />
        </>
      )}

      <View style={styles.photoSection}>
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>{placeholderText}</Text>
          </View>
        )}

        {mode !== "view" && typeof onAddPhoto === "function" ? (
          <TouchableOpacity
            style={styles.photoButton}
            onPress={onAddPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <View style={styles.photoButtonRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={[styles.photoButtonText, { marginLeft: spacing(2) }]}>Uploading...</Text>
              </View>
            ) : (
              <Text style={styles.photoButtonText}>
                {previewUrl ? "Replace Photo" : "Add Photo"}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
    marginBottom: spacing(3)
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing(2)
  },
  headerText: {
    fontWeight: "700",
    color: colors.text
  },
  removeText: {
    color: colors.textSoft,
    fontWeight: "600"
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    marginTop: spacing(2),
    color: colors.text
  },
  input: {
    backgroundColor: "#fff",
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(1),
    color: colors.text
  },
  photoSection: {
    marginTop: spacing(2)
  },
  photo: {
    width: "100%",
    height: 140,
    borderRadius: radius.card,
    marginBottom: spacing(2)
  },
  photoPlaceholder: {
    height: 140,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2),
    backgroundColor: "rgba(0,0,0,0.02)"
  },
  photoPlaceholderText: {
    color: colors.textSoft
  },
  photoButton: {
    paddingVertical: spacing(2),
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent
  },
  photoButtonRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  photoButtonText: {
    color: colors.accent,
    fontWeight: "600"
  },
  viewName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text
  },
  metaText: {
    color: colors.textSoft,
    fontSize: 13
  },
  smallCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
    alignItems: "center",
    width: 140,
    marginRight: spacing(2)
  },
  smallPhoto: {
    width: 120,
    height: 120,
    borderRadius: radius.card,
    marginBottom: spacing(2)
  },
  smallPhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2)
  }
});
