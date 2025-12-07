import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../utils/api";

interface User {
  uuid: string;
  username: string;
  active: boolean;
}

interface UserWithStatus extends User {
  relationshipStatus?: string; // 'none', 'pending_sent', 'pending_received', 'friends'
  requestId?: number;
}

interface SearchFriendsViewProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
  onRequestSent?: () => void;
}

export default function SearchFriendsView({
  currentUsername,
  currentUserUuid,
  onBack,
  onRequestSent,
}: SearchFriendsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.searchUsers(query.trim());
      
      if (data.success) {
        // Filter out current user and inactive users
        const filtered = data.users.filter(
          (user: User) => 
            user.username !== currentUsername && 
            user.active
        );
        
        // Get relationship status for each user
        const usersWithStatus = await Promise.all(
          filtered.map(async (user: User) => {
            try {
              const statusData = await api.getRelationshipStatus(currentUsername, user.username);
              return {
                ...user,
                relationshipStatus: statusData.status || 'none',
                requestId: statusData.request_id
              };
            } catch (error) {
              return {
                ...user,
                relationshipStatus: 'none'
              };
            }
          })
        );
        
        setSearchResults(usersWithStatus);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error("Search error:", error.message);
      Alert.alert("Error", error.message || "Failed to search users");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (recipientUsername: string) => {
    setSendingTo(recipientUsername);
    try {
      const data = await api.sendFriendRequest({
        requester_username: currentUsername,
        recipient_username: recipientUsername,
      });

      if (data.success) {
        // Update the user's status in the list
        setSearchResults(prev => 
          prev.map(user => 
            user.username === recipientUsername
              ? { ...user, relationshipStatus: data.status || 'pending_sent', requestId: data.request_id }
              : user
          )
        );
        
        Alert.alert(
          "Success",
          `Friend request sent to ${recipientUsername}`
        );
        onRequestSent?.();
      } else {
        Alert.alert("Error", data.error || "Failed to send friend request");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send friend request");
    } finally {
      setSendingTo(null);
    }
  };

  const getButtonState = (user: UserWithStatus) => {
    const isSending = sendingTo === user.username;
    
    switch (user.relationshipStatus) {
      case 'friends':
        return {
          text: '✓ Friends',
          disabled: true,
          style: styles.friendsButton,
          textStyle: styles.friendsButtonText
        };
      case 'pending_sent':
        return {
          text: 'Request Sent',
          disabled: true,
          style: styles.pendingButton,
          textStyle: styles.pendingButtonText
        };
      case 'pending_received':
        return {
          text: 'Respond to Request',
          disabled: false,
          style: styles.respondButton,
          textStyle: styles.respondButtonText,
          onPress: () => {
            // Navigate to friend requests view
            Alert.alert(
              "Friend Request",
              `${user.username} has sent you a friend request. Go to Friend Requests to respond.`
            );
          }
        };
      default:
        return {
          text: isSending ? '' : 'Add Friend',
          disabled: isSending,
          style: styles.addButton,
          textStyle: styles.addButtonText,
          onPress: () => handleSendRequest(user.username)
        };
    }
  };

  const renderUserItem = ({ item }: { item: UserWithStatus }) => {
    const buttonState = getButtonState(item);
    const isSending = sendingTo === item.username;
    
    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.userStatus}>
              {item.active ? "Active" : "Offline"}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[buttonState.style, buttonState.disabled && styles.buttonDisabled]}
          onPress={buttonState.onPress}
          disabled={buttonState.disabled}
        >
          {isSending ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={buttonState.textStyle}>{buttonState.text}</Text>
          )}
        </TouchableOpacity>
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
        <Text style={styles.title}>Find Friends</Text>
      </View>

      {/* Search Section */}
      <View style={styles.contentWrapper}>
        <View style={styles.searchCard}>
          <View style={styles.searchSection}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Results Section */}
        <View style={styles.resultsCard}>
          {searchQuery.trim().length < 2 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>Search for friends</Text>
              <Text style={styles.emptySubtext}>
                Type at least 2 characters to search
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>😕</Text>
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>
                Try a different username
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.uuid}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
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
    marginRight: 12,
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
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0f172a",
  },
  resultsCard: {
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
  resultsList: {
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 12,
    color: "#6b7280",
  },
  addButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  friendsButton: {
    backgroundColor: "#10b981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  friendsButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  pendingButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  pendingButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  respondButton: {
    backgroundColor: "#8b5cf6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  respondButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
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
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
});
