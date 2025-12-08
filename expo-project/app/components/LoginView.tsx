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

interface LoginViewProps {
  onLoginSuccess: (username: string, uuid: string) => void;
  onSwitchToRegister: () => void;
}

export default function LoginView({
  onLoginSuccess,
  onSwitchToRegister,
}: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await api.login({ username, password });
      
      // Debug: Check if UUID is in the response
      console.log('Login response:', data);
      console.log('UUID from backend:', data.user_id);
      
      if (!data.user_id) {
        throw new Error('Backend did not return UUID');
      }
      
      Alert.alert("Login success", data?.message ?? "Welcome!");
      onLoginSuccess(username, data.user_id);  // ← Pass BOTH username and uuid!
      
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "Login timed out. Check your connection."
          : e.message || "Unable to reach server. Is it running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  };

  const onForgot = () =>
    Alert.alert("Forgot Password", "Hook this up to your reset flow.");

  return (
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

          <TouchableOpacity onPress={onSwitchToRegister} disabled={loading}>
            <Text style={styles.linkText}>Create Account</Text>
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
