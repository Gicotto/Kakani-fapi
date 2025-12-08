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

interface SentInvite {
  invite_code: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  recipients: Array<{
    recipient_number: number;
    type: "email" | "phone" | "username";
    value: string;
    accepted: boolean;
  }>;
  thread_created: boolean;
  thread_id: number | null;
}

interface SentInvitesViewProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
}

export default function SentInvitesView({
  currentUsername,
  currentUserUuid,
  onBack,
}: SentInvitesViewProps) {
  const [invites, setInvites] = useState<SentInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingCode, setResendingCode] = useState<string | null>(null);
  const [resendingRecipient, setResendingRecipient] = useState<number | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const response = await api.getPendingInvites(currentUserUuid);
      
      if (response.success) {
        setInvites(response.pending_invites || []);
      }
    } catch (error: any) {
      console.error("Failed to load sent invites:", error.message);
      Alert.alert("Error", "Failed to load sent invites");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadInvites();
    } finally {
      setRefreshing(false);
    }
  };

  const handleResendInvite = async (inviteCode: string, recipientNumber: number) => {
    setResendingCode(inviteCode);
    setResendingRecipient(recipientNumber);
    try {
      await api.resendInvite(inviteCode, recipientNumber as 1 | 2);
      Alert.alert("Success", "Invitation resent!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to resend invitation");
    } finally {
      setResendingCode(null);
      setResendingRecipient(null);
    }
  };

  const handleCheckStatus = async (inviteCode: string) => {
    try {
      const response = await api.checkInviteStatus(inviteCode);
      
      const statusText = `
Invite Code: ${response.code}
Recipient 1: ${response.recipient1_accepted ? "✓ Accepted" : "⏳ Pending"}
Recipient 2: ${response.recipient2_accepted ? "✓ Accepted" : "⏳ Pending"}
Thread: ${response.thread_created ? `✓ Created (ID: ${response.thread_id})` : "⏳ Not yet created"}
Expires: ${new Date(response.expires_at).toLocaleString()}
      `.trim();
      
      Alert.alert("Invite Status", statusText);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to check status");
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString([], { 
        month: "short", 
        day: "numeric", 
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Unknown";
    }
  };

  const getRecipientIcon = (type: string) => {
    if (type === "email") return "📧";
    if (type === "phone") return "📱";
    return "👤";
  };

  const getStatusBadge = (invite: SentInvite) => {
    if (invite.thread_created) {
      return {
        text: "✓ Connected",
        style: styles.statusConnected,
      };
    }
    if (invite.is_expired) {
      return {
        text: "⏰ Expired",
        style: styles.statusExpired,
      };
    }
    const acceptedCount = invite.recipients.filter(r => r.accepted).length;
    if (acceptedCount === 2) {
      return {
        text: "✓ Both Accepted",
        style: styles.statusAccepted,
      };
    }
    if (acceptedCount === 1) {
      return {
        text: "⏳ 1 Accepted",
        style: styles.statusPartial,
      };
    }
    return {
      text: "⏳ Pending",
      style: styles.statusPending,
    };
  };

  const renderInvite = ({ item }: { item: SentInvite }) => {
    const statusBadge = getStatusBadge(item);
    const isResending = resendingCode === item.invite_code;

    return (
      <View style={styles.inviteCard}>
        <View style={styles.inviteHeader}>
          <View>
            <Text style={styles.inviteCode}>Code: {item.invite_code}</Text>
            <Text style={styles.inviteDate}>
              Created {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={statusBadge.style}>
            <Text style={styles.statusText}>{statusBadge.text}</Text>
          </View>
        </View>

        {/* Recipients */}
        <View style={styles.recipientsContainer}>
          {item.recipients.map((recipient, index) => (
            <View key={index} style={styles.recipientRow}>
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientIcon}>
                  {getRecipientIcon(recipient.type)}
                </Text>
                <View style={styles.recipientDetails}>
                  <Text style={styles.recipientValue}>
                    {recipient.value}
                  </Text>
                  <Text style={styles.recipientType}>
                    {recipient.type === "email" ? "Email" : 
                     recipient.type === "phone" ? "Phone" : "Username"}
                    {recipient.accepted && " • ✓ Accepted"}
                  </Text>
                </View>
              </View>
              
              {!recipient.accepted && !item.is_expired && !item.thread_created && (
                <TouchableOpacity
                  style={[
                    styles.resendButton,
                    isResending && resendingRecipient === recipient.recipient_number && styles.resendButtonDisabled
                  ]}
                  onPress={() => handleResendInvite(item.invite_code, recipient.recipient_number)}
                  disabled={isResending && resendingRecipient === recipient.recipient_number}
                >
                  {isResending && resendingRecipient === recipient.recipient_number ? (
                    <ActivityIndicator color="#3b82f6" size="small" />
                  ) : (
                    <Text style={styles.resendButtonText}>Resend</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Expiration */}
        <Text style={[
          styles.expirationText,
          item.is_expired && styles.expirationTextExpired
        ]}>
          {item.is_expired 
            ? `Expired ${formatDate(item.expires_at)}`
            : `Expires ${formatDate(item.expires_at)}`}
        </Text>

        {/* Check Status Button */}
        <TouchableOpacity
          style={styles.checkStatusButton}
          onPress={() => handleCheckStatus(item.invite_code)}
        >
          <Text style={styles.checkStatusButtonText}>Check Full Status</Text>
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
        <Text style={styles.title}>Sent Invites</Text>
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
      {!loading && invites.length > 0 && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{invites.length}</Text>
            <Text style={styles.statLabel}>Total Invites</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {invites.filter(i => i.thread_created).length}
            </Text>
            <Text style={styles.statLabel}>Connected</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {invites.filter(i => !i.thread_created && !i.is_expired).length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      )}

      {/* Content */}
      <View style={styles.contentWrapper}>
        <View style={styles.contentCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading invites...</Text>
            </View>
          ) : invites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📨</Text>
              <Text style={styles.emptyText}>No invites sent yet</Text>
              <Text style={styles.emptySubtext}>
                Create an invite to connect two people
              </Text>
            </View>
          ) : (
            <FlatList
              data={invites}
              renderItem={renderInvite}
              keyExtractor={(item) => item.invite_code}
              contentContainerStyle={styles.invitesList}
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
  invitesList: {
    gap: 12,
  },
  inviteCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inviteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  inviteCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  inviteDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusConnected: {
    backgroundColor: "#d1fae5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#10b981",
  },
  statusExpired: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  statusAccepted: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  statusPartial: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  statusPending: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9ca3af",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
  },
  recipientsContainer: {
    gap: 12,
    marginBottom: 12,
  },
  recipientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recipientInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recipientIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  recipientDetails: {
    flex: 1,
  },
  recipientValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  recipientType: {
    fontSize: 12,
    color: "#6b7280",
  },
  resendButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
    minWidth: 70,
    alignItems: "center",
  },
  resendButtonDisabled: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: "#3b82f6",
    fontSize: 12,
    fontWeight: "600",
  },
  expirationText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
  },
  expirationTextExpired: {
    color: "#ef4444",
    fontWeight: "600",
  },
  checkStatusButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  checkStatusButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
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