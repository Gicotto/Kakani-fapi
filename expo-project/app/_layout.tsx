import { Stack } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { api } from "./utils/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  from_username?: string;
  related_id?: number;
}

function HeaderContent() {
  const {
    authenticated,
    logout,
    navigateToHome,
    navigateToNewMessage,
    navigateToSendInvite,
    navigateToAccountSettings,
    navigateToChangePassword,
    currentView,
    navigateToFriendsHub,
    navigateToNotifications,
    username,
  } = useAuth();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    if (authenticated && username) {
      loadUnreadCount();
      
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated, username]);

  // Close dropdown when clicking outside (web only)
  useEffect(() => {
    if (Platform.OS === "web" && (accountMenuOpen || notificationsMenuOpen)) {
      const handleClickOutside = () => {
        setAccountMenuOpen(false);
        setNotificationsMenuOpen(false);
      };
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [accountMenuOpen, notificationsMenuOpen]);

  const loadUnreadCount = async () => {
    if (!username) return;
    
    try {
      const data = await api.getUnreadCount(username);
      if (data.success) {
        setUnreadCount(data.unread_count);
      }
    } catch (error: any) {
      console.error("Failed to load unread count:", error.message);
    }
  };

  const loadNotifications = async () => {
    if (!username) return;
    
    setLoadingNotifications(true);
    try {
      const data = await api.getNotifications(username, 10, true); // Get 10 unread notifications
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error: any) {
      console.error("Failed to load notifications:", error.message);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      await api.markNotificationsAsRead([notification.id]);
      
      // Update local state
      setNotifications(prev =>
        prev.filter(n => n.id !== notification.id) // Remove from unread list
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Navigate based on notification type
      if (notification.type === 'friend_request') {
        // Navigate to friend requests
        setNotificationsMenuOpen(false);
        navigateToFriendsHub();
      } else if (notification.type === 'friend_accepted') {
        // Navigate to friends list
        setNotificationsMenuOpen(false);
        navigateToFriendsHub();
      }
      // Add more navigation cases as needed
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error.message);
    }
  };

  const handleMarkAllRead = async () => {
    if (!username) return;
    
    try {
      await api.markAllNotificationsAsRead(username);
      setNotifications([]);
      setUnreadCount(0);
    } catch (error: any) {
      console.error("Failed to mark all as read:", error.message);
    }
  };

  const formatNotificationTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch {
      return "";
    }
  };

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setNotificationsMenuOpen(false);
    await logout();
  };

  const handleNavigation = (navigateFn: () => void) => {
    setNotificationsMenuOpen(false);
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

        <TouchableOpacity
          style={[styles.navButton, currentView === "friendsHub" && styles.navButtonActive]}
          onPress={() => handleNavigation(navigateToFriendsHub)}
        >
          <Text style={[styles.navButtonText, currentView === "friendsHub" && styles.navButtonTextActive]}>
            Friends Hub
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right side - Notifications & Account Menu */}
      <View style={styles.headerRight}>
        {/* Buttons Container */}
        <View style={styles.iconButtonsContainer}>
          {/* Notifications Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              if (Platform.OS === "web") {
                e.stopPropagation();
              }
              setAccountMenuOpen(false);
              const willOpen = !notificationsMenuOpen;
              setNotificationsMenuOpen(willOpen);
              
              // Load notifications when opening
              if (willOpen) {
                loadNotifications();
              }
            }}
          >
            <Text style={styles.iconButtonText}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Account Button */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={(e) => {
              if (Platform.OS === "web") {
                e.stopPropagation();
              }
              setNotificationsMenuOpen(false);
              setAccountMenuOpen(!accountMenuOpen);
            }}
          >
            <Text style={styles.iconButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Dropdown */}
        {notificationsMenuOpen && (
          <View style={styles.dropdownMenu}>
            {/* Header */}
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Notifications</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead}>
                  <Text style={styles.markAllReadText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.dropdownDivider} />

            {/* Notifications List */}
            {loadingNotifications ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyNotifications}>
                <Text style={styles.emptyNotificationsText}>No unread notifications</Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((notification) => (
                  <TouchableOpacity
                    key={notification.id}
                    style={styles.notificationItem}
                    onPress={() => handleNotificationClick(notification)}
                  >
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {formatNotificationTime(notification.created_at)}
                      </Text>
                    </View>
                    <View style={styles.unreadDot} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.dropdownDivider} />

        <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setNotificationsMenuOpen(false);
                navigateToNotifications();
              }}
            >
              <Text style={styles.dropdownText}>View All Notifications</Text>
            </TouchableOpacity>
          </View>
        )}

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
                navigateToAccountSettings();
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
  iconButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconButtonText: {
    fontSize: 20,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  dropdownMenu: {
    position: "absolute",
    top: 48,
    right: 0,
    width: 320,
    maxHeight: 500,
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
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownHeaderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  markAllReadText: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "600",
  },
  notificationsList: {
    maxHeight: 360,
  },
  notificationItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#eff6ff",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 11,
    color: "#94a3b8",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    marginLeft: 8,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyNotifications: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyNotificationsText: {
    fontSize: 14,
    color: "#6b7280",
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
