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

interface FriendRequest {
  request_id: number;
  from_username?: string;
  to_username?: string;
  created_at: string;
}

interface FriendRequestsViewProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
  onRequestHandled?: () => void;
}

export default function FriendRequestsView({
  currentUsername,
  currentUserUuid,
  onBack,
  onRequestHandled,
}: FriendRequestsViewProps) {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingRequests(currentUsername);
      
      if (data.success) {
        setReceivedRequests(data.received || []);
        setSentRequests(data.sent || []);
      }
    } catch (error: any) {
      console.error("Failed to load requests:", error.message);
      Alert.alert("Error", "Failed to load friend requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: number, fromUsername: string) => {
    setProcessingId(requestId);
    try {
      const data = await api.respondToFriendRequest({
        request_id: requestId,
        username: currentUsername,
        action: "accept",
      });

      if (data.success) {
        Alert.alert(
          "Success",
          `You are now friends with ${fromUsername}!`,
          [
            {
              text: "OK",
              onPress: () => {
                setReceivedRequests(prev => 
                  prev.filter(req => req.request_id !== requestId)
                );
                onRequestHandled?.();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", data.error || "Failed to accept request");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: number, fromUsername: string) => {
    Alert.alert(
      "Reject Friend Request",
      `Are you sure you want to reject ${fromUsername}'s friend request?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setProcessingId(requestId);
            try {
              const data = await api.respondToFriendRequest({
                request_id: requestId,
                username: currentUsername,
                action: "reject",
              });

              if (data.success) {
                setReceivedRequests(prev => 
                  prev.filter(req => req.request_id !== requestId)
                );
                onRequestHandled?.();
              } else {
                Alert.alert("Error", data.error || "Failed to reject request");
              }
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to reject request");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
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

  const renderReceivedRequest = ({ item }: { item: FriendRequest }) => {
    const isProcessing = processingId === item.request_id;
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestInfo}>
          <View style={styles.requestAvatar}>
            <Text style={styles.requestAvatarText}>
              {item.from_username?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.requestDetails}>
            <Text style={styles.requestUsername}>{item.from_username}</Text>
            <Text style={styles.requestTime}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
        
        <View style={styles.requestActions}>
          <TouchableOpacity
            style={[styles.acceptButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleAccept(item.request_id, item.from_username!)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.acceptButtonText}>Accept</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleReject(item.request_id, item.from_username!)}
            disabled={isProcessing}
          >
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSentRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestInfo}>
        <View style={[styles.requestAvatar, styles.sentAvatar]}>
          <Text style={styles.requestAvatarText}>
            {item.to_username?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.requestDetails}>
          <Text style={styles.requestUsername}>{item.to_username}</Text>
          <Text style={styles.requestTime}>Sent {formatTime(item.created_at)}</Text>
        </View>
      </View>
      
      <View style={styles.pendingBadge}>
        <Text style={styles.pendingBadgeText}>Pending</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friend Requests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "received" && styles.tabActive]}
          onPress={() => setActiveTab("received")}
        >
          <Text style={[styles.tabText, activeTab === "received" && styles.tabTextActive]}>
            Received {receivedRequests.length > 0 && `(${receivedRequests.length})`}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "sent" && styles.tabActive]}
          onPress={() => setActiveTab("sent")}
        >
          <Text style={[styles.tabText, activeTab === "sent" && styles.tabTextActive]}>
            Sent {sentRequests.length > 0 && `(${sentRequests.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentWrapper}>
        <View style={styles.contentCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : activeTab === "received" ? (
            receivedRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📬</Text>
                <Text style={styles.emptyText}>No pending requests</Text>
                <Text style={styles.emptySubtext}>
                  You don't have any friend requests right now
                </Text>
              </View>
            ) : (
              <FlatList
                data={receivedRequests}
                renderItem={renderReceivedRequest}
                keyExtractor={(item) => item.request_id.toString()}
                contentContainerStyle={styles.requestsList}
                showsVerticalScrollIndicator={false}
              />
            )
          ) : (
            sentRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📤</Text>
                <Text style={styles.emptyText}>No sent requests</Text>
                <Text style={styles.emptySubtext}>
                  You haven't sent any friend requests
                </Text>
              </View>
            ) : (
              <FlatList
                data={sentRequests}
                renderItem={renderSentRequest}
                keyExtractor={(item) => item.request_id.toString()}
                contentContainerStyle={styles.requestsList}
                showsVerticalScrollIndicator={false}
              />
            )
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
  requestsList: {
    gap: 12,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
  },
  requestInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sentAvatar: {
    backgroundColor: "#6b7280",
  },
  requestAvatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  requestDetails: {
    flex: 1,
  },
  requestUsername: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
    color: "#6b7280",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#10b981",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
  },
  rejectButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectButtonText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "600",
  },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: "#92400e",
    fontSize: 12,
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
