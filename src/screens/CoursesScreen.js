import React, { useState } from "react";
import {
  Modal,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  TextInput
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/auth/AuthContext";

function CoursesScreen() {
  const navigation = useNavigation();
  const { capabilities } = useAuth();

  // State hooks
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);

  // Fetch courses from backend
  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/courses")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch courses");
        return res.json();
      })
      .then((data) => {
        if (alive) setCourses(data);
      })
      .catch(() => {
        if (alive) setCourses([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Plan switcher removed; use capabilities for gating

  // Modal state
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [complianceModalVisible, setComplianceModalVisible] = useState(false);
  // Modal data state
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteName, setInviteName] = useState("");
  // inviteRole state removed; role is determined by backend/capabilities
  const [actionFeedback, setActionFeedback] = useState("");

  // --- Backend Integration ---
  // Invite user (Facility)
  function handleInviteUser() {
    setActionFeedback("");
    setLoading(true);
    fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: inviteName }) // role is set by backend/capabilities
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionFeedback("Invite sent!");
          setInviteModalVisible(false);
        } else {
          setActionFeedback(data.error || "Failed to invite user");
        }
      })
      .catch(() => setActionFeedback("Failed to invite user"))
      .finally(() => setLoading(false));
  }

  // Change user role (Facility)
  function handleChangeUserRole() {
    if (!selectedUser) return;
    setActionFeedback("");
    setLoading(true);
    fetch(`/api/users/${selectedUser._id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selectedUser.role })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionFeedback("Role changed!");
          setRoleModalVisible(false);
        } else {
          setActionFeedback(data.error || "Failed to change role");
        }
      })
      .catch(() => setActionFeedback("Failed to change role"))
      .finally(() => setLoading(false));
  }

  // Remove user (Facility)
  function handleRemoveUser() {
    if (!selectedUser) return;
    setActionFeedback("");
    setLoading(true);
    fetch(`/api/users/${selectedUser._id}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionFeedback("User removed!");
          setRemoveModalVisible(false);
        } else {
          setActionFeedback(data.error || "Failed to remove user");
        }
      })
      .catch(() => setActionFeedback("Failed to remove user"))
      .finally(() => setLoading(false));
  }

  // Export compliance metrics (Facility)
  function handleExportCompliance(format) {
    setActionFeedback("");
    setLoading(true);
    fetch(`/api/compliance/export?format=${format}`)
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        // For demo: just show feedback, real app would download file
        setActionFeedback(`Exported as ${format.toUpperCase()}!`);
        setComplianceModalVisible(false);
      })
      .catch(() => setActionFeedback("Export failed"))
      .finally(() => setLoading(false));
  }

  // Publish/Unpublish course (Influencer)
  function handlePublish(courseId) {
    setActionFeedback("");
    setLoading(true);
    fetch(`/api/courses/${courseId}/publish`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionFeedback("Course published!");
        } else {
          setActionFeedback(data.error || "Failed to publish");
        }
      })
      .catch(() => setActionFeedback("Failed to publish"))
      .finally(() => setLoading(false));
  }
  function handleUnpublish(courseId) {
    setActionFeedback("");
    setLoading(true);
    fetch(`/api/courses/${courseId}/unpublish`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setActionFeedback("Course unpublished!");
        } else {
          setActionFeedback(data.error || "Failed to unpublish");
        }
      })
      .catch(() => setActionFeedback("Failed to unpublish"))
      .finally(() => setLoading(false));
  }

  // --- Modal Renderers ---
  const renderInviteModal = () => (
    <Modal
      visible={inviteModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setInviteModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Invite User</Text>
          <Text style={styles.modalText}>
            Enter the name for the new user. (Role is set by backend/capabilities)
          </Text>
          <View style={styles.inviteInputRow}>
            <Text style={styles.inviteLabel}>Name:</Text>
            <View style={styles.inviteInputBox}>
              <TextInput
                style={styles.inviteInputText}
                value={inviteName}
                onChangeText={setInviteName}
                placeholder="Enter name"
                accessibilityLabel="Invite user name input"
                testID="inviteNameInput"
                autoFocus
                placeholderTextColor="#888"
              />
            </View>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { minWidth: 80 }]}
              onPress={handleInviteUser}
              accessibilityRole="button"
              accessibilityLabel="Send invite to user"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => setInviteModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRoleModal = () => (
    <Modal
      visible={roleModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setRoleModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change User Role</Text>
          <Text style={styles.modalText}>
            Role changes are managed by backend/capabilities.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { minWidth: 80 }]}
              onPress={handleChangeUserRole}
              accessibilityRole="button"
              accessibilityLabel="Change user role"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>Change</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => setRoleModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRemoveModal = () => (
    <Modal
      visible={removeModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setRemoveModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Remove User</Text>
          <Text style={styles.modalText}>
            Are you sure you want to remove {selectedUser?.name || "this user"}?
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { minWidth: 80 }]}
              onPress={handleRemoveUser}
              accessibilityRole="button"
              accessibilityLabel="Remove user"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => setRemoveModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderComplianceModal = () => (
    <Modal
      visible={complianceModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setComplianceModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Export Compliance Metrics</Text>
          <Text style={styles.modalText}>
            Choose a format to export compliance metrics.
          </Text>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { minWidth: 80 }]}
              onPress={() => handleExportCompliance("csv")}
              accessibilityRole="button"
              accessibilityLabel="Export compliance as CSV"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { minWidth: 80 }]}
              onPress={() => handleExportCompliance("pdf")}
              accessibilityRole="button"
              accessibilityLabel="Export compliance as PDF"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBtnText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#EF4444" }]}
              onPress={() => setComplianceModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Example render functions (move/expand as needed)
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🎓</Text>
      <Text style={styles.emptyTitle}>No courses yet</Text>
      <Text style={styles.emptyText}>
        Be the first to create a course and share your expertise
      </Text>
    </View>
  );

  const renderCourseCard = ({ item }) => (
    <View
      style={styles.courseCard}
      accessible
      accessibilityLabel={`Course card for ${item.title}`}
      testID={`courseCard-${item._id}`}
    >
      <View style={styles.thumbnail}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumbnailImage}
            accessibilityLabel={`${item.title} thumbnail`}
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.thumbnailIcon} accessibilityLabel="Course icon">
              📚
            </Text>
          </View>
        )}
        {item.priceCents === 0 && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>FREE</Text>
          </View>
        )}
      </View>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={2} accessibilityRole="header">
          {item.title}
        </Text>
        <Text
          style={styles.creator}
          numberOfLines={1}
          accessibilityLabel={`Creator: ${item.creator}`}
        >
          {item.creator}
        </Text>
        <View style={styles.courseMeta}>
          <Text style={styles.metaText}>{item.lessons.length} lessons</Text>
          {item.priceCents > 0 && (
            <Text style={styles.price}>${(item.priceCents / 100).toFixed(2)}</Text>
          )}
        </View>
        {/* Influencer analytics */}
        {capabilities?.canViewCourseAnalytics && (
          <Text
            style={styles.courseAnalytics}
            accessibilityLabel={`Views: ${item.analytics?.views}, Enrollments: ${item.analytics?.enrollments}`}
          >
            Views: {item.analytics?.views ?? 0} · Enrollments:{" "}
            {item.analytics?.enrollments ?? 0}
          </Text>
        )}
        {/* Publishing controls for published courses (Influencer only) */}
        {capabilities?.canPublishCourses && item.isPublished && (
          <View style={styles.publishControls}>
            <TouchableOpacity
              style={styles.unpublishBtn}
              accessibilityRole="button"
              accessibilityLabel="Unpublish course"
              testID={`unpublishBtn-${item._id}`}
              onPress={() => handleUnpublish(item._id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Text style={styles.unpublishBtnText}>Unpublish</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // Replace plan-based course filtering with capability-based
  let visibleCourses = courses;
  if (!capabilities?.canSeePaidCourses) {
    visibleCourses = courses.filter((c) => c.priceCents === 0);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Modals */}
      {renderInviteModal()}
      {renderRoleModal()}
      {renderRemoveModal()}
      {renderComplianceModal()}

      {/* Main List */}
      <FlatList
        data={visibleCourses}
        keyExtractor={(item) => item._id}
        // ListHeaderComponent={renderHeader} // Uncomment and implement as needed
        contentContainerStyle={styles.scrollContent}
        renderItem={renderCourseCard}
        ListEmptyComponent={!loading ? renderEmpty : null}
      />
      {/* Action feedback */}
      {!!actionFeedback && <Text style={styles.actionFeedback}>{actionFeedback}</Text>}
    </View>
  );
}

export default CoursesScreen;

// Styles must be declared before component usage to avoid 'used before its declaration' error
const styles = StyleSheet.create({
  // ...all style properties as previously defined...
  draftSection: { backgroundColor: "#F3F4F6", borderRadius: 8, margin: 12, padding: 10 },
  draftHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  draftTitle: { fontSize: 16, fontWeight: "bold", color: "#222" },
  draftCount: { fontSize: 14, color: "#6B7280" },
  draftSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },
  toggleDraftsBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  toggleDraftsText: { color: "#fff", fontWeight: "bold" },
  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  draftCourseTitle: { fontSize: 15, fontWeight: "bold", color: "#222" },
  draftMeta: { fontSize: 13, color: "#666" },
  draftStatus: { fontSize: 13, color: "#10B981" },
  draftAnalytics: { fontSize: 13, color: "#1D4ED8" },
  publishControls: { flexDirection: "row", marginTop: 6 },
  publishBtn: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6
  },
  publishBtnText: { color: "#fff", fontWeight: "bold" },
  deleteBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  deleteBtnText: { color: "#fff", fontWeight: "bold" },
  draftActions: { flexDirection: "row", marginLeft: 8 },
  manageBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4
  },
  manageBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  viewBtn: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4
  },
  viewBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  headerContainer: {
    padding: 16,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    margin: 16,
    marginBottom: 0
  },
  motivation: { fontSize: 18, fontWeight: "bold", color: "#10B981", marginBottom: 6 },
  motivationText: { fontSize: 14, color: "#222" },
  headerRow: { flexDirection: "row", alignItems: "center", margin: 16, marginBottom: 0 },
  title: { fontSize: 22, fontWeight: "bold", color: "#222" },
  subtitle: { fontSize: 15, color: "#666" },
  createBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  createBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  commercialSection: {
    backgroundColor: "#F0F4FF",
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
    padding: 12
  },
  commercialHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  commercialTitle: { fontSize: 18, fontWeight: "bold", color: "#1D4ED8" },
  toggleCommercialBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  toggleCommercialText: { color: "#fff", fontWeight: "bold" },
  commercialCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  commercialCardTitle: { fontSize: 16, fontWeight: "bold", color: "#1D4ED8" },
  commercialCardText: { fontSize: 13, color: "#666", marginTop: 2 },
  commercialActionBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6
  },
  commercialActionText: { color: "#fff", fontWeight: "bold" },
  adminControls: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 6
  },
  adminTitle: { fontSize: 14, fontWeight: "bold", color: "#1D4ED8", marginBottom: 6 },
  adminBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4
  },
  adminBtnText: { color: "#fff", fontWeight: "bold" },
  emptyState: { alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#222", marginBottom: 6 },
  emptyText: { fontSize: 14, color: "#666" },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  thumbnailImage: { width: 60, height: 60, borderRadius: 8 },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center"
  },
  thumbnailIcon: { fontSize: 32 },
  freeBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#10B981",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  freeBadgeText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  courseInfo: { flex: 1 },
  courseTitle: { fontSize: 15, fontWeight: "bold", color: "#222" },
  creator: { fontSize: 13, color: "#666" },
  courseMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  metaText: { fontSize: 13, color: "#666", marginRight: 8 },
  price: { fontSize: 13, color: "#10B981", fontWeight: "bold" },
  courseAnalytics: { fontSize: 13, color: "#1D4ED8" },
  unpublishBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  unpublishBtnText: { color: "#fff", fontWeight: "bold" },
  scrollContent: { paddingBottom: 40 },
  userListSection: { marginTop: 10, marginBottom: 10 },
  userListTitle: { fontSize: 15, fontWeight: "bold", color: "#222", marginBottom: 6 },
  userListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6
  },
  userName: { flex: 2, fontSize: 14, color: "#222", fontWeight: "bold" },
  userRole: { flex: 1, fontSize: 13, color: "#6B7280", textAlign: "center" },
  userActions: { flexDirection: "row", marginLeft: 8 },
  userActionBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4
  },
  userActionText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  managerControls: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#FEF9C3",
    borderRadius: 6
  },
  managerTitle: { fontSize: 14, fontWeight: "bold", color: "#CA8A04", marginBottom: 6 },
  managerBtn: {
    backgroundColor: "#CA8A04",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4
  },
  managerBtnText: { color: "#fff", fontWeight: "bold" },
  staffInfo: { marginTop: 10, padding: 8, backgroundColor: "#F0F4FF", borderRadius: 6 },
  staffTitle: { fontSize: 14, fontWeight: "bold", color: "#1D4ED8", marginBottom: 6 },
  staffText: { fontSize: 13, color: "#222" },
  learnerInfo: { marginTop: 10, padding: 8, backgroundColor: "#F0FDF4", borderRadius: 6 },
  learnerTitle: { fontSize: 14, fontWeight: "bold", color: "#10B981", marginBottom: 6 },
  learnerText: { fontSize: 13, color: "#222" },
  facilitySection: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    margin: 16,
    marginTop: 0,
    padding: 12
  },
  facilityHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  facilityTitle: { fontSize: 18, fontWeight: "bold", color: "#10B981" },
  facilityCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  facilityCardTitle: { fontSize: 16, fontWeight: "bold", color: "#10B981" },
  facilityCardText: { fontSize: 13, color: "#666", marginTop: 2 },
  facilityActionBtn: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6
  },
  facilityActionText: { color: "#fff", fontWeight: "bold" },
  inviteInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  inviteLabel: { fontSize: 14, color: "#222", fontWeight: "bold", marginRight: 8 },
  inviteInputBox: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  inviteInputText: { fontSize: 14, color: "#222" },
  actionFeedback: {
    color: "#10B981",
    fontWeight: "bold",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center"
  },
  roleSelectSection: { flexDirection: "row", justifyContent: "center", marginBottom: 16 },
  roleOptionBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  roleOptionBtnSelected: { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" },
  roleOptionText: { color: "#222", fontWeight: "bold", fontSize: 14 },
  roleOptionTextSelected: { color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 24,
    width: 300,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#222", marginBottom: 12 },
  modalText: { fontSize: 15, color: "#444", marginBottom: 18, textAlign: "center" },
  modalActions: { flexDirection: "row", marginTop: 8 },
  modalBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8
  },
  modalBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 }
});
