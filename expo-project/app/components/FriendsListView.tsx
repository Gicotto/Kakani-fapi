import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  SectionList,
} from "react-native";
import { api } from "../utils/api";

interface Friend {
  uuid: string;
  username: string;
  active: boolean;
  friends_since: string;
}

interface PendingInvite {
  invite_code: string;
  recipient_type: "email" | "phone";
  recipient_value: string;
  created_at: string;
  expires_at: string;
  status: "pending" | "accepted";
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
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);
  const [resendingCode, setResendingCode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFriends(),
        loadPendingInvites(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const data = await api.getFriendsList(currentUsername);
      
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error: any) {
      console.error("Failed to load friends:", error.message);
    }
  };

  const loadPendingInvites = async () => {
    try {
      const response = await api.getPendingInvites(currentUserUuid);
      
      if (response.success) {
        // Transform the API response to match our PendingInvite interface
        const invites: PendingInvite[] = response.pending_invites.map((invite: any) => {
          // Get the first external recipient (email or phone)
          const externalRecipient = invite.recipients.find(
            (r: any) => r.type === 'email' || r.type === 'phone'
          );
          
          if (externalRecipient) {
            return {
              invite_code: invite.invite_code,
              recipient_type: externalRecipient.type as "email" | "phone",
              recipient_value: externalRecipient.value,
              created_at: invite.created_at,
              expires_at: invite.expires_at,
              status: invite.is_expired ? "expired" as any : "pending",
            };
          }
          return null;
        }).filter(Boolean);
        
        setPendingInvites(invites);
      }
    } catch (error: any) {
      console.error("Failed to load pending invites:", error.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadFriends(),
        loadPendingInvites(),
      ]);
    } catch (error: any) {
      console.error("Failed to refresh:", error.message);
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

  const handleResendInvite = async (inviteCode: string, recipientNumber: 1 | 2 = 2) => {
    setResendingCode(inviteCode);
    try {
      await api.resendInvite(inviteCode, recipientNumber);
      Alert.alert("Success", "Invitation resent!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to resend invitation");
    } finally {
      setResendingCode(null);
    }
  };

  const handleCancelInvite = async (inviteCode: string) => {
    Alert.alert(
      "Cancel Invitation",
      "Are you sure you want to cancel this invitation?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            // Remove from local state
            setPendingInvites(prev => 
              prev.filter(invite => invite.invite_code !== inviteCode)
            );
            // You might want to call an API to cancel the invite on the backend
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

  const isInviteExpired = (expiresAt: string): boolean => {
    try {
      return new Date(expiresAt) < new Date();
    } catch {
      return false;
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

  const renderPendingInvite = ({ item }: { item: PendingInvite }) => {
    const isResending = resendingCode === item.invite_code;
    const expired = isInviteExpired(item.expires_at);
    
    return (
      <View style={styles.inviteCard}>
        <View style={styles.inviteInfo}>
          <View style={styles.inviteIcon}>
            <Text style={styles.inviteIconText}>
              {item.recipient_type === "email" ? "📧" : "📱"}
            </Text>
          </View>
          <View style={styles.inviteDetails}>
            <Text style={styles.inviteRecipient}>{item.recipient_value}</Text>
            <Text style={styles.inviteType}>
              {item.recipient_type === "email" ? "Email Invitation" : "SMS Invitation"}
            </Text>
            <Text style={[styles.inviteStatus, expired && styles.inviteExpired]}>
              {expired ? "Expired" : `Expires ${formatDate(item.expires_at)}`}
            </Text>
          </View>
        </View>

        <View style={styles.inviteActions}>
          {!expired && (
            <TouchableOpacity
              style={[styles.resendButton, isResending && styles.buttonDisabled]}
              onPress={() => handleResendInvite(item.invite_code)}
              disabled={isResending}
            >
              {isResending ? (
                <ActivityIndicator color="#3b82f6" size="small" />
              ) : (
                <Text style={styles.resendButtonText}>Resend</Text>
              )}
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelInvite(item.invite_code)}
          >
            <Text style={styles.cancelButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.data.length}
      </Text>
    </View>
  );

  const sections = [
    ...(pendingInvites.length > 0 ? [{
      title: "Pending Invitations",
      data: pendingInvites,
      renderItem: renderPendingInvite,
    }] : []),
    {
      title: "Friends",
      data: friends,
      renderItem: renderFriend,
    },
  ];

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

      {/* Stats Card */}
      {!loading && (friends.length > 0 || pendingInvites.length > 0) && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{friends.length}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          {pendingInvites.length > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{pendingInvites.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Content */}
      <View style={styles.contentWrapper}>
        <View style={styles.contentCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : friends.length === 0 && pendingInvites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Start adding friends to see them here!
              </Text>
            </View>
          ) : (
            <SectionList
              sections={sections}
              renderItem={({ item, section }) => section.renderItem({ item })}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item, index) => 
                'invite_code' in item ? item.invite_code : item.uuid
              }
              contentContainerStyle={styles.sectionList}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              stickySectionHeadersEnabled={false}
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
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3b82f6",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
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
  sectionList: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginBottom: 8,
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
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  inviteInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  inviteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fbbf24",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  inviteIconText: {
    fontSize: 24,
  },
  inviteDetails: {
    flex: 1,
  },
  inviteRecipient: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  inviteType: {
    fontSize: 12,
    color: "#92400e",
    marginBottom: 2,
  },
  inviteStatus: {
    fontSize: 11,
    color: "#92400e",
  },
  inviteExpired: {
    color: "#ef4444",
    fontWeight: "600",
  },
  inviteActions: {
    flexDirection: "row",
    gap: 8,
  },
  resendButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
    minWidth: 70,
    alignItems: "center",
  },
  resendButtonText: {
    color: "#3b82f6",
    fontSize: 13,
    fontWeight: "600",
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelButtonText: {
    fontSize: 18,
    color: "#6b7280",
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
});