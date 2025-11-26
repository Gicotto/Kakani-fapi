import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../utils/api";

interface RegisterViewProps {
  onRegisterSuccess: (username: string) => void;
  onSwitchToLogin: () => void;
}

export default function RegisterView({
  onRegisterSuccess,
  onSwitchToLogin,
}: RegisterViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createAccount = async () => {
    setError("");
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.createAccount({ username, password, email });
      Alert.alert("Account Created", data?.message ?? "Welcome!");
      onRegisterSuccess(username);
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "Create Account timed out. Check your connection."
          : e.message || "Unable to reach server. Is it running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>Create Account</Text>
        <Text style={styles.loginSubtitle}>Sign up to get started</Text>

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

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
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
          <TouchableOpacity onPress={onSwitchToLogin} disabled={loading}>
            <Text style={styles.linkText}>Back to Login</Text>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
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
});
