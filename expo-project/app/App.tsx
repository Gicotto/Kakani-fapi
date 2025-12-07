import React from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import { useAuth } from "./contexts/AuthContext";
import LoginView from "./components/LoginView";
import RegisterView from "./components/RegisterView";
import HomeView from "./components/HomeView";
import NewMessageView from "./components/NewMessageView";
import MessagesView from "./components/MessagesView";
import SendInvitesView from "./components/SendInvites.tsx";
import AccountSettingsView from "./components/AccountSettingsView.tsx";
import ChangePasswordView from "./components/ChangePasswordView.tsx";
import FriendsHub from "./components/FriendsHub.tsx";
import NotificationsView from "./components/NotificationsView.tsx"

export default function App() {
  const {
    authenticated,
    username,
    userUuid,
    currentView,
    activeConversation,
    isLoadingSession,
    login,
    navigateToHome,
    navigateToNewMessage,
    navigateToMessages,
    navigateToSendInvite,
    navigateToLogin,
    navigateToRegister,
    navigateToAccountSettings,
    navigateToChangePassword,
    navigateToFriendsHub,
    navigateToNotifications,
  } = useAuth();

  const handleLoginSuccess = (loggedInUsername: string, uuid?: string) => {
    login(loggedInUsername, uuid);
  };

  const handleRegisterSuccess = (registeredUsername: string, uuid?: string) => {
    login(registeredUsername, uuid);
  };

  const handleBackFromMessages = () => {
    navigateToHome();
  };

  // Show loading screen while checking for session
  if (isLoadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Render unauthenticated views (no header)
  if (!authenticated) {
    if (currentView === "register") {
      return (
        <RegisterView
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={navigateToLogin}
        />
      );
    }
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={navigateToRegister}
      />
    );
  }

  // Render authenticated views (header is in _layout.tsx)
  return (
    <View style={styles.authContainer}>
      {currentView === "home" && (
        <HomeView
          username={username}
          userUuid={userUuid || username}
          onNewMessage={navigateToNewMessage}
          onOpenConversation={navigateToMessages}
        />
      )}

      {currentView === "newMessage" && (
        <NewMessageView
          currentUsername={username}
          currentUserUuid={userUuid || username}
          onBack={navigateToHome}
          onOpenConversation={navigateToMessages}
        />
      )}

      {currentView === "messages" && activeConversation && (
        <MessagesView
          currentUsername={username}
          currentUserUuid={userUuid || username}
          recipientUsername={activeConversation.recipientUsername}
          recipientUuid={activeConversation.recipientUuid}
          onBack={handleBackFromMessages}
        />
      )}

      {currentView === "sendInvite" && (
        <SendInvitesView
          currentUsername={username}
          currentUserUuid={userUuid || username}
          onBack={navigateToHome}
          onSendInvite={navigateToSendInvite}
        />
      )}
      
      {currentView === "accountSettings" && (
        <AccountSettingsView
          currentUsername={username}
          currentUserUuid={userUuid || username}
          onBack={navigateToHome}
          onChangePassword={navigateToChangePassword}
        />
      )}

      {currentView === "changePassword" && (
        <ChangePasswordView
          currentUsername={username}
          currentUserUuid={userUuid || username}
          onBack={navigateToHome}
        />
      )}

      {currentView === "friendsHub" && (
        <FriendsHub
          currentUsername={username}
          currentUserUuid={userUuid || username}
          onBack={navigateToHome}
        />
      )}
      
      {currentView === "notifications" && (
        <NotificationsView
          currentUsername={username}
          currentUserUuid={userUuid || username}
          onBack={navigateToHome}
        />
      )}
  
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: "#f3f4fb",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f3f4fb",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
});
