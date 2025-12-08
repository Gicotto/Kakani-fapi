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
import { User } from "../types";
import { api } from "../utils/api";

interface SendInvitesViewProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
  onSendInvite: () => void;
}

type RecipientType = "username" | "email" | "phone";

interface Recipient {
  type: RecipientType;
  value: string;
  user?: User; // Only for username type
}

export default function SendInvitesView({
  currentUsername,
  currentUserUuid,
  onBack,
  onSendInvite,
}: SendInvitesViewProps) {
  const [friendsList, setFriendsList] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  
  // Recipient 1
  const [searchQuery1, setSearchQuery1] = useState("");
  const [recipient1Type, setRecipient1Type] = useState<RecipientType>("username");
  const [recipient1, setRecipient1] = useState<Recipient | null>(null);
  const [showDropdown1, setShowDropdown1] = useState(false);
  
  // Recipient 2
  const [searchQuery2, setSearchQuery2] = useState("");
  const [recipient2Type, setRecipient2Type] = useState<RecipientType>("username");
  const [recipient2, setRecipient2] = useState<Recipient | null>(null);
  const [showDropdown2, setShowDropdown2] = useState(false);
  
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [lastSentCode, setLastSentCode] = useState<string | null>(null);

  useEffect(() => {
    loadFriends();
  }, []);

  useEffect(() => {
    if (searchQuery1.trim() === "" || recipient1Type !== "username") {
      setFilteredUsers([]);
      setShowDropdown1(false);
    } else {
      const filtered = friendsList.filter((user) =>
        user.username.toLowerCase().includes(searchQuery1.toLowerCase())
      );
      setFilteredUsers(filtered);
      setShowDropdown1(filtered.length > 0);
    }
  }, [searchQuery1, friendsList, recipient1Type]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await api.getFriendsList(currentUsername);
      if (response.success && response.friends) {
        // Map friends to User format
        const friends = response.friends.map((friend: any) => ({
          uuid: friend.uuid || "",
          username: friend.username,
          email: friend.email,
          phone: friend.phone,
          active: true,
          isAdmin: false,
        }));
        setFriendsList(friends);
      } else {
        setFriendsList([]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load friends");
      setFriendsList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser1 = (user: User) => {
    setRecipient1({
      type: "username",
      value: user.username,
      user: user,
    });
    setSearchQuery1(user.username);
    setShowDropdown1(false);
  };

  const handleSelectUser2 = (user: User) => {
    setRecipient2({
      type: "username",
      value: user.username,
      user: user,
    });
    setSearchQuery2(user.username);
    setShowDropdown2(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Remove common formatting characters
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    // Check if it's a valid phone number (10-15 digits, optional + prefix)
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(cleaned);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove formatting and ensure it has country code
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    if (!cleaned.startsWith('+')) {
      // Assume US if no country code
      cleaned = '+1' + cleaned;
    }
    return cleaned;
  };

  const handleAddRecipient1 = () => {
    if (!searchQuery1.trim()) {
      Alert.alert("Error", "Please enter a value");
      return;
    }

    if (recipient1Type === "email") {
      if (!validateEmail(searchQuery1)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }
      setRecipient1({
        type: "email",
        value: searchQuery1.trim(),
      });
    } else if (recipient1Type === "phone") {
      if (!validatePhone(searchQuery1)) {
        Alert.alert("Error", "Please enter a valid phone number (e.g., +1234567890)");
        return;
      }
      const formatted = formatPhoneNumber(searchQuery1);
      setRecipient1({
        type: "phone",
        value: formatted,
      });
      setSearchQuery1(formatted);
    }
  };

  const handleAddRecipient2 = () => {
    if (!searchQuery2.trim()) {
      Alert.alert("Error", "Please enter a value");
      return;
    }

    if (recipient2Type === "email") {
      if (!validateEmail(searchQuery2)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }
      setRecipient2({
        type: "email",
        value: searchQuery2.trim(),
      });
    } else if (recipient2Type === "phone") {
      if (!validatePhone(searchQuery2)) {
        Alert.alert("Error", "Please enter a valid phone number (e.g., +1234567890)");
        return;
      }
      const formatted = formatPhoneNumber(searchQuery2);
      setRecipient2({
        type: "phone",
        value: formatted,
      });
      setSearchQuery2(formatted);
    }
  };

  const handleSendInvite = async () => {
    if (!recipient1 || !recipient2) {
      Alert.alert("Error", "Please add both recipients");
      return;
    }

    // Validate recipients aren't the same
    if (recipient1.value === recipient2.value && recipient1.type === recipient2.type) {
      Alert.alert("Error", "Recipients must be different people");
      return;
    }

    setSending(true);
    try {
      const inviteData = {
        recipient1_username: recipient1.type === "username" ? recipient1.value : null,
        recipient1_email: recipient1.type === "email" ? recipient1.value : null,
        recipient1_phone: recipient1.type === "phone" ? recipient1.value : null,
        recipient2_username: recipient2.type === "username" ? recipient2.value : null,
        recipient2_email: recipient2.type === "email" ? recipient2.value : null,
        recipient2_phone: recipient2.type === "phone" ? recipient2.value : null,
        expires_in_hours: parseInt(expiresInHours) || 24,
      };

      const response = await api.createInvite(currentUsername, inviteData);

      // Track sent invite
      const inviteKey = `${recipient1.value}:${recipient2.value}`;
      setSentInvites(prev => new Set(prev).add(inviteKey));
      setLastSentCode(response.invite_code);

      Alert.alert(
        "Success! 🎉",
        `Invite sent! Code: ${response.invite_code}\n\nRecipient 1: ${recipient1.value} (${getNotificationMethod(response.notifications.recipient1)})\nRecipient 2: ${recipient2.value} (${getNotificationMethod(response.notifications.recipient2)})`,
        [
          {
            text: "OK",
            onPress: () => {
              // Don't reset form - keep it to show "Sent" state
              onSendInvite();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const getNotificationMethod = (notificationResult: any): string => {
    if (!notificationResult?.sent) return "notification failed";
    if (notificationResult.method === "in_app") return "in-app notification";
    if (notificationResult.method === "email") return "email sent";
    if (notificationResult.method === "sms") return "SMS sent";
    return "notification sent";
  };

  const renderUserItem = ({ item }: { item: User }, isRecipient1: boolean) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => isRecipient1 ? handleSelectUser1(item) : handleSelectUser2(item)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.username}>{item.username}</Text>
    </TouchableOpacity>
  );

  const renderRecipientSection = (
    recipientNumber: 1 | 2,
    recipient: Recipient | null,
    searchQuery: string,
    setSearchQuery: (value: string) => void,
    recipientType: RecipientType,
    setRecipientType: (type: RecipientType) => void,
    setRecipient: (recipient: Recipient | null) => void,
    showDropdown: boolean,
    handleAddRecipient: () => void
  ) => {
    const filteredFriendsForRecipient = recipientType === "username" && searchQuery.trim().length > 0
      ? friendsList.filter((user) =>
          user.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

    return (
      <View style={styles.recipientSection}>
        <Text style={styles.sectionLabel}>Recipient {recipientNumber}:</Text>

        {/* Type Selector */}
        {!recipient && (
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                recipientType === "username" && styles.typeButtonActive,
              ]}
              onPress={() => {
                setRecipientType("username");
                setSearchQuery("");
              }}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  recipientType === "username" && styles.typeButtonTextActive,
                ]}
              >
                Friend
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                recipientType === "email" && styles.typeButtonActive,
              ]}
              onPress={() => {
                setRecipientType("email");
                setSearchQuery("");
              }}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  recipientType === "email" && styles.typeButtonTextActive,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                recipientType === "phone" && styles.typeButtonActive,
              ]}
              onPress={() => {
                setRecipientType("phone");
                setSearchQuery("");
              }}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  recipientType === "phone" && styles.typeButtonTextActive,
                ]}
              >
                Phone
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Field */}
        {!recipient && (
          <>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.recipientInput}
                placeholder={
                  recipientType === "username"
                    ? "Search for a friend..."
                    : recipientType === "email"
                    ? "Enter email address..."
                    : "Enter phone number (+1234567890)..."
                }
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize={recipientType === "email" ? "none" : "none"}
                keyboardType={
                  recipientType === "phone" ? "phone-pad" : "default"
                }
              />
              {recipientType !== "username" && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddRecipient}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* User Dropdown (username only) */}
            {recipientType === "username" &&
              showDropdown &&
              filteredFriendsForRecipient.length > 0 && (
                <View style={styles.userListContainer}>
                  <FlatList
                    data={filteredFriendsForRecipient}
                    renderItem={(item) => renderUserItem(item, recipientNumber === 1)}
                    keyExtractor={(item) => item.uuid}
                    style={styles.userList}
                    contentContainerStyle={styles.userListContent}
                    nestedScrollEnabled
                  />
                </View>
              )}
            
            {/* No friends message */}
            {recipientType === "username" &&
              searchQuery.trim().length > 0 &&
              !loading &&
              filteredFriendsForRecipient.length === 0 && (
                <View style={styles.noFriendsContainer}>
                  <Text style={styles.noFriendsText}>
                    {friendsList.length === 0 
                      ? "You don't have any friends yet. Add friends to invite them!"
                      : "No friends match your search"}
                  </Text>
                </View>
              )}
          </>
        )}

        {/* Selected Recipient Display */}
        {recipient && (
          <View style={styles.selectedRecipientCard}>
            <View style={styles.selectedRecipientInfo}>
              <Text style={styles.selectedRecipientType}>
                {recipient.type === "username"
                  ? "👥 Friend"
                  : recipient.type === "email"
                  ? "📧 Email"
                  : "📱 Phone"}
              </Text>
              <Text style={styles.selectedRecipientValue}>
                {recipient.value}
              </Text>
              <Text style={styles.selectedRecipientNote}>
                {recipient.type === "username"
                  ? "Will receive in-app notification"
                  : recipient.type === "email"
                  ? "Will receive email invitation"
                  : "Will receive SMS invitation"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeRecipientButton}
              onPress={() => {
                setRecipient(null);
                setSearchQuery("");
              }}
            >
              <Text style={styles.removeRecipientButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Invite</Text>
      </View>

      {/* Main content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentCard}>
          <Text style={styles.cardTitle}>Connect Two People</Text>
          <Text style={styles.cardDescription}>
            Create an invite to connect two people. Connect your friends or invite external contacts via email/SMS.
          </Text>

          {/* Recipient 1 */}
          {renderRecipientSection(
            1,
            recipient1,
            searchQuery1,
            setSearchQuery1,
            recipient1Type,
            setRecipient1Type,
            setRecipient1,
            showDropdown1,
            handleAddRecipient1
          )}

          {/* Recipient 2 */}
          {renderRecipientSection(
            2,
            recipient2,
            searchQuery2,
            setSearchQuery2,
            recipient2Type,
            setRecipient2Type,
            setRecipient2,
            showDropdown2,
            handleAddRecipient2
          )}

          {/* Expiration */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Expires in (hours):</Text>
            <TextInput
              style={styles.expirationInput}
              placeholder="24"
              placeholderTextColor="#94a3b8"
              value={expiresInHours}
              onChangeText={setExpiresInHours}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Invite will expire after this time period
            </Text>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              recipient1 && recipient2 && sentInvites.has(`${recipient1.value}:${recipient2.value}`)
                ? styles.sentButton
                : styles.sendButton,
              (!recipient1 || !recipient2 || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendInvite}
            disabled={!recipient1 || !recipient2 || sending || (recipient1 && recipient2 && sentInvites.has(`${recipient1.value}:${recipient2.value}`))}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : recipient1 && recipient2 && sentInvites.has(`${recipient1.value}:${recipient2.value}`) ? (
              <Text style={styles.sentButtonText}>✓ Sent{lastSentCode ? ` (${lastSentCode})` : ""}</Text>
            ) : (
              <Text style={styles.sendButtonText}>Create Invite</Text>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 How it works:</Text>
            <Text style={styles.infoText}>
              • Friends get in-app notifications{"\n"}
              • Email recipients get beautiful email invitations{"\n"}
              • Phone recipients get SMS invitations{"\n"}
              • Both must accept before connecting
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  contentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
  recipientSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  typeSelector: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  typeButtonTextActive: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  recipientInput: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  addButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  userListContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
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
  noFriendsContainer: {
    backgroundColor: "#fef3c7",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  noFriendsText: {
    fontSize: 13,
    color: "#92400e",
    textAlign: "center",
    lineHeight: 18,
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
  selectedRecipientCard: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
  },
  selectedRecipientInfo: {
    flex: 1,
  },
  selectedRecipientType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
    marginBottom: 4,
  },
  selectedRecipientValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  selectedRecipientNote: {
    fontSize: 12,
    color: "#64748b",
  },
  removeRecipientButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  removeRecipientButtonText: {
    fontSize: 18,
    color: "#3b82f6",
    fontWeight: "600",
  },
  expirationInput: {
    backgroundColor: "#f9fafb",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  helperText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 8,
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
  sentButton: {
    backgroundColor: "#10b981",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#10b981",
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
  sentButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15803d",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#166534",
    lineHeight: 20,
  },
});