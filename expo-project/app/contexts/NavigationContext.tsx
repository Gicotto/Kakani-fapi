import React, { createContext, useContext, useState, ReactNode } from 'react';

type ViewType = "login" | "register" | "home" | "newMessage" | "messages";

interface NavigationContextType {
  currentView: ViewType;
  authenticated: boolean;
  username: string;
  setCurrentView: (view: ViewType) => void;
  setAuthenticated: (auth: boolean) => void;
  setUsername: (name: string) => void;
  logout: () => void;
  navigateHome: () => void;
  navigateNewMessage: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>("login");
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  const logout = () => {
    setAuthenticated(false);
    setUsername("");
    setCurrentView("login");
  };

  const navigateHome = () => {
    setCurrentView("home");
  };

  const navigateNewMessage = () => {
    setCurrentView("newMessage");
  };

  return (
    <NavigationContext.Provider
      value={{
        currentView,
        authenticated,
        username,
        setCurrentView,
        setAuthenticated,
        setUsername,
        logout,
        navigateHome,
        navigateNewMessage,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
