import React from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { radius, spacing } from "../theme/theme";
import StageSlider from "./StageSlider";
import { resolveImageUrl } from "../utils/images";
import { useAppTheme } from "@/theme/appTheme";

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
  const { palette } = useAppTheme();
  const previewUrl = resolvePhoto(value);

  const handleChange = (field, text) => {
    if (typeof onChange === "function") {
      onChange(field, text);
    }
  };

  const cardBaseStyle = [
    styles.card,
    {
      backgroundColor: palette.surface,
      borderColor: palette.border
    },
    style
  ];

  if (mode === "view" && variant === "small") {
    return (
      <View
        style={[
          styles.smallCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
          style
        ]}
      >
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={styles.smallPhoto} />
        ) : (
          <View
            style={[
              styles.smallPhotoPlaceholder,
              { borderColor: palette.border, backgroundColor: palette.surfaceMuted }
            ]}
          >
            <Text style={[styles.photoPlaceholderText, { color: palette.textMuted }]}>
              {placeholderText}
            </Text>
          </View>
        )}
        <Text style={[styles.viewName, { color: palette.text }]}>
          {value.name || value.strain || "Unnamed Plant"}
        </Text>
      </View>
    );
  }

  return (
    <View style={cardBaseStyle}>
      {(title || allowRemove) && (
        <View style={styles.header}>
          {title ? (
            <Text style={[styles.headerText, { color: palette.text }]}>{title}</Text>
          ) : (
            <View />
          )}
          {allowRemove && onRemove ? (
            <TouchableOpacity onPress={onRemove}>
              <Text style={[styles.removeText, { color: palette.textMuted }]}>
                Remove
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {mode === "view" ? (
        <View style={{ gap: spacing(1) }}>
          <Text style={[styles.viewName, { color: palette.text }]}>
            {value.name || value.strain || "Unnamed Plant"}
          </Text>
          {value.strain ? (
            <Text style={[styles.metaText, { color: palette.textMuted }]}>
              {value.strain}
            </Text>
          ) : null}
          {value.stage ? (
            <Text style={[styles.metaText, { color: palette.textMuted }]}>
              {value.stage}
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          <Text style={[styles.fieldLabel, { color: palette.text }]}>Plant Name</Text>
          <TextInput
            value={value.name}
            onChangeText={(text) => handleChange("name", text)}
            placeholder="e.g., Tent Left, Balcony Clone"
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text
              }
            ]}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: palette.text }]}>Strain</Text>
          <TextInput
            value={value.strain}
            onChangeText={(text) => handleChange("strain", text)}
            placeholder="Blueberry Muffin, Gelato #33, etc."
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text
              }
            ]}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: palette.text }]}>Breeder</Text>
          <TextInput
            value={value.breeder}
            onChangeText={(text) => handleChange("breeder", text)}
            placeholder="Barney's Farm, Mephisto, etc."
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text
              }
            ]}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, { color: palette.text }]}>Growth Stage</Text>
          <StageSlider
            value={value.stage}
            onChange={(option) => handleChange("stage", option)}
          />
        </>
      )}

      <View style={styles.photoSection}>
        {previewUrl ? (
          <Image source={{ uri: previewUrl }} style={styles.photo} />
        ) : (
          <View
            style={[
              styles.photoPlaceholder,
              {
                borderColor: palette.border,
                backgroundColor: palette.surfaceMuted
              }
            ]}
          >
            <Text style={[styles.photoPlaceholderText, { color: palette.textMuted }]}>
              {placeholderText}
            </Text>
          </View>
        )}

        {mode !== "view" && typeof onAddPhoto === "function" ? (
          <TouchableOpacity
            style={[
              styles.photoButton,
              { borderColor: palette.accent, backgroundColor: palette.surface }
            ]}
            onPress={onAddPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <View style={styles.photoButtonRow}>
                <ActivityIndicator size="small" color={palette.accent} />
                <Text
                  style={[
                    styles.photoButtonText,
                    { color: palette.accent, marginLeft: spacing(2) }
                  ]}
                >
                  Uploading...
                </Text>
              </View>
            ) : (
              <Text style={[styles.photoButtonText, { color: palette.accent }]}>
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
    fontWeight: "700"
  },
  removeText: {
    fontWeight: "600"
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    marginTop: spacing(2)
  },
  input: {
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: spacing(1)
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2)
  },
  photoPlaceholderText: {},
  photoButton: {
    paddingVertical: spacing(2),
    alignItems: "center",
    borderRadius: radius.pill,
    borderWidth: 1
  },
  photoButtonRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  photoButtonText: {
    fontWeight: "600"
  },
  viewName: {
    fontSize: 16,
    fontWeight: "700"
  },
  metaText: {
    fontSize: 13
  },
  smallCard: {
    borderRadius: radius.card,
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing(2)
  }
});
