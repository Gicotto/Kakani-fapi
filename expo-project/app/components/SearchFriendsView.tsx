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
  ScrollView,
} from "react-native";
import { api } from "../utils/api";

interface User {
  uuid: string;
  username: string;
  active: boolean;
}

interface UserWithStatus extends User {
  relationshipStatus?: string;
  requestId?: number;
}

interface SearchFriendsViewProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
  onRequestSent?: () => void;
}

type InviteType = "username" | "email" | "phone";

export default function SearchFriendsView({
  currentUsername,
  currentUserUuid,
  onBack,
  onRequestSent,
}: SearchFriendsViewProps) {
  const [inviteType, setInviteType] = useState<InviteType>("username");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // External invite states
  const [externalContact, setExternalContact] = useState("");
  const [sendingExternal, setSendingExternal] = useState(false);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSentInvites();
  }, []);

  const loadSentInvites = async () => {
    // Load previously sent invites from storage
    // You could use AsyncStorage here
    try {
      // const stored = await AsyncStorage.getItem('sent_invites');
      // if (stored) {
      //   setSentInvites(new Set(JSON.parse(stored)));
      // }
    } catch (error) {
      console.error("Failed to load sent invites:", error);
    }
  };

  const saveSentInvite = async (contact: string) => {
    const updated = new Set(sentInvites);
    updated.add(contact);
    setSentInvites(updated);
    
    // Save to storage
    try {
      // await AsyncStorage.setItem('sent_invites', JSON.stringify(Array.from(updated)));
    } catch (error) {
      console.error("Failed to save sent invite:", error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (inviteType !== "username") {
      return; // Don't search if email/phone mode
    }
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.searchUsers(query.trim());
      
      if (data.success) {
        const filtered = data.users.filter(
          (user: User) => 
            user.username !== currentUsername && 
            user.active
        );
        
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(cleaned);
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    if (!cleaned.startsWith('+')) {
      cleaned = '+1' + cleaned;
    }
    return cleaned;
  };

  const handleSendExternalInvite = async () => {
    if (!externalContact.trim()) {
      Alert.alert("Error", "Please enter a contact");
      return;
    }

    // Validate based on type
    if (inviteType === "email") {
      if (!validateEmail(externalContact)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }
    } else if (inviteType === "phone") {
      if (!validatePhone(externalContact)) {
        Alert.alert("Error", "Please enter a valid phone number (e.g., +1234567890)");
        return;
      }
    }

    setSendingExternal(true);
    try {
      // Create a friend invitation
      const inviteData: any = {
        recipient1_username: currentUsername, // Current user
        recipient1_email: null,
        recipient1_phone: null,
        recipient2_username: null,
        recipient2_email: null,
        recipient2_phone: null,
        expires_in_hours: 168, // 7 days for friend invites
      };

      // Set recipient 2 based on invite type
      const contactValue = inviteType === "phone" 
        ? formatPhoneNumber(externalContact) 
        : externalContact.trim();

      if (inviteType === "email") {
        inviteData.recipient2_email = contactValue;
      } else if (inviteType === "phone") {
        inviteData.recipient2_phone = contactValue;
      }

      const response = await api.createInvite(currentUsername, inviteData);

      // Save to sent invites
      await saveSentInvite(contactValue);

      Alert.alert(
        "Invitation Sent! 🎉",
        `Friend invitation sent to ${contactValue}\n\nInvite Code: ${response.invite_code}\n\nThey will receive an ${inviteType === "email" ? "email" : "SMS"} with instructions to join and connect with you.`,
        [
          {
            text: "OK",
            onPress: () => {
              setExternalContact("");
              onRequestSent?.();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send invitation");
    } finally {
      setSendingExternal(false);
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

  const renderUsernameSearch = () => (
    <>
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
              Try a different username or invite via email/phone
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
    </>
  );

  const renderExternalInvite = () => (
    <ScrollView style={styles.externalInviteContainer}>
      <View style={styles.externalCard}>
        <Text style={styles.cardTitle}>
          {inviteType === "email" ? "📧 Invite via Email" : "📱 Invite via Phone"}
        </Text>
        <Text style={styles.cardDescription}>
          Send a friend invitation to someone who isn't on the platform yet
        </Text>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            {inviteType === "email" ? "Email Address:" : "Phone Number:"}
          </Text>
          <TextInput
            style={styles.externalInput}
            placeholder={
              inviteType === "email"
                ? "friend@example.com"
                : "+1234567890"
            }
            placeholderTextColor="#94a3b8"
            value={externalContact}
            onChangeText={setExternalContact}
            autoCapitalize="none"
            keyboardType={inviteType === "phone" ? "phone-pad" : "email-address"}
          />
        </View>

        <TouchableOpacity
          style={[
            sentInvites.has(externalContact.trim()) || sentInvites.has(formatPhoneNumber(externalContact)) 
              ? styles.sentInviteButton 
              : styles.sendInviteButton,
            (!externalContact.trim() || sendingExternal) && styles.buttonDisabled
          ]}
          onPress={handleSendExternalInvite}
          disabled={!externalContact.trim() || sendingExternal || sentInvites.has(externalContact.trim()) || (inviteType === "phone" && sentInvites.has(formatPhoneNumber(externalContact)))}
        >
          {sendingExternal ? (
            <ActivityIndicator color="#ffffff" />
          ) : sentInvites.has(externalContact.trim()) || (inviteType === "phone" && sentInvites.has(formatPhoneNumber(externalContact))) ? (
            <>
              <Text style={styles.sentInviteButtonText}>✓ Invitation Sent</Text>
            </>
          ) : (
            <Text style={styles.sendInviteButtonText}>
              Send Friend Invitation
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💡 How it works:</Text>
          <Text style={styles.infoText}>
            {inviteType === "email"
              ? "• Your friend will receive an email with an invitation link\n• They can sign up and automatically connect with you\n• The invitation expires in 7 days"
              : "• Your friend will receive an SMS with an invitation link\n• They can sign up and automatically connect with you\n• The invitation expires in 7 days"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Friends</Text>
      </View>

      {/* Type Selector */}
      <View style={styles.typeSelectorContainer}>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              inviteType === "username" && styles.typeButtonActive,
            ]}
            onPress={() => {
              setInviteType("username");
              setSearchQuery("");
              setExternalContact("");
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                inviteType === "username" && styles.typeButtonTextActive,
              ]}
            >
              Platform User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              inviteType === "email" && styles.typeButtonActive,
            ]}
            onPress={() => {
              setInviteType("email");
              setSearchQuery("");
              setSearchResults([]);
              setExternalContact("");
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                inviteType === "email" && styles.typeButtonTextActive,
              ]}
            >
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              inviteType === "phone" && styles.typeButtonActive,
            ]}
            onPress={() => {
              setInviteType("phone");
              setSearchQuery("");
              setSearchResults([]);
              setExternalContact("");
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                inviteType === "phone" && styles.typeButtonTextActive,
              ]}
            >
              Phone
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentWrapper}>
        {inviteType === "username" ? renderUsernameSearch() : renderExternalInvite()}
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
  typeSelectorContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#3b82f6",
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  typeButtonTextActive: {
    color: "#ffffff",
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
    opacity: 0.6,
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
  externalInviteContainer: {
    flex: 1,
  },
  externalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  externalInput: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sendInviteButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sendInviteButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  sentInviteButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  sentInviteButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 20,
  },
});