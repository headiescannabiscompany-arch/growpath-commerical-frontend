import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { addLink, getLinks, removeLink, updateLink } from "../api/links.js";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";

function linkId(link, idx = 0) {
  return String(link?.id || link?._id || link?.linkId || `link-${idx}`);
}

export default function LinksScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLinksStyles(palette), [palette]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editLink, setEditLink] = useState(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setLinks(await getLinks());
    } catch (err) {
      setError(err?.message || "Unable to load links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  function openAddModal() {
    setEditLink(null);
    setLabel("");
    setUrl("");
    setModalVisible(true);
  }

  function openEditModal(link) {
    setEditLink(link);
    setLabel(link?.label || "");
    setUrl(link?.url || "");
    setModalVisible(true);
  }

  async function handleSave() {
    const nextLabel = label.trim();
    const nextUrl = url.trim();
    if (!nextLabel || !nextUrl) {
      Alert.alert("Links", "Label and URL are required.");
      return;
    }

    setSaving(true);
    try {
      if (editLink) {
        await updateLink(linkId(editLink), { label: nextLabel, url: nextUrl });
      } else {
        await addLink({ label: nextLabel, url: nextUrl });
      }
      setModalVisible(false);
      await fetchLinks();
    } catch (err) {
      Alert.alert("Links", err?.message || "Unable to save link.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(link) {
    Alert.alert("Remove link?", `Remove "${link?.label || "this link"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeLink(linkId(link));
            await fetchLinks();
          } catch (err) {
            Alert.alert("Links", err?.message || "Unable to remove link.");
          }
        }
      }
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.header}>
            Public Links
          </Text>
          <Text style={styles.subtitle}>
            Manage public links for the commercial profile.
          </Text>
        </View>
        <Pressable style={styles.button} onPress={openAddModal}>
          <Text style={styles.buttonText}>Add Link</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>Loading links...</Text>
        </View>
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item, idx) => linkId(item, idx)}
          ListEmptyComponent={<Text style={styles.empty}>No links yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.linkRow}>
              <View style={styles.linkText}>
                <Text style={styles.linkLabel}>{item?.label || "Untitled link"}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item?.url || "No URL"}
                </Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => item?.url && Linking.openURL(item.url)}
                >
                  <Text style={styles.secondaryButtonText}>Open</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={() => handleDelete(item)}>
                  <Text style={styles.dangerButtonText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editLink ? "Edit Link" : "Add Link"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Label"
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              value={label}
              onChangeText={setLabel}
            />
            <TextInput
              style={styles.input}
              placeholder="URL, for example https://example.com"
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
                <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export const createLinksStyles = (palette) =>
  StyleSheet.create({
    container: { backgroundColor: palette.page, flex: 1, padding: 16 },
    headerRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 16
    },
    header: { color: palette.text, fontSize: 24, fontWeight: "800" },
    subtitle: { color: palette.textMuted, marginTop: 4 },
    error: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.danger,
      marginBottom: 10,
      padding: 10
    },
    center: { alignItems: "center", gap: 8, padding: 32 },
    meta: { color: palette.textMuted },
    empty: { color: palette.textMuted, paddingTop: 8 },
    linkRow: {
      alignItems: "center",
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 10,
      paddingVertical: 12
    },
    linkText: { flex: 1 },
    linkLabel: { color: palette.text, fontSize: 16, fontWeight: "800" },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end"
    },
    button: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    buttonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.link, fontWeight: "800" },
    dangerButton: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    dangerButtonText: { color: palette.danger, fontWeight: "800" },
    modalOverlay: {
      alignItems: "center",
      backgroundColor: palette.shadow,
      flex: 1,
      justifyContent: "center",
      padding: 16
    },
    modalContent: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      maxWidth: 420,
      padding: 16,
      width: "100%"
    },
    modalTitle: { color: palette.text, fontSize: 20, fontWeight: "800" },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 10
    },
    modalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" }
  });
