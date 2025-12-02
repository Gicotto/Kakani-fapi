import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../utils/api";

interface UserDetails {
  username: string;
  email: string | null;
  phone: string | null;
  user_id: string;
  active?: boolean;
  isAdmin?: boolean;
  last_logged_in_at?: string | null;
}

interface AccountSettingsViewProps {
  onChangePassword: () => void;
}

export default function AccountSettingsView({
  onChangePassword,
}: AccountSettingsViewProps) {
  const { username } = useAuth();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserDetails();
  }, [username]);

  const fetchUserDetails = async () => {
    if (!username) {
      setError("No user logged in");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // You'll need to create this endpoint or use an existing one
      const data = await api.getUserDetails(username);
      setUserDetails(data);
    } catch (e: any) {
      setError(e.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading account details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.contentWrapper}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userDetails?.username?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          </View>
          <Text style={styles.displayName}>{userDetails?.username}</Text>
          <Text style={styles.userIdText}>ID: {userDetails?.user_id}</Text>
        </View>

        {/* Account Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          
          {/* Username Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>
                {userDetails?.username || "Not set"}
              </Text>
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>
                {userDetails?.email || "Not set"}
              </Text>
            </View>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.fieldValueContainer}>
              <Text style={styles.fieldValue}>
                {userDetails?.phone || "Not set"}
              </Text>
            </View>
          </View>
        </View>

        {/* Account Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Status</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Account Active</Text>
            <View style={[
              styles.statusBadge, 
              userDetails?.active ? styles.statusBadgeActive : styles.statusBadgeInactive
            ]}>
              <Text style={[
                styles.statusBadgeText,
                userDetails?.active ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive
              ]}>
                {userDetails?.active ? "✓ Active" : "✗ Inactive"}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Account Type</Text>
            <View style={[
              styles.statusBadge,
              userDetails?.isAdmin ? styles.statusBadgeAdmin : styles.statusBadgeUser
            ]}>
              <Text style={[
                styles.statusBadgeText,
                userDetails?.isAdmin ? styles.statusBadgeTextAdmin : styles.statusBadgeTextUser
              ]}>
                {userDetails?.isAdmin ? "👑 Admin" : "👤 User"}
              </Text>
            </View>
          </View>

          {userDetails?.last_logged_in_at && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Login</Text>
              <Text style={styles.statusValue}>
                {new Date(userDetails.last_logged_in_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>✏️ Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onChangePassword}>
            <Text style={styles.actionButtonText}>🔒 Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]}>
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
              🗑️ Delete Account
            </Text>
          </TouchableOpacity>
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
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#ffffff",
  },
  displayName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  userIdText: {
    fontSize: 13,
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValueContainer: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fieldValue: {
    fontSize: 16,
    color: "#0f172a",
    fontWeight: "500",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },
  statusValue: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeInactive: {
    backgroundColor: "#fee2e2",
  },
  statusBadgeAdmin: {
    backgroundColor: "#fef3c7",
  },
  statusBadgeUser: {
    backgroundColor: "#e0e7ff",
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: "#15803d",
  },
  statusBadgeTextInactive: {
    color: "#dc2626",
  },
  statusBadgeTextAdmin: {
    color: "#d97706",
  },
  statusBadgeTextUser: {
    color: "#4338ca",
  },
  actionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionButton: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  actionButtonDanger: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  actionButtonTextDanger: {
    color: "#dc2626",
  },
});
