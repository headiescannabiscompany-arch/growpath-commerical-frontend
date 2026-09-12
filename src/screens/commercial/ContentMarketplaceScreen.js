import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  setMarketplacePublication,
  uploadContent
} from "../../api/marketplace.js";
import { uploadCourseMedia, uploadImage } from "../../api/uploads.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import ErrorBoundary from "../../components/ErrorBoundary.js";
import ErrorState from "../../components/ErrorState.js";
import { Spacing, Typography, radius } from "../../theme/theme.js";
import { useAppTheme } from "../../theme/appTheme";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

const tabs = [
  { id: "browse", label: "Browse", icon: "magnify" },
  { id: "uploads", label: "My Offers", icon: "cloud-upload" },
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
  return row?.title || row?.name || "Storefront offer";
}

function creatorOf(row) {
  return (
    row?.creator?.name ||
    row?.userId?.name ||
    row?.creator ||
    row?.author ||
    "GrowPath storefront"
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

/**
 * @param {{
 *   initialTab?: "browse" | "uploads" | "sales" | "analytics",
 *   onBack?: () => void,
 *   onOpenOffer?: (id: string) => void
 * }} props
 */
export default function ContentMarketplaceScreen({
  initialTab = "browse",
  onBack,
  onOpenOffer
} = {}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMarketplaceOwnerStyles(palette), [palette]);
  const [activeTab, setActiveTab] = useState(initialTab);
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
  const [publicationReview, setPublicationReview] = useState(null);
  const [writingPublication, setWritingPublication] = useState(false);
  const [notice, setNotice] = useState("");
  const [publicationError, setPublicationError] = useState("");
  const actionRef = useRef(false);
  const loadRef = useRef(false);
  const mountedRef = useRef(true);
  const busy = uploading || writingPublication;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadMarketplaceData = useCallback(async () => {
    if (loadRef.current || actionRef.current) return;
    loadRef.current = true;
    setPublicationReview(null);
    setPublicationError("");
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
      const message = err?.message || "Failed to load storefront offer data.";
      setError(message);
    } finally {
      loadRef.current = false;
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    void loadMarketplaceData();
  }, [loadMarketplaceData]);

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
      setUploadError(err?.message || "Failed to pick offer file.");
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
    if (actionRef.current || loadRef.current) return;
    const title = form.title.trim();
    const description = form.description.trim();
    const fileUrl = form.fileUrl.trim();
    const thumbnailUrl = form.thumbnailUrl.trim();
    const price = Number(form.price || 0);
    if (!title || !description || (!fileUrl && !selectedFile)) {
      setUploadError("Title, description, and a file or file URL are required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setUploadError("Price must be a valid non-negative number.");
      return;
    }
    actionRef.current = true;
    setUploading(true);
    setUploadError("");
    setNotice("");
    try {
      const [uploadedFile, uploadedThumbnail] = await Promise.all([
        selectedFile ? uploadCourseMedia(selectedFile) : Promise.resolve(null),
        selectedThumbnail ? uploadImage(selectedThumbnail.uri) : Promise.resolve(null)
      ]);
      // A route/account switch must not create the previous owner's draft under a new session.
      if (!mountedRef.current) return;
      const response = await uploadContent({
        title,
        description,
        category: form.category,
        price,
        fileUrl: uploadedFile?.url || fileUrl,
        thumbnailUrl: uploadedThumbnail?.url || thumbnailUrl
      });
      const saved = response?.data ?? response;
      if (!saved?._id && !saved?.id)
        throw new Error(
          "The offer save could not be verified. Review My Offers before retrying."
        );
      setUploads((current) => [
        saved,
        ...current.filter((item) => rowId(item) !== rowId(saved))
      ]);
      resetForm();
      setShowUploadModal(false);
      setActiveTab("uploads");
      setNotice(
        `“${titleOf(saved) === "Storefront offer" ? title : titleOf(saved)}” saved as a draft. Review it before publishing.`
      );
    } catch (err) {
      setUploadError(err?.message || "Failed to save storefront offer.");
    } finally {
      actionRef.current = false;
      setUploading(false);
    }
  }

  function reviewPublication(item) {
    if (actionRef.current || loadRef.current) return;
    setPublicationError("");
    setNotice("");
    if (
      !item.isPublished &&
      (!item.title?.trim() ||
        !item.description?.trim() ||
        !item.fileUrl ||
        !Number.isFinite(Number(item.price)) ||
        Number(item.price) < 0)
    ) {
      setPublicationError(
        "This saved draft needs a title, description, delivery file, and valid non-negative price before publication."
      );
      return;
    }
    setPublicationReview({ item, isPublished: !item.isPublished });
  }

  async function confirmPublication() {
    if (!publicationReview || actionRef.current || loadRef.current) return;
    actionRef.current = true;
    setWritingPublication(true);
    setPublicationError("");
    const { item, isPublished } = publicationReview;
    try {
      const saved = await setMarketplacePublication(rowId(item), isPublished);
      if (rowId(saved) !== rowId(item) || saved.isPublished !== isPublished) {
        throw new Error(
          "The saved publication state could not be verified. Refresh My Offers before retrying."
        );
      }
      setUploads((current) =>
        current.map((row) => (rowId(row) === rowId(saved) ? saved : row))
      );
      setContent((current) => current.filter((row) => rowId(row) !== rowId(saved)));
      setPublicationReview(null);
      setNotice(`“${titleOf(saved)}” is now ${isPublished ? "published" : "a draft"}.`);
    } catch (err) {
      setPublicationError(
        err?.message ||
          "Unable to change offer publication. Your saved offer is retained."
      );
    } finally {
      actionRef.current = false;
      setWritingPublication(false);
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
        {onOpenOffer ? (
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => onOpenOffer(rowId(item))}
          >
            <Text style={styles.price}>View offer</Text>
          </TouchableOpacity>
        ) : null}
      </Card>
    );
  }

  function renderUploads() {
    if (!uploads.length) {
      return (
        <EmptyState
          icon="cloud-upload-outline"
          title="No offers yet"
          subtitle="Create a storefront offer, course resource, or downloadable guide draft."
          actionLabel="Create Offer"
          onAction={() => {
            if (!busy && !loading) setShowUploadModal(true);
          }}
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
            <Text style={styles.muted}>Created {dateLabel(item?.createdAt)}</Text>
            <Text style={styles.badge}>{item.isPublished ? "Published" : "Draft"}</Text>
            <Text style={styles.muted}>
              {item.description || "No description supplied."}
            </Text>
            <Text style={styles.price}>{money(item.price)}</Text>
          </View>
        </View>
        <View style={styles.cardStats}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${item.isPublished ? "Unpublish" : "Publish"} ${titleOf(item)}`}
            disabled={busy || loading}
            onPress={() => reviewPublication(item)}
            style={[styles.primaryBtn, (busy || loading) && styles.disabledBtn]}
          >
            <Text style={styles.primaryBtnText}>
              {item.isPublished ? "Unpublish" : "Publish"}
            </Text>
          </TouchableOpacity>
          {item.isPublished && onOpenOffer ? (
            <TouchableOpacity
              accessibilityRole="link"
              disabled={busy}
              onPress={() => onOpenOffer(rowId(item))}
            >
              <Text style={styles.price}>View public offer</Text>
            </TouchableOpacity>
          ) : null}
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
        <View style={styles.pageHeader}>
          {onBack ? (
            <TouchableOpacity accessibilityRole="link" disabled={busy} onPress={onBack}>
              <Text style={styles.price}>Back to Commercial More</Text>
            </TouchableOpacity>
          ) : null}
          <Text accessibilityRole="header" aria-level={1} style={styles.sectionTitle}>
            Storefront Offers
          </Text>
          <Text style={styles.muted}>
            Create downloadable offer drafts, then review and publish. Publishing does not
            charge a customer or verify seller payment readiness.
          </Text>
        </View>
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.id, disabled: busy }}
              disabled={busy}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? palette.accent : palette.textMuted}
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
          {notice ? (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              {notice}
            </Text>
          ) : null}
          {publicationError ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {publicationError}
            </Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy || loading}
            onPress={loadMarketplaceData}
          >
            <Text style={styles.price}>
              {loading ? "Refreshing offers..." : "Refresh offers"}
            </Text>
          </TouchableOpacity>
          {publicationReview ? (
            <Card style={styles.card}>
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                {publicationReview.isPublished ? "Publish" : "Unpublish"} “
                {titleOf(publicationReview.item)}”?
              </Text>
              <Text style={styles.muted}>
                {publicationReview.isPublished
                  ? "Make this saved offer visible in the public offers directory at its saved price. Only publish content you have the rights to share. Paid checkout still verifies the seller separately."
                  : "Remove this offer from public discovery and new purchases. Its record and payment history are retained. Existing delivery may also be unavailable while it is unpublished."}
              </Text>
              <View style={styles.cardStats}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={confirmPublication}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>
                    {writingPublication
                      ? "Saving publication..."
                      : publicationReview.isPublished
                        ? "Confirm publish"
                        : "Confirm unpublish"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => {
                    setPublicationReview(null);
                    setPublicationError("");
                  }}
                >
                  <Text style={styles.price}>Keep current visibility</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : null}
          {error ? (
            <ErrorState
              title="Failed to load storefront offers"
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
                placeholderTextColor={palette.textMuted}
                placeholder="Search storefront offers..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, category === item.id && styles.chipActive]}
                    onPress={() => setCategory(item.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: category === item.id }}
                    disabled={busy || loading}
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
                  title="No offers found"
                  subtitle="Try a different category"
                />
              )}
            </>
          ) : null}

          {activeTab === "uploads" ? (
            <>
              <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>My Storefront Offers</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setShowUploadModal(true)}
                  accessibilityRole="button"
                  disabled={busy || loading}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={18}
                    color={palette.accentText}
                  />
                  <Text style={styles.primaryBtnText}>Create Offer</Text>
                </TouchableOpacity>
              </View>
              {renderUploads()}
            </>
          ) : null}

          {activeTab === "sales" && salesData ? (
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
                <Text style={styles.sectionTitle}>Offer revenue summary</Text>
                <Text style={styles.muted}>
                  Cumulative recorded offer revenue grouped by the offer&apos;s last
                  update month. This is not a payment-date ledger or payout statement.
                </Text>
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
              <Text style={styles.sectionTitle}>Offers with recorded sales</Text>
              {recentSales.length ? (
                recentSales.map((sale) => (
                  <Card
                    key={sale.id || `${sale.title}-${sale.date}`}
                    style={styles.saleRow}
                  >
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{sale.title}</Text>
                      <Text style={styles.muted}>
                        Offer last updated {dateLabel(sale.date)}
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
                <Text style={styles.muted}>Create offers to build analytics.</Text>
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
            if (actionRef.current) return;
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMarketplaceOwnerStyles(palette), [palette]);
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMarketplaceOwnerStyles(palette), [palette]);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!uploading) onClose();
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close offer draft"
            disabled={uploading}
            onPress={onClose}
          >
            <MaterialCommunityIcons name="close" size={28} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Storefront Offer</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView style={styles.modalContent}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <LabelInput
            label="Title"
            editable={!uploading}
            value={form.title}
            onChangeText={(value) => setField("title", value)}
          />
          <LabelInput
            label="Description"
            editable={!uploading}
            value={form.description}
            onChangeText={(value) => setField("description", value)}
            multiline
          />
          <LabelInput
            label="Price"
            editable={!uploading}
            value={form.price}
            onChangeText={(value) => setField("price", value)}
            keyboardType="decimal-pad"
          />
          <LabelInput
            label="Category"
            editable={!uploading}
            value={form.category}
            onChangeText={(value) => setField("category", value)}
          />
          <LabelInput
            label="File URL"
            editable={!uploading}
            value={form.fileUrl}
            onChangeText={(value) => setField("fileUrl", value)}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.mediaPickBtn}
            disabled={uploading}
            onPress={onPickFile}
          >
            <MaterialCommunityIcons
              name="file-upload-outline"
              size={18}
              color={palette.accentText}
            />
            <Text style={styles.mediaPickText}>
              {selectedFile?.name || selectedFile?.fileName || "Select Offer File"}
            </Text>
          </TouchableOpacity>
          <LabelInput
            label="Thumbnail URL"
            editable={!uploading}
            value={form.thumbnailUrl}
            onChangeText={(value) => setField("thumbnailUrl", value)}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.mediaPickBtn}
            disabled={uploading}
            onPress={onPickThumbnail}
          >
            <MaterialCommunityIcons
              name="image-plus"
              size={18}
              color={palette.accentText}
            />
            <Text style={styles.mediaPickText}>
              {selectedThumbnail?.fileName || selectedThumbnail?.uri
                ? "Thumbnail Selected"
                : "Select Thumbnail Image"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.publishBtn, uploading && styles.disabledBtn]}
            accessibilityRole="button"
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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMarketplaceOwnerStyles(palette), [palette]);
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.textArea]}
        placeholder={label}
        accessibilityLabel={label}
        placeholderTextColor={palette.textMuted}
        {...props}
      />
    </View>
  );
}

export function createMarketplaceOwnerStyles(palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.page },
    pageHeader: { padding: Spacing.md, gap: Spacing.sm },
    notice: { color: palette.success, fontWeight: "700" },
    tabBar: {
      flexDirection: "row",
      backgroundColor: palette.surface,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      paddingHorizontal: Spacing.sm
    },
    tabBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.md,
      gap: 4
    },
    tabBtnActive: { borderBottomWidth: 3, borderBottomColor: palette.accent },
    tabLabel: { fontSize: Typography.size.caption, color: palette.textMuted },
    tabLabelActive: { color: palette.accent, fontWeight: "700" },
    content: { flex: 1 },
    contentInner: { padding: Spacing.md, gap: Spacing.md },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      fontSize: Typography.size.body,
      color: palette.text
    },
    textArea: { minHeight: 90, textAlignVertical: "top" },
    chip: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.pill,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginRight: Spacing.sm,
      backgroundColor: palette.surface
    },
    chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    chipText: { color: palette.text, fontWeight: "600" },
    chipTextActive: { color: palette.accentText },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    sectionTitle: {
      fontSize: Typography.size.subtitle,
      fontWeight: "800",
      color: palette.text
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm
    },
    primaryBtnText: { color: palette.accentText, fontWeight: "800" },
    card: { padding: Spacing.md, gap: Spacing.sm },
    cardTop: { flexDirection: "row", gap: Spacing.md },
    thumb: {
      width: 54,
      height: 54,
      borderRadius: radius.card,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.surfaceMuted
    },
    thumbText: { color: palette.accent, fontWeight: "900" },
    cardBody: { flex: 1, gap: 3 },
    cardTitle: { color: palette.text, fontWeight: "800", fontSize: Typography.size.body },
    muted: { color: palette.textMuted, fontSize: Typography.size.caption },
    cardStats: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: Spacing.sm
    },
    badge: {
      backgroundColor: palette.surfaceMuted,
      color: palette.text,
      borderRadius: radius.pill,
      overflow: "hidden",
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      fontSize: Typography.size.caption,
      fontWeight: "700"
    },
    statText: { color: palette.textMuted, fontSize: Typography.size.caption },
    price: { color: palette.accent, fontWeight: "900" },
    metricsRow: { flexDirection: "row", gap: Spacing.sm },
    metricCard: { flex: 1, padding: Spacing.md },
    metricValue: {
      color: palette.accent,
      fontSize: Typography.size.subtitle,
      fontWeight: "900"
    },
    metricLabel: {
      color: palette.textMuted,
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
      borderTopColor: palette.border
    },
    rowLabel: { flex: 1, color: palette.text, fontWeight: "700" },
    rowValue: { color: palette.accent, fontWeight: "900" },
    saleRow: {
      padding: Spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    modalContainer: { flex: 1, backgroundColor: palette.page },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: palette.border
    },
    modalTitle: {
      fontSize: Typography.size.subtitle,
      fontWeight: "900",
      color: palette.text
    },
    modalContent: { flex: 1, padding: Spacing.md },
    field: { marginBottom: Spacing.md },
    inputLabel: { color: palette.text, fontWeight: "800", marginBottom: Spacing.xs },
    mediaPickBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.md
    },
    mediaPickText: { color: palette.accentText, fontWeight: "900" },
    publishBtn: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: Spacing.md,
      marginTop: Spacing.sm,
      marginBottom: Spacing.lg
    },
    disabledBtn: { opacity: 0.65 },
    publishBtnText: { color: palette.accentText, fontWeight: "900" },
    errorText: {
      color: palette.danger,
      fontWeight: "700",
      marginBottom: Spacing.md
    }
  });
}
