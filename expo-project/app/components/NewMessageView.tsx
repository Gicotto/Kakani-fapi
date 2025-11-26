import React, { useState, useEffect } from "react";
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
import { User } from "../types";
import { api } from "../utils/api";

interface NewMessageViewProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
  onOpenConversation: (recipientUsername: string, recipientUuid: string) => void;
}

export default function NewMessageView({
  currentUsername,
  currentUserUuid,
  onBack,
  onOpenConversation,
}: NewMessageViewProps) {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadActiveUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search query
    if (searchQuery.trim() === "") {
      setFilteredUsers(activeUsers);
    } else {
      const filtered = activeUsers.filter((user) =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, activeUsers]);

  const loadActiveUsers = async () => {
    setLoading(true);
    try {
      const users = await api.getActiveUsers();
      // Filter out current user from the list
      const filteredUsers = users.filter(
        (user: User) => user.username !== currentUsername
      );
      setActiveUsers(filteredUsers);
      setFilteredUsers(filteredUsers);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.username);
  };

  const handleSendMessage = async () => {
    if (!selectedUser) {
      Alert.alert("Error", "Please select a user to send a message to");
      return;
    }

    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message");
      return;
    }

    setSending(true);
    try {
      await api.sendMessage(currentUsername, selectedUser.username, message);
      
      // Navigate to the conversation view after sending
      onOpenConversation(selectedUser.username, selectedUser.uuid);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        selectedUser?.uuid === item.uuid && styles.userItemSelected,
      ]}
      onPress={() => handleSelectUser(item)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.username}>{item.username}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
      </View>

      {/* Main content card */}
      <View style={styles.contentWrapper}>
        <View style={styles.contentCard}>
          {/* User Search/Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>To:</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a user..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
          </View>

          {/* User List Dropdown */}
          {searchQuery.trim().length > 0 && !selectedUser && (
            <View style={styles.userListContainer}>
              {loading ? (
                <ActivityIndicator style={styles.loader} />
              ) : filteredUsers.length > 0 ? (
                <FlatList
                  data={filteredUsers}
                  renderItem={renderUserItem}
                  keyExtractor={(item) => item.uuid}
                  style={styles.userList}
                  contentContainerStyle={styles.userListContent}
                />
              ) : (
                <Text style={styles.noUsersText}>No users found</Text>
              )}
            </View>
          )}

          {/* Selected User Display */}
          {selectedUser && (
            <View style={styles.selectedUserBadge}>
              <Text style={styles.selectedUserText}>{selectedUser.username}</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedUser(null);
                  setSearchQuery("");
                }}
              >
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Message Input */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Message:</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              placeholderTextColor="#94a3b8"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!selectedUser || !message.trim() || sending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!selectedUser || !message.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.sendButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
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
  contentCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userListContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userList: {
    flex: 1,
  },
  userListContent: {
    padding: 8,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  userItemSelected: {
    backgroundColor: "#dbeafe",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  username: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "500",
  },
  loader: {
    padding: 20,
  },
  noUsersText: {
    textAlign: "center",
    padding: 20,
    color: "#6b7280",
    fontSize: 14,
  },
  selectedUserBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  selectedUserText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "600",
    marginRight: 8,
  },
  removeButton: {
    fontSize: 16,
    color: "#1e40af",
    fontWeight: "600",
  },
  messageInput: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minHeight: 140,
  },
  sendButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
