import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function FacilitiesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Facility Management</Text>
      <Text style={styles.subtitle}>
        Manage users, facilities, and permissions for your organization.
      </Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Users & Facilities</Text>
        {/* User/facility list will be rendered here */}
        <Text style={styles.placeholder}>No users or facilities found.</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Actions</Text>
        <TouchableOpacity style={styles.adminBtn}>
          <Text style={styles.adminBtnText}>Add User</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminBtn}>
          <Text style={styles.adminBtnText}>Remove User</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.adminBtn}>
          <Text style={styles.adminBtnText}>Set Roles</Text>
        </TouchableOpacity>
        {/* Admin actions will be wired to backend here */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#F9FAFB"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    marginBottom: 16
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 6
  },
  placeholder: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8
  },
  adminBtn: {
    backgroundColor: "#1D4ED8",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8
  },
  adminBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});
