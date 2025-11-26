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

interface Thread {
  thread_id: number;
  other_user_uuid: string;
  other_user_username: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface HomeViewProps {
  username: string;
  userUuid: string;
  onNewMessage: () => void;
  onOpenConversation: (recipientUsername: string, recipientUuid: string) => void;
}

export default function HomeView({
  username,
  userUuid,
  onNewMessage,
  onOpenConversation,
}: HomeViewProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const threadsData = await api.getThreads(username);
      setThreads(threadsData);
    } catch (error: any) {
      console.error("Failed to load threads:", error.message);
      Alert.alert("Error", "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const threadsData = await api.getThreads(username);
      setThreads(threadsData);
    } catch (error: any) {
      console.error("Failed to refresh threads:", error.message);
    } finally {
      setRefreshing(false);
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
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
      }
    } catch {
      return "";
    }
  };

  const renderThread = ({ item }: { item: Thread }) => (
    <TouchableOpacity
      style={styles.threadCard}
      onPress={() => onOpenConversation(item.other_user_username, item.other_user_uuid)}
    >
      <View style={styles.threadAvatar}>
        <Text style={styles.threadAvatarText}>
          {item.other_user_username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text style={styles.threadUsername}>{item.other_user_username}</Text>
          <Text style={styles.threadTime}>{formatTime(item.last_message_time)}</Text>
        </View>
        <View style={styles.threadMessageRow}>
          <Text style={styles.threadMessage} numberOfLines={1}>
            {item.last_message}
          </Text>
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.content}>
      <Text style={styles.welcomeText}>Welcome, {username}</Text>
      <Text style={styles.subText}>What would you like to do today?</Text>

      {/* Conversations Section */}
      <View style={styles.conversationsSection}>
        <View style={styles.conversationsHeader}>
          <Text style={styles.conversationsTitle}>Conversations</Text>
          
          {/* Action buttons */}
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.newMessageButton}
              onPress={onNewMessage}
            >
              <Text style={styles.newMessageIcon}>✉️</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
              <Text style={styles.refreshButton}>
                {refreshing ? "⟳" : "↻"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the ✉️ button above to start a new conversation!
            </Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            renderItem={renderThread}
            keyExtractor={(item) => item.thread_id.toString()}
            style={styles.threadsList}
            contentContainerStyle={styles.threadsListContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  conversationsSection: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  conversationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  conversationsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  newMessageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  newMessageIcon: {
    fontSize: 18,
  },
  refreshButton: {
    fontSize: 20,
    color: "#3b82f6",
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
    paddingVertical: 40,
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
  threadsList: {
    flex: 1,
  },
  threadsListContent: {
    gap: 12,
  },
  threadCard: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    alignItems: "center",
  },
  threadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  threadAvatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  threadUsername: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  threadTime: {
    fontSize: 12,
    color: "#94a3b8",
  },
  threadMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  threadMessage: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: "#3b82f6",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
});
