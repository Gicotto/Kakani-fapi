import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@nudge_session';

type ViewType = "login" | "register" | "home" | "newMessage" | "messages" | "sendInvite" | "accountSettings" | "changePassword";

interface AuthContextType {
  // Auth state
  authenticated: boolean;
  username: string;
  userUuid: string;
  isLoadingSession: boolean;
  
  // Navigation state
  currentView: ViewType;
  activeConversation: {
    recipientUsername: string;
    recipientUuid: string;
  } | null;
  
  // Auth actions
  login: (username: string, uuid?: string) => void;
  logout: () => Promise<void>;
  
  // Navigation actions
  navigateToHome: () => void;
  navigateToNewMessage: () => void;
  navigateToMessages: (recipientUsername: string, recipientUuid: string) => void;
  navigateToSendInvite: () => void;
  navigateToLogin: () => void;
  navigateToRegister: () => void;
  navigateToAccountSettings: () => void;
  navigateToChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [userUuid, setUserUuid] = useState("");
  const [currentView, setCurrentView] = useState<ViewType>("login");
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [activeConversation, setActiveConversation] = useState<{
    recipientUsername: string;
    recipientUuid: string;
  } | null>(null);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, []);

  // Save session whenever it changes
  useEffect(() => {
    if (authenticated) {
      saveSession();
    }
  }, [authenticated, username, userUuid, currentView, activeConversation]);

  const loadSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem(SESSION_KEY);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        setUsername(session.username);
        setUserUuid(session.userUuid || session.username);
        setAuthenticated(true);
        setCurrentView(session.currentView || "home");
        setActiveConversation(session.activeConversation || null);
        console.log("Session restored:", session.username);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const saveSession = async () => {
    try {
      const sessionData = {
        username,
        userUuid,
        currentView,
        activeConversation,
        timestamp: new Date().toISOString(),
      };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      console.log("Session cleared");
    } catch (error) {
      console.error("Failed to clear session:", error);
    }
  };

  const login = (loginUsername: string, uuid?: string) => {
    setUsername(loginUsername);
    setUserUuid(uuid || loginUsername);
    setAuthenticated(true);
    setCurrentView("home");
  };

  const logout = async () => {
    await clearSession();
    setUsername("");
    setUserUuid("");
    setAuthenticated(false);
    setCurrentView("login");
    setActiveConversation(null);
    console.log("User logged out");
  };

  const navigateToHome = () => {
    setCurrentView("home");
    setActiveConversation(null);
  };

  const navigateToNewMessage = () => {
    setCurrentView("newMessage");
  };

  const navigateToSendInvite = () => {
    setCurrentView("sendInvite");
  };

  const navigateToMessages = (recipientUsername: string, recipientUuid: string) => {
    setActiveConversation({
      recipientUsername,
      recipientUuid,
    });
    setCurrentView("messages");
  };

  const navigateToLogin = () => {
    setCurrentView("login");
  };

  const navigateToRegister = () => {
    setCurrentView("register");
  };

  const navigateToAccountSettings = () => {
    setCurrentView("accountSettings");
  }; 

  const navigateToChangePassword = () => {
    setCurrentView("changePassword");
  };

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        username,
        userUuid,
        isLoadingSession,
        currentView,
        activeConversation,
        login,
        logout,
        navigateToHome,
        navigateToNewMessage,
        navigateToSendInvite,
        navigateToMessages,
        navigateToLogin,
        navigateToRegister,
        navigateToAccountSettings,
        navigateToChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
