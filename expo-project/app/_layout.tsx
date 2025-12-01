import { Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

function HeaderContent() {
  const { authenticated, logout, navigateToHome, navigateToNewMessage, navigateToSendInvite, currentView } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Close dropdown when clicking outside (web only)
  useEffect(() => {
    if (Platform.OS === "web" && accountMenuOpen) {
      const handleClickOutside = () => setAccountMenuOpen(false);
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [accountMenuOpen]);

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    await logout();
  };

  const handleNavigation = (navigateFn: () => void) => {
    setAccountMenuOpen(false);
    navigateFn();
  };

  // Don't show header if not authenticated
  if (!authenticated) {
    return null;
  }

  return (
    <View style={styles.header}>
      {/* Left side - Logo/Brand */}
      <View style={styles.headerLeft}>
        <Text style={styles.logo}>Nudge</Text>
      </View>

      {/* Center - Navigation */}
      <View style={styles.headerCenter}>
        <TouchableOpacity
          style={[styles.navButton, currentView === "home" && styles.navButtonActive]}
          onPress={() => handleNavigation(navigateToHome)}
        >
          <Text style={[styles.navButtonText, currentView === "home" && styles.navButtonTextActive]}>
            🏠 Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentView === "newMessage" && styles.navButtonActive]}
          onPress={() => handleNavigation(navigateToNewMessage)}
        >
          <Text style={[styles.navButtonText, currentView === "newMessage" && styles.navButtonTextActive]}>
            ✉️ New Message
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentView === "sendInvite" && styles.navButtonActive]}
          onPress={() => handleNavigation(navigateToSendInvite)}
        >
          <Text style={[styles.navButtonText, currentView === "sendInvite" && styles.navButtonTextActive]}>
            ✉️ Invite a Friend
          </Text>
        </TouchableOpacity>

      </View>

      {/* Right side - Account Menu */}
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.accountButton}
          onPress={(e) => {
            if (Platform.OS === "web") {
              e.stopPropagation();
            }
            setAccountMenuOpen(!accountMenuOpen);
          }}
        >
          <Text style={styles.accountButtonText}>👤</Text>
        </TouchableOpacity>

        {/* Account Dropdown */}
        {accountMenuOpen && (
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setAccountMenuOpen(false);
                // Navigate to profile
              }}
            >
              <Text style={styles.dropdownText}>View Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setAccountMenuOpen(false);
                // Navigate to account settings
              }}
            >
              <Text style={styles.dropdownText}>Account Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setAccountMenuOpen(false);
                // Navigate to app settings
              }}
            >
              <Text style={styles.dropdownText}>App Settings</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity 
              style={[styles.dropdownItem, styles.dropdownItemDanger]}
              onPress={handleLogout}
            >
              <Text style={styles.dropdownTextDanger}>Log Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <HeaderContent />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#f3f4fb" },
        }}
      />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    zIndex: 1000,
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3b82f6",
  },
  headerCenter: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  navButtonActive: {
    backgroundColor: "#eff6ff",
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6b7280",
  },
  navButtonTextActive: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
    position: "relative",
  },
  accountButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  accountButtonText: {
    fontSize: 20,
  },
  dropdownMenu: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 200,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 10000,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemDanger: {
    backgroundColor: "#fef2f2",
  },
  dropdownText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  dropdownTextDanger: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "600",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 8,
    marginHorizontal: 8,
  },
});
