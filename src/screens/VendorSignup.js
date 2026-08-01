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
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createVendorSignupStyles(palette), [palette]);
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
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Become a Vendor
        </Text>
        <Text style={styles.subtitle}>
          Create and sell educational guides for growers using your products
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Advanced Nutrients Co."
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          accessibilityLabel="Company name"
          value={companyName}
          onChangeText={setCompanyName}
        />

        <Text style={styles.label}>Vendor Type *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vendorType}
            onValueChange={setVendorType}
            style={styles.picker}
            accessibilityLabel="Vendor type"
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
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          accessibilityLabel="Vendor description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Website URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://..."
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          accessibilityLabel="Website URL"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          keyboardType="url"
        />

        <Text style={styles.label}>Contact Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="contact@company.com"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          accessibilityLabel="Contact email"
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
        />

        <Text style={styles.label}>Contact Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="+1 (555) 123-4567"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          accessibilityLabel="Contact phone"
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
          accessibilityRole="button"
          accessibilityLabel="Create vendor account"
        >
          {isPending ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.buttonText}>Create Vendor Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export function createVendorSignupStyles(palette) {
  return {
    container: {
      flex: 1,
      backgroundColor: palette.page,
      padding: 16
    },
    header: {
      marginBottom: 24
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: palette.text,
      marginBottom: 4
    },
    subtitle: {
      fontSize: 14,
      color: palette.textMuted,
      lineHeight: 20
    },
    form: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 16,
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      elevation: 2
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: palette.text,
      marginBottom: 8,
      marginTop: 16
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: palette.text,
      backgroundColor: palette.surface
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
      paddingTop: 12
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      overflow: "hidden"
    },
    picker: {
      height: 50,
      color: palette.text,
      backgroundColor: palette.surface
    },
    infoText: {
      fontSize: 13,
      color: palette.textMuted,
      marginTop: 16,
      lineHeight: 18,
      fontStyle: "italic"
    },
    button: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12,
      marginTop: 20,
      alignItems: "center"
    },
    buttonDisabled: {
      opacity: 0.6
    },
    buttonText: {
      color: palette.accentText,
      fontSize: 16,
      fontWeight: "600"
    }
  };
}

export default VendorSignup;
