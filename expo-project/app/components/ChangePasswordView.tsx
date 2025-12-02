import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";

export default function ChangePasswordView() {
  const { username } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);
    try {
      const data = await api.changePassword({
        username: username!,
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (data.success) {
        setSuccess("Password changed successfully!");
        // Clear form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        
        Alert.alert(
          "Success",
          "Your password has been changed successfully.",
          [{ text: "OK" }]
        );
      } else {
        setError(data.error || "Failed to change password");
      }
    } catch (e: any) {
      setError(e.message || "Unable to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Change Password</Text>
          <Text style={styles.headerSubtitle}>
            Update your password to keep your account secure
          </Text>
        </View>

        {/* Password Form Card */}
        <View style={styles.card}>
          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your current password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              editable={!loading}
              autoCapitalize="none"
            />
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              editable={!loading}
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              Must be at least 6 characters long
            </Text>
          </View>

          {/* Confirm New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm your new password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!loading}
              autoCapitalize="none"
            />
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Success Message */}
          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Security Tips Card */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>🔒 Password Security Tips</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Use a mix of uppercase, lowercase, numbers, and symbols
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Avoid using personal information or common words
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Don't reuse passwords from other accounts
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Consider using a password manager
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4fb",
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 24,
  },
  contentWrapper: {
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#64748b",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  helperText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 6,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  successIcon: {
    fontSize: 18,
    marginRight: 8,
    color: "#15803d",
    fontWeight: "700",
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: "#15803d",
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  tipsCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  tipBullet: {
    fontSize: 16,
    color: "#3b82f6",
    marginRight: 8,
    fontWeight: "700",
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
});
