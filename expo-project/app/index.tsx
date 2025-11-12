import React, { useState } from "react";
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
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://127.0.0.1:8000";
  // return "http://10.1.64.76:8000";
};
const API_BASE_URL = getBaseUrl();

export default function Login() {
  const [username, setUsername]   = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

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
        // send creds in the BODY now (not the path)
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      // FastAPI will return non-2xx with a JSON {detail: "..."} by default
      const maybeJson = await res
        .json()
        .catch(() => ({})); // handle empty/invalid JSON bodies safely

      if (!res.ok) {
        // Examples: 400 missing creds, 401 invalid, 409 duplicate, etc.
        const msg =
          maybeJson?.detail ||
          maybeJson?.message ||
          `Login failed (${res.status})`;
        setError(msg);
        return;
      }

      // Success shape: adapt to your API (e.g., { message, success, access_token, user })
      const data = maybeJson;
      // TODO: save token/user, then navigate
      // await AsyncStorage.setItem("token", data.access_token);
      // navigation.replace("Home");
      Alert.alert("Login success", data?.message ?? "Welcome!");
    } catch (e) {
      setError(
        e?.name === "AbortError"
          ? "Login timed out. Check your connection."
          : "Unable to reach server. Is it running on port 8000?"
      );
    } finally {
      setLoading(false);
    }
  };

  const onForgot = () => Alert.alert("Forgot Password", "Hook this up to your reset flow.");
  const onRegister = () => Alert.alert("Register", "Hook this up to your sign-up screen.");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#ccc"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#ccc"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.loginButton, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.loginText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.linkContainer}>
        <TouchableOpacity onPress={onForgot} disabled={loading}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRegister} disabled={loading}>
          <Text style={styles.linkText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#25292e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 30,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    backgroundColor: "#333",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#4e9bde",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
  },
  linkText: {
    color: "#4e9bde",
    fontSize: 14,
  },
  errorText: {
    color: "#ff6b6b",
    marginBottom: 6,
    alignSelf: "flex-start",
  },
});
