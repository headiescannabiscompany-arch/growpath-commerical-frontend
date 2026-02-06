import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Picker
} from "react-native";
import { useVendorSignup } from "@/hooks/useVendorSignup";
import { handleApiError } from "@/ui/handleApiError";

const VENDOR_TYPES = [
  { label: "Select vendor type...", value: "" },
  { label: "Soil Company", value: "soil" },
  { label: "Nutrient Company", value: "nutrients" },
  { label: "Genetics Company", value: "genetics" },
  { label: "Equipment Supplier", value: "equipment" },
  { label: "Supplements", value: "supplements" },
  { label: "Other", value: "other" }
];

const VendorSignup = ({ navigation }) => {
  const { signupAsVendor, isPending, error } = useVendorSignup();
  const [vendorType, setVendorType] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const handlers = useMemo(
    () => ({
      onAuthRequired: () => {
        Alert.alert("Authentication Required", "Please log in to sign up as a vendor");
      },
      onFacilityDenied: () => {
        Alert.alert("Access Denied", "You don't have permission to sign up as a vendor");
      },
      toast: (message) => {
        Alert.alert("Notice", message);
      }
    }),
    []
  );

  useEffect(() => {
    if (error) {
      handleApiError(error, handlers);
    }
  }, [error, handlers]);

  const handleSignup = async () => {
    if (!companyName || !vendorType || !contactEmail) {
      Alert.alert("Missing Info", "Please fill in company name, type, and email");
      return;
    }

    try {
      await signupAsVendor({
        companyName,
        vendorType,
        description,
        websiteUrl,
        contactEmail,
        contactPhone
      });

      Alert.alert("Success", "Vendor account created! Pending admin verification.");
      navigation.goBack();
    } catch (err) {
      handleApiError(err, handlers);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Become a Vendor</Text>
        <Text style={styles.subtitle}>
          Create and sell educational guides for growers using your products
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Advanced Nutrients Co."
          value={companyName}
          onChangeText={setCompanyName}
        />

        <Text style={styles.label}>Vendor Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vendorType}
            onValueChange={setVendorType}
            style={styles.picker}
          >
            {VENDOR_TYPES.map((type) => (
              <Picker.Item key={type.value} label={type.label} value={type.value} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Tell growers about your company and products..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Website URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          keyboardType="url"
        />

        <Text style={styles.label}>Contact Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="contact@company.com"
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Contact Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 123-4567"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.infoText}>
          After submitting, our team will verify your company and activate your vendor
          account within 24-48 hours.
        </Text>

        <TouchableOpacity
          style={[styles.button, isPending && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Vendor Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16
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
    color: "#6b7280",
    lineHeight: 20
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    backgroundColor: "#f9fafb",
    overflow: "hidden"
  },
  picker: {
    height: 50
  },
  infoText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 16,
    lineHeight: 18,
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
};

export default VendorSignup;
