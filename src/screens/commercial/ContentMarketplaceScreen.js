import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  browseMarketplace,
  getMyUploads,
  getSalesData,
  uploadContent
} from "../../api/marketplace.js";
import { uploadCourseMedia, uploadImage } from "../../api/uploads.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";
import ErrorState from "../../components/ErrorState.js";
import { Colors, Spacing, Typography } from "../../theme/theme.js";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

const tabs = [
  { id: "browse", label: "Browse", icon: "magnify" },
  { id: "uploads", label: "My Uploads", icon: "cloud-upload" },
  { id: "sales", label: "Sales", icon: "cash-multiple" },
  { id: "analytics", label: "Analytics", icon: "chart-line" }
];

const categories = [
  { id: "all", label: "All" },
  { id: "content", label: "Content" },
  { id: "courses", label: "Courses" },
  { id: "resources", label: "Resources" },
  { id: "tools", label: "Tools" }
];

function rowId(row) {
  return String(row?._id || row?.id || row?.contentId || row?.title || "");
}

function titleOf(row) {
  return row?.title || row?.name || "Creator content";
}

function creatorOf(row) {
  return (
    row?.creator?.name ||
    row?.userId?.name ||
    row?.creator ||
    row?.author ||
    "GrowPath creator"
  );
}

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function whole(value) {
  return Number(value || 0).toLocaleString();
}

function dateLabel(value) {
  if (!value) return "recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function thumbnailLabel(row) {
  if (row?.thumbnail) return String(row.thumbnail);
  if (row?.thumbnailUrl) return "IMG";
  if (row?.category) return String(row.category).slice(0, 3).toUpperCase();
  return "GP";
}

function firstDocumentAsset(result) {
  if (!result || result.canceled) return null;
  if (Array.isArray(result.assets) && result.assets[0]) return result.assets[0];
  if (result.type === "success") return result;
  return null;
}

