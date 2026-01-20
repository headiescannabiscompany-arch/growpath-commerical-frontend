import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView
} from "react-native";

const TeamScreen = () => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  // Mock team members for demonstration
  const [teamMembers] = useState([
    {
      _id: "1",
      email: "equiptest@example.com",
      displayName: "Equipment Tester",
      role: "admin",
      joinedDate: "2026-01-11T02:04:57.934Z"
    }
  ]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Email is required");
      return;
    }
    setInviting(true);
    // Simulated invite - Phase 2 will connect to backend
    setTimeout(() => {
      Alert.alert("Success", `Invite sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteRole("member");
      setInviting(false);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setShowInviteModal(true)}>
        <Text style={styles.addButtonText}>+ Invite Team Member</Text>
      </TouchableOpacity>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Members ({teamMembers.length})</Text>
          {teamMembers.map((member) => (
            <View key={member._id} style={styles.memberCard}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.displayName}</Text>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <Text style={styles.memberMeta}>
                  {member.role.toUpperCase()} • Joined{" "}
                  {new Date(member.joinedDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{member.role}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coming Soon (Phase 2)</Text>
          <Text style={styles.cardSubtitle}>
            The following capabilities are on our roadmap:
          </Text>
          <Text style={styles.featureItem}>• Invite team members via email</Text>
          <Text style={styles.featureItem}>
            • Assign roles: Admin, Manager, Member, Viewer
          </Text>
          <Text style={styles.featureItem}>• Grant room-specific permissions</Text>
          <Text style={styles.featureItem}>• View team activity & last login</Text>
          <Text style={styles.featureItem}>• Remove or suspend users</Text>
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={[styles.modalOverlay, { zIndex: 1000, pointerEvents: "auto" }]}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Invite Team Member</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleSelector}>
              {["admin", "manager", "member", "viewer"].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleButton,
                    inviteRole === role && styles.roleButtonActive
                  ]}
                  onPress={() => setInviteRole(role)}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      inviteRole === role && styles.roleButtonTextActive
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteRole("member");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.inviteButton,
                  inviting && styles.disabledButton
                ]}
                onPress={handleInvite}
                disabled={inviting}
              >
                <Text style={styles.inviteButtonText}>
                  {inviting ? "Sending..." : "Send Invite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  addButton: {
    backgroundColor: "#0ea5e9",
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: "center"
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 0
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12
  },
  memberCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
    alignItems: "center"
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4
  },
  memberEmail: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4
  },
  memberMeta: {
    fontSize: 12,
    color: "#9ca3af"
  },
  roleBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0ea5e9",
    textTransform: "uppercase"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12
  },
  featureItem: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
    pointerEvents: "auto",
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#1f2937"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8
  },
  roleSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff"
  },
  roleButtonActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9"
  },
  roleButtonText: {
    fontSize: 13,
    color: "#6b7280",
    textTransform: "capitalize"
  },
  roleButtonTextActive: {
    color: "#fff",
    fontWeight: "600"
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#f3f4f6"
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600"
  },
  inviteButton: {
    backgroundColor: "#0ea5e9"
  },
  inviteButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default TeamScreen;
