import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../utils/api";

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

interface NotificationsViewProps {
  currentUsername: string;
  onBack: () => void;
  onNavigateToFriends?: () => void;
  onNavigateToMessages?: () => void;
}

export default function NotificationsView({
  currentUsername,
  onBack,
  onNavigateToFriends,
  onNavigateToMessages,
}: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(
        currentUsername,
        50, // Get up to 50 notifications
        filter === "unread"
      );
      
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error: any) {
      console.error("Failed to load notifications:", error.message);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getNotifications(
        currentUsername,
        50,
        filter === "unread"
      );
      
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error: any) {
      console.error("Failed to refresh notifications:", error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await api.markNotificationsAsRead([notificationId]);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      // If in unread filter, remove from list
      if (filter === "unread") {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error: any) {
      console.error("Failed to mark as read:", error.message);
      Alert.alert("Error", "Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead(currentUsername);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      // If in unread filter, clear list
      if (filter === "unread") {
        setNotifications([]);
      }
      
      Alert.alert("Success", "All notifications marked as read");
    } catch (error: any) {
      console.error("Failed to mark all as read:", error.message);
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const handleDelete = async (notificationId: number) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(notificationId);
            try {
              await api.deleteNotification(notificationId, currentUsername);
              
              // Remove from local state
              setNotifications(prev => prev.filter(n => n.id !== notificationId));
            } catch (error: any) {
              console.error("Failed to delete notification:", error.message);
              Alert.alert("Error", "Failed to delete notification");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
    
    // Navigate based on type
    switch (notification.type) {
      case "friend_request":
      case "friend_accepted":
        onNavigateToFriends?.();
        break;
      case "message":
        onNavigateToMessages?.();
        break;
      default:
        // Do nothing for other types
        break;
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor(diffInHours * 60);
        return diffInMinutes === 0 ? "Just now" : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h ago`;
      } else if (diffInHours < 168) {
        const days = Math.floor(diffInHours / 24);
        return `${days}d ago`;
      } else {
        return date.toLocaleDateString([], { 
          month: "short", 
          day: "numeric",
          year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
        });
      }
    } catch {
      return "";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return "👥";
      case "friend_accepted":
        return "✅";
      case "message":
        return "💬";
      case "invite":
        return "✉️";
      case "system":
        return "🔔";
      default:
        return "📬";
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isDeleting = deletingId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.is_read && styles.notificationCardUnread
        ]}
        onPress={() => handleNotificationClick(item)}
        disabled={isDeleting}
      >
        <View style={styles.notificationIcon}>
          <Text style={styles.notificationIconText}>
            {getNotificationIcon(item.type)}
          </Text>
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {!item.is_read && <View style={styles.unreadDot} />}
          </View>
          
          <Text style={styles.notificationMessage}>{item.message}</Text>
          
          {item.from_username && (
            <Text style={styles.notificationFrom}>
              from {item.from_username}
            </Text>
          )}
          
          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTime}>
              {formatTime(item.created_at)}
            </Text>
            
            <View style={styles.notificationActions}>
              {!item.is_read && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(item.id);
                  }}
                >
                  <Text style={styles.actionButtonText}>Mark read</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Text style={[styles.actionButtonText, styles.deleteText]}>
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && filter === "all" && (
          <TouchableOpacity 
            onPress={handleMarkAllRead}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, filter === "all" && styles.tabActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.tabText, filter === "all" && styles.tabTextActive]}>
            All {notifications.length > 0 && `(${notifications.length})`}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, filter === "unread" && styles.tabActive]}
          onPress={() => setFilter("unread")}
        >
          <Text style={[styles.tabText, filter === "unread" && styles.tabTextActive]}>
            Unread {filter === "unread" && notifications.length > 0 && `(${notifications.length})`}
            {filter === "all" && unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <View style={styles.contentWrapper}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>
              {filter === "unread" ? "✅" : "🔔"}
            </Text>
            <Text style={styles.emptyText}>
              {filter === "unread" 
                ? "No unread notifications" 
                : "No notifications yet"}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === "unread"
                ? "You're all caught up!"
                : "Notifications will appear here"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4fb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backArrow: {
    fontSize: 24,
    color: "#3b82f6",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginLeft: 12,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabActive: {
    backgroundColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notificationsList: {
    gap: 12,
    paddingBottom: 20,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: "#eff6ff",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationIconText: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3b82f6",
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationFrom: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  notificationActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  deleteText: {
    color: "#ef4444",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
