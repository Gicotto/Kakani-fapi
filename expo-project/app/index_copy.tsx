import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";

// ---- Backend base URL helper ----
// iOS Simulator can use localhost; Android Emulator needs 10.0.2.2.
// When testing on a real device, replace with your machine's LAN IP, e.g. http://192.168.1.42:8000
const getBaseUrl = () => {
  return "http://127.0.0.1:8000";
  // return "http://10.1.64.76:8000";
};
const API_BASE_URL = getBaseUrl();

export default function Login() {

  // logged in user attempt
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // create user
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // set active users
  const [activeUsersInfo, setActiveUsersInfo] = useState("");

  const [trueUsername, setTrueUsername] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthentication] = useState(false);
  const [view, setView] = useState("login"); // "login" or "register"

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000); // optional timeout

      const res = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const maybeJson = await res.json().catch(() => ({})); // handle empty/invalid JSON bodies safely

      if (!res.ok) {
        const msg =
          maybeJson?.detail ||
          maybeJson?.message ||
          `Login failed (${res.status})`;
        setError(msg);
        return;
      }

      const data = maybeJson;
      setAuthentication(true);
      setTrueUsername(username); // placeholder; swap to API user later

      // TODO: save token/user, then navigate
      // await AsyncStorage.setItem("token", data.access_token);
      // navigation.replace("Home");
      Alert.alert("Login success", data?.message ?? "Welcome!");
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "Login timed out. Check your connection."
          : "Unable to reach server. Is it running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async () => {
    setError("");
    if (!newUsername || !newPassword) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try { 
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_BASE_URL}/users/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, email: newEmail }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const maybeJson = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          maybeJson?.detail ||
          maybeJson?.message ||
          `Account creation failed (${res.status})`;
        setError(msg);
        return;
      }

      const data = maybeJson;
      setAuthentication(true);
      setTrueUsername(newUsername);

      Alert.alert("Account Created", data?.message ?? "Welcome!");
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "Create Account timed out. Check your connection."
          : "Unable to reach server. Is it running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setUsername("");
    setTrueUsername("");
    setAuthentication(false);
    console.log("User logged out");
  };

  const handleNewMessage = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
  
    const res = await fetch(`${API_BASE_URL}/getactiveusers/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  
    clearTimeout(timer);
  
    const maybeJson = await res.json().catch(() => ({}));
    const data = maybeJson;
  
    if (!res.ok || !data.success) {
      const msg =
        data?.detail ||
        data?.message ||
        `Unable to retrieve users (${res.status})`;
      setError(msg);
      return;
    }
  
    // data.active_users is an array of { username, uuid }
    setActiveUsersInfo(data.active_users);
    console.log("Grabbed latest users");
  };

  const sendNewMessage = async () => {
    // Send from user to user
  };

  const onForgot = () =>
    Alert.alert("Forgot Password", "Hook this up to your reset flow.");
  
  const onRegister = () => {
    setView("register");
    setError("");
  };

  const onBackToLogin = () => {
    setView("login");
    setError("");
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = "Nudge";
    }
  }, []);

  const displayName = trueUsername || username || "Friend";

  return authenticated ? (
    <View style={styles.authContainer}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.homeButton}>
          <Text style={styles.homeButtonText}>Home</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setAccountMenuOpen((prev) => !prev)}
        >
          <Text style={styles.profileIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Account dropdown rendered at root so it sits on top of everything */}
      {accountMenuOpen && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={styles.dropdownText}>Account Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={styles.dropdownText}>App Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}>
            <Text style={styles.dropdownText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem}
          onPress={handleLogout}
          >
            <Text>Log Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome, {displayName}</Text>
        <Text style={styles.subText}>What would you like to do today?</Text>

        <View style={styles.cardsRow}>

          <TouchableOpacity style={styles.card}
            onPress={handleNewMessage}
          >
            <Text style={styles.cardTitle}>New Message</Text>
            <Text style={styles.cardBody}>
              Send a new message to a user.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardTitle}>Find New Conversation</Text>
            <Text style={styles.cardBody}>
              Start a new chat with someone new and explore fresh topics.
            </Text>
          </TouchableOpacity>

        </View>
      </View>
      <View style={styles.content}>          
        <View style={styles.cardsRow}>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardTitle}>View Messages</Text>
            <Text style={styles.cardBody}>
              Browse your recent conversations and replies.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : view === "register" ? (
    // REGISTER VIEW
    <View style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>Create Account</Text>
        <Text style={styles.loginSubtitle}>Sign up to get started</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          value={newUsername}
          onChangeText={setNewUsername}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          value={newEmail}
          onChangeText={setNewEmail}
          editable={!loading}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.6 }]}
          onPress={createAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.loginButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginLinks}>
          <TouchableOpacity onPress={onBackToLogin} disabled={loading}>
            <Text style={styles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : (
    // LOGIN VIEW
    <View style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>Welcome Back</Text>
        <Text style={styles.loginSubtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.loginButton, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginLinks}>
          <TouchableOpacity onPress={onForgot} disabled={loading}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onRegister} disabled={loading}>
            <Text style={styles.linkText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // OUTER LOGIN WRAPPER
  container: {
    flex: 1,
    backgroundColor: "#f3f4fb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  // LOGIN CARD
  loginContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  loginTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#0f172a",
    marginBottom: 4,
  },

  loginSubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748b",
    marginBottom: 22,
  },

  input: {
    backgroundColor: "#f9fafb",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 12,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  loginButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 4,
    alignItems: "center",
  },

  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },

  errorText: {
    marginBottom: 8,
    color: "#ef4444",
    textAlign: "center",
    fontSize: 13,
  },

  loginLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  linkText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "500",
  },

  // AUTH VIEW
  authContainer: {
    flex: 1,
    backgroundColor: "#f3f4fb", // soft light background
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  homeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#e0f2fe", // soft blue pill
  },
  homeButtonText: {
    fontWeight: "600",
    color: "#0f172a",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    fontSize: 14,
    color: "#0f172a",
  },
  profileButton: {
    borderRadius: 999,
    overflow: "hidden",
  },
  profileIcon: {
    fontSize: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e0e7ff",
    color: "#1f2937",
    textAlign: "center",
  },

  // Dropdown rendered at root of authContainer
  dropdownMenu: {
    position: "absolute",
    top: 40 + 40, // top padding + approx topBar height
    right: 16,
    width: 190,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 10000,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontSize: 14,
    color: "#111827",
  },

  content: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    color: "#6b7280",
  },
});
