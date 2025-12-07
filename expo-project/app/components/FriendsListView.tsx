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

interface Friend {
  uuid: string;
  username: string;
  active: boolean;
  friends_since: string;
}

interface FriendsListViewProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
  onOpenConversation?: (username: string, uuid: string) => void;
  onFriendRemoved?: () => void;
}

export default function FriendsListView({
  currentUsername,
  currentUserUuid,
  onBack,
  onOpenConversation,
  onFriendRemoved,
}: FriendsListViewProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await api.getFriendsList(currentUsername);
      
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error: any) {
      console.error("Failed to load friends:", error.message);
      Alert.alert("Error", "Failed to load friends list");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await api.getFriendsList(currentUsername);
      
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error: any) {
      console.error("Failed to refresh friends:", error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveFriend = async (friendUsername: string) => {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendUsername} from your friends?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setRemovingUsername(friendUsername);
            try {
              const data = await api.removeFriend({
                username: currentUsername,
                friend_username: friendUsername,
              });

              if (data.success) {
                setFriends(prev => 
                  prev.filter(friend => friend.username !== friendUsername)
                );
                onFriendRemoved?.();
                Alert.alert("Success", `${friendUsername} has been removed from your friends`);
              } else {
                Alert.alert("Error", data.error || "Failed to remove friend");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to remove friend");
            } finally {
              setRemovingUsername(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString([], { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      });
    } catch {
      return "Unknown";
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const isRemoving = removingUsername === item.username;
    
    return (
      <View style={styles.friendCard}>
        <View style={styles.friendInfo}>
          <View style={[styles.friendAvatar, !item.active && styles.friendAvatarInactive]}>
            <Text style={styles.friendAvatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
            {item.active && <View style={styles.activeDot} />}
          </View>
          <View style={styles.friendDetails}>
            <Text style={styles.friendUsername}>{item.username}</Text>
            <Text style={styles.friendSince}>
              Friends since {formatDate(item.friends_since)}
            </Text>
          </View>
        </View>

        <View style={styles.friendActions}>
          {onOpenConversation && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={() => onOpenConversation(item.username, item.uuid)}
            >
              <Text style={styles.messageButtonText}>💬</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
            onPress={() => handleRemoveFriend(item.username)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator color="#ef4444" size="small" />
            ) : (
              <Text style={styles.removeButtonText}>Remove</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Friends</Text>
        <TouchableOpacity 
          onPress={handleRefresh} 
          disabled={refreshing}
          style={styles.refreshButton}
        >
          <Text style={styles.refreshIcon}>
            {refreshing ? "⟳" : "↻"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Friends Count */}
      {!loading && friends.length > 0 && (
        <View style={styles.statsCard}>
          <Text style={styles.statsText}>
            {friends.length} {friends.length === 1 ? "Friend" : "Friends"}
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.contentWrapper}>
        <View style={styles.contentCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Start adding friends to see them here!
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              renderItem={renderFriend}
              keyExtractor={(item) => item.uuid}
              contentContainerStyle={styles.friendsList}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>
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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshIcon: {
    fontSize: 24,
    color: "#3b82f6",
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  friendsList: {
    gap: 12,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  friendInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  friendAvatarInactive: {
    backgroundColor: "#94a3b8",
  },
  friendAvatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  activeDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  friendDetails: {
    flex: 1,
  },
  friendUsername: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  friendSince: {
    fontSize: 12,
    color: "#6b7280",
  },
  friendActions: {
    flexDirection: "row",
    gap: 8,
  },
  messageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  messageButtonText: {
    fontSize: 18,
  },
  removeButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fee2e2",
    minWidth: 70,
    alignItems: "center",
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "600",
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
});