export default function ContentMarketplaceScreen() {
  const [activeTab, setActiveTab] = useState("browse");
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [salesData, setSalesData] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "content",
    fileUrl: "",
    thumbnailUrl: ""
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);

  async function loadMarketplaceData() {
    setLoading(true);
    setError("");
    try {
      const [browseRes, uploadsRes, salesRes] = await Promise.all([
        browseMarketplace(category, 1, 40),
        getMyUploads(),
        getSalesData("monthly")
      ]);
      setContent(browseRes?.data || browseRes?.uploads || []);
      setUploads(uploadsRes?.data || uploadsRes?.uploads || []);
      setSalesData(salesRes?.data || null);
    } catch (err) {
      const message = err?.message || "Failed to load creator content data.";
      setError(message);
      Alert.alert("Creator content unavailable", message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMarketplaceData();
  }, [category]);

  const filteredContent = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return content;
    return content.filter((item) => {
      const haystack =
        `${titleOf(item)} ${item?.description || ""} ${item?.category || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [content, searchQuery]);

  const salesSummary = salesData?.summary || {
    totalEarnings: 0,
    totalDownloads: 0,
    averageRating: 0
  };
  const monthly = salesData?.monthly || [];
  const recentSales = salesData?.recentSales || [];

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm({
      title: "",
      description: "",
      price: "",
      category: "content",
      fileUrl: "",
      thumbnailUrl: ""
    });
    setSelectedFile(null);
    setSelectedThumbnail(null);
    setUploadError("");
  }

  async function pickContentFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "video/*", "audio/*"]
      });
      const asset = firstDocumentAsset(result);
      if (asset) {
        setSelectedFile(asset);
        setField("fileUrl", "");
      }
    } catch (err) {
      setUploadError(err?.message || "Failed to pick content file.");
    }
  }

  async function pickThumbnailImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadError("Photo library permission is required to select a thumbnail.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8
      });
      if (!result.canceled && result.assets?.[0]) {
        setSelectedThumbnail(result.assets[0]);
        setField("thumbnailUrl", "");
      }
    } catch (err) {
      setUploadError(err?.message || "Failed to pick thumbnail image.");
    }
  }

  async function submitUpload() {
    const title = form.title.trim();
    const description = form.description.trim();
    const fileUrl = form.fileUrl.trim();
    const thumbnailUrl = form.thumbnailUrl.trim();
    const price = Number(form.price || 0);
    if (!title || !description || (!fileUrl && !selectedFile)) {
      setUploadError("Title, description, and a file or file URL are required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setUploadError("Price must be a valid non-negative number.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const [uploadedFile, uploadedThumbnail] = await Promise.all([
        selectedFile ? uploadCourseMedia(selectedFile) : Promise.resolve(null),
        selectedThumbnail ? uploadImage(selectedThumbnail.uri) : Promise.resolve(null)
      ]);
      await uploadContent({
        title,
        description,
        category: form.category,
        price,
        fileUrl: uploadedFile?.url || fileUrl,
        thumbnailUrl: uploadedThumbnail?.url || thumbnailUrl
      });
      resetForm();
      setShowUploadModal(false);
      await loadMarketplaceData();
      Alert.alert("Content saved", "Your upload was saved as a draft.");
    } catch (err) {
      setUploadError(err?.message || "Failed to save upload.");
    } finally {
      setUploading(false);
    }
  }

  function renderContentCard(item) {
    return (
      <Card key={rowId(item)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.thumb}>
            <Text style={styles.thumbText}>{thumbnailLabel(item)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {titleOf(item)}
            </Text>
            <Text style={styles.muted}>by {creatorOf(item)}</Text>
            <Text style={styles.muted} numberOfLines={2}>
              {item?.description || "No description supplied."}
            </Text>
          </View>
        </View>
        <View style={styles.cardStats}>
          <Text style={styles.badge}>{item?.category || "content"}</Text>
          <Text style={styles.statText}>{whole(item?.downloads)} downloads</Text>
          <Text style={styles.price}>{money(item?.price)}</Text>
        </View>
      </Card>
    );
  }

  function renderUploads() {
    if (!uploads.length) {
      return (
        <EmptyState
          icon="cloud-upload-outline"
          title="No uploads yet"
          subtitle="Share your content and start earning"
          actionLabel="Upload Content"
          onAction={() => setShowUploadModal(true)}
        />
      );
    }
    return uploads.map((item) => (
      <Card key={rowId(item)} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.thumb}>
            <Text style={styles.thumbText}>{thumbnailLabel(item)}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{titleOf(item)}</Text>
            <Text style={styles.muted}>Uploaded {dateLabel(item?.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <Metric label="Downloads" value={whole(item?.downloads)} />
          <Metric label="Rating" value={Number(item?.rating || 0).toFixed(1)} />
          <Metric label="Revenue" value={money(item?.revenue)} />
        </View>
      </Card>
    ));
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          {error ? (
            <ErrorState
              title="Failed to load creator content"
              message={error}
              icon="alert-circle"
              onRetry={loadMarketplaceData}
              retryLabel="Try Again"
            />
          ) : null}
          {loading ? <ActivityIndicator size="small" /> : null}

          {activeTab === "browse" ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Search creator content..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, category === item.id && styles.chipActive]}
                    onPress={() => setCategory(item.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        category === item.id && styles.chipTextActive
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {filteredContent.length ? (
                filteredContent.map(renderContentCard)
              ) : (
                <EmptyState
                  icon="inbox-multiple"
                  title="No content found"
                  subtitle="Try a different category"
                />
              )}
            </>
          ) : null}

          {activeTab === "uploads" ? (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>My Uploaded Content</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setShowUploadModal(true)}
                >
                  <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                  <Text style={styles.primaryBtnText}>Upload</Text>
                </TouchableOpacity>
              </View>
              {renderUploads()}
            </>
          ) : null}

          {activeTab === "sales" ? (
            <>
              <View style={styles.metricsRow}>
                <Metric
                  label="Total Earnings"
                  value={money(salesSummary.totalEarnings)}
                />
                <Metric label="Downloads" value={whole(salesSummary.totalDownloads)} />
                <Metric
                  label="Avg Rating"
                  value={Number(salesSummary.averageRating || 0).toFixed(1)}
                />
              </View>
              <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Earnings by Month</Text>
                {monthly.length ? (
                  monthly.map((item) => (
                    <View key={item.month} style={styles.row}>
                      <Text style={styles.rowLabel}>{item.month}</Text>
                      <Text style={styles.rowValue}>{money(item.earnings)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.muted}>No sales recorded yet.</Text>
                )}
              </Card>
              <Text style={styles.sectionTitle}>Recent Sales</Text>
              {recentSales.length ? (
                recentSales.map((sale) => (
                  <Card
                    key={sale.id || `${sale.title}-${sale.date}`}
                    style={styles.saleRow}
                  >
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{sale.title}</Text>
                      <Text style={styles.muted}>
                        {sale.buyer || "Creator content customer"} - {dateLabel(sale.date)}
                      </Text>
                    </View>
                    <Text style={styles.price}>{money(sale.amount)}</Text>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon="cash-clock"
                  title="No sales yet"
                  subtitle="Sales appear after purchases are recorded."
                />
              )}
            </>
          ) : null}

          {activeTab === "analytics" ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Content Performance</Text>
              {uploads.length ? (
                uploads.map((item) => (
                  <View key={rowId(item)} style={styles.row}>
                    <View style={styles.cardBody}>
                      <Text style={styles.rowLabel}>{titleOf(item)}</Text>
                      <Text style={styles.muted}>
                        {money(item?.price)} - {whole(item?.downloads)} downloads
                      </Text>
                    </View>
                    <Text style={styles.rowValue}>{money(item?.revenue)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.muted}>Upload content to build analytics.</Text>
              )}
            </Card>
          ) : null}
        </ScrollView>

        <UploadModal
          visible={showUploadModal}
          form={form}
          error={uploadError}
          uploading={uploading}
          setField={setField}
          selectedFile={selectedFile}
          selectedThumbnail={selectedThumbnail}
          onPickFile={pickContentFile}
          onPickThumbnail={pickThumbnailImage}
          onClose={() => {
            setShowUploadModal(false);
            setUploadError("");
          }}
          onSubmit={submitUpload}
        />
      </View>
    </ErrorBoundary>
  );
}

function Metric({ label, value }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

function UploadModal({
  visible,
  form,
  error,
  uploading,
  selectedFile,
  selectedThumbnail,
  setField,
  onPickFile,
  onPickThumbnail,
  onClose,
  onSubmit
}) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Upload Content</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <LabelInput
            label="Title"
            value={form.title}
            onChangeText={(value) => setField("title", value)}
          />
          <LabelInput
            label="Description"
            value={form.description}
            onChangeText={(value) => setField("description", value)}
            multiline
          />
          <LabelInput
            label="Price"
            value={form.price}
            onChangeText={(value) => setField("price", value)}
            keyboardType="decimal-pad"
          />
          <LabelInput
            label="Category"
            value={form.category}
            onChangeText={(value) => setField("category", value)}
          />
          <LabelInput
            label="File URL"
            value={form.fileUrl}
            onChangeText={(value) => setField("fileUrl", value)}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.mediaPickBtn}
            disabled={uploading}
            onPress={onPickFile}
          >
            <MaterialCommunityIcons name="file-upload-outline" size={18} color="#FFF" />
            <Text style={styles.mediaPickText}>
              {selectedFile?.name || selectedFile?.fileName || "Select Content File"}
            </Text>
          </TouchableOpacity>
          <LabelInput
            label="Thumbnail URL"
            value={form.thumbnailUrl}
            onChangeText={(value) => setField("thumbnailUrl", value)}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.mediaPickBtn}
            disabled={uploading}
            onPress={onPickThumbnail}
          >
            <MaterialCommunityIcons name="image-plus" size={18} color="#FFF" />
            <Text style={styles.mediaPickText}>
              {selectedThumbnail?.fileName || selectedThumbnail?.uri
                ? "Thumbnail Selected"
                : "Select Thumbnail Image"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.publishBtn, uploading && styles.disabledBtn]}
            disabled={uploading}
            onPress={onSubmit}
          >
            <Text style={styles.publishBtnText}>
              {uploading ? "Saving..." : "Save Draft"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function LabelInput({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.textArea]}
        placeholder={label}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: Spacing.sm
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: 4
  },
  tabBtnActive: { borderBottomWidth: 3, borderBottomColor: Colors.primary },
  tabLabel: { fontSize: Typography.size.caption, color: Colors.textSecondary },
  tabLabelActive: { color: Colors.primary, fontWeight: "700" },
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, gap: Spacing.md },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.size.body
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },
  chip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    backgroundColor: "#fff"
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "800",
    color: Colors.text
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  card: { padding: Spacing.md, gap: Spacing.sm },
  cardTop: { flexDirection: "row", gap: Spacing.md },
  thumb: {
    width: 54,
    height: 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5"
  },
  thumbText: { color: Colors.primary, fontWeight: "900" },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { color: Colors.text, fontWeight: "800", fontSize: Typography.size.body },
  muted: { color: Colors.textSecondary, fontSize: Typography.size.caption },
  cardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm
  },
  badge: {
    backgroundColor: "#f3f4f6",
    color: Colors.text,
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    fontSize: Typography.size.caption,
    fontWeight: "700"
  },
  statText: { color: Colors.textSecondary, fontSize: Typography.size.caption },
  price: { color: Colors.primary, fontWeight: "900" },
  metricsRow: { flexDirection: "row", gap: Spacing.sm },
  metricCard: { flex: 1, padding: Spacing.md },
  metricValue: {
    color: Colors.primary,
    fontSize: Typography.size.subtitle,
    fontWeight: "900"
  },
  metricLabel: {
    color: Colors.textSecondary,
    marginTop: 4,
    fontSize: Typography.size.caption
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb"
  },
  rowLabel: { flex: 1, color: Colors.text, fontWeight: "700" },
  rowValue: { color: Colors.primary, fontWeight: "900" },
  saleRow: {
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  modalTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: "900",
    color: Colors.text
  },
  modalContent: { flex: 1, padding: Spacing.md },
  field: { marginBottom: Spacing.md },
  inputLabel: { color: Colors.text, fontWeight: "800", marginBottom: Spacing.xs },
  mediaPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md
  },
  mediaPickText: { color: "#fff", fontWeight: "900" },
  publishBtn: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg
  },
  disabledBtn: { opacity: 0.65 },
  publishBtnText: { color: "#fff", fontWeight: "900" },
  errorText: {
    color: "#b91c1c",
    fontWeight: "700",
    marginBottom: Spacing.md
  }
});
