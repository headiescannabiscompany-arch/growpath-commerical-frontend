import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert
} from "react-native";
import { useAuth } from "../context/AuthContext";

const CreateVendorGuide = ({ navigation }) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("Growing Guides");
  const [targetAudience, setTargetAudience] = useState("both");
  const [products, setProducts] = useState("");

  useEffect(() => {
    loadVendor();
  }, []);

  const loadVendor = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/vendors/profile/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      }
    } catch (error) {
      console.log("Error loading vendor:", error);
    }
  };

  const handleCreate = async () => {
    if (!title || !description) {
      Alert.alert("Missing Info", "Please fill in title and description");
      return;
    }

    setLoading(true);
    try {
      const vendorProducts = products
        .split(",")
        .map((p) => ({ productName: p.trim() }))
        .filter((p) => p.productName);

      const response = await fetch("http://localhost:5001/api/courses/vendor/guide", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price) || 0,
          category,
          targetAudience,
          vendorProducts,
          tags: ["vendor-guide", targetAudience]
        })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert("Success", "Guide created! It will be reviewed before publishing.");
        navigation.goBack();
      } else {
        Alert.alert("Error", data.message || "Failed to create guide");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!vendor) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading vendor info...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create a Growing Guide</Text>
        <Text style={styles.subtitle}>for {vendor.companyName}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Guide Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Complete Nutrient Guide for Flowering Stage"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what growers will learn from this guide..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
        />

        <Text style={styles.label}>Target Audience</Text>
        <View style={styles.buttonGroup}>
          {["home-grower", "commercial", "both"].map((audience) => (
            <TouchableOpacity
              key={audience}
              style={[
                styles.audienceButton,
                targetAudience === audience && styles.audienceButtonActive
              ]}
              onPress={() => setTargetAudience(audience)}
            >
              <Text
                style={[
                  styles.audienceButtonText,
                  targetAudience === audience && styles.audienceButtonTextActive
                ]}
              >
                {audience === "home-grower"
                  ? "Home Growers"
                  : audience === "commercial"
                    ? "Commercial"
                    : "Both"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Your Products (comma-separated)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Nutrient Mix A, Growth Accelerant, pH Buffer"
          value={products}
          onChangeText={setProducts}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Price ($)</Text>
        <TextInput
          style={styles.input}
          placeholder="0 for free"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <Text style={styles.priceInfo}>
          You'll receive 70% of sales. 30% goes to platform operations.
        </Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Guide</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb"
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280"
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "500"
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 2
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
    backgroundColor: "#f9fafb"
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "right"
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8
  },
  audienceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f9fafb"
  },
  audienceButtonActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9"
  },
  audienceButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280"
  },
  audienceButtonTextActive: {
    color: "#fff"
  },
  priceInfo: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic"
  },
  button: {
    backgroundColor: "#0ea5e9",
    borderRadius: 6,
    paddingVertical: 12,
    marginTop: 20,
    alignItems: "center"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  }
});

export default CreateVendorGuide;
