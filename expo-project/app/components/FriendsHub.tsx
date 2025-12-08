import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import SearchFriendsView from "./SearchFriendsView";
import FriendRequestsView from "./FriendRequestsView";
import FriendsListView from "./FriendsListView";
import SendInvitesView from "./SendInvites";
import SentInvitesView from "./SentInvitesView";

interface FriendsHubProps {
  currentUsername: string;
  currentUserUuid: string;
  onBack: () => void;
  onOpenConversation?: (username: string, uuid: string) => void;
}

type ViewMode = "hub" | "search" | "requests" | "list" | "sendInvites" | "sentInvites";

export default function FriendsHub({
  currentUsername,
  currentUserUuid,
  onBack,
  onOpenConversation,
}: FriendsHubProps) {
  const [currentView, setCurrentView] = useState<ViewMode>("hub");

  // Navigate to different views
  const navigateToSearch = () => setCurrentView("search");
  const navigateToRequests = () => setCurrentView("requests");
  const navigateToList = () => setCurrentView("list");
  const navigateToSendInvites = () => setCurrentView("sendInvites");
  const navigateToSentInvites = () => setCurrentView("sentInvites");
  const navigateToHub = () => setCurrentView("hub");

  // Render the appropriate view based on current state
  if (currentView === "search") {
    return (
      <SearchFriendsView
        currentUsername={currentUsername}
        currentUserUuid={currentUserUuid}
        onBack={navigateToHub}
        onRequestSent={() => {
          // Optionally navigate to requests view after sending
        }}
      />
    );
  }

  if (currentView === "requests") {
    return (
      <FriendRequestsView
        currentUsername={currentUsername}
        currentUserUuid={currentUserUuid}
        onBack={navigateToHub}
        onRequestHandled={() => {
          // Optionally refresh or navigate
        }}
      />
    );
  }

  if (currentView === "list") {
    return (
      <FriendsListView
        currentUsername={currentUsername}
        currentUserUuid={currentUserUuid}
        onBack={navigateToHub}
        onOpenConversation={onOpenConversation}
        onFriendRemoved={() => {
          // Optionally refresh
        }}
      />
    );
  }

  if (currentView === "sendInvites") {
    return (
      <SendInvitesView
        currentUsername={currentUsername}
        currentUserUuid={currentUserUuid}
        onBack={navigateToHub}
        onSendInvite={() => {
          // Optionally navigate to sent invites
        }}
      />
    );
  }

  if (currentView === "sentInvites") {
    return (
      <SentInvitesView
        currentUsername={currentUsername}
        currentUserUuid={currentUserUuid}
        onBack={navigateToHub}
      />
    );
  }

  // Main hub view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
      </View>

      <View style={styles.contentWrapper}>
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Manage Your Friends</Text>
          <Text style={styles.welcomeSubtitle}>
            Find friends, manage requests, and connect people
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actionsContainer}>
          {/* Find Friends Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToSearch}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.iconCircleBlue]}>
              <Text style={styles.iconEmoji}>🔍</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Find Friends</Text>
              <Text style={styles.actionDescription}>
                Search for users and send friend requests
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Friend Requests Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToRequests}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.iconCircleGreen]}>
              <Text style={styles.iconEmoji}>📬</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Friend Requests</Text>
              <Text style={styles.actionDescription}>
                View and respond to pending requests
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* My Friends Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToList}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.iconCirclePurple]}>
              <Text style={styles.iconEmoji}>👥</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Friends</Text>
              <Text style={styles.actionDescription}>
                View and manage your friends list
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Send Nudge Duo Invite Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToSendInvites}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.iconCircleOrange]}>
              <Text style={styles.iconEmoji}>🤝</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Nudge Duo Invite</Text>
              <Text style={styles.actionDescription}>
                Connect two people with an invite
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Sent Invites Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={navigateToSentInvites}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, styles.iconCircleTeal]}>
              <Text style={styles.iconEmoji}>📨</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Sent Invites</Text>
              <Text style={styles.actionDescription}>
                Track your nudge duo invite status
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
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
  welcomeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconCircleBlue: {
    backgroundColor: "#dbeafe",
  },
  iconCircleGreen: {
    backgroundColor: "#d1fae5",
  },
  iconCirclePurple: {
    backgroundColor: "#e9d5ff",
  },
  iconCircleOrange: {
    backgroundColor: "#fed7aa",
  },
  iconCircleTeal: {
    backgroundColor: "#ccfbf1",
  },
  iconEmoji: {
    fontSize: 28,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  chevron: {
    fontSize: 28,
    color: "#cbd5e1",
    fontWeight: "300",
    marginLeft: 8,
  },
});