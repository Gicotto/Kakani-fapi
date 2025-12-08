import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { api } from "../utils/api";

interface RegisterViewProps {
  onRegisterSuccess: (username: string, uuid: string) => void;
  onSwitchToLogin: () => void;
}

type CountryOption = {
  code: string;
  name: string;
  flag: string;
  callingCode: string;
};

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "US", name: "United States", flag: "🇺🇸", callingCode: "1" },
  { code: "CA", name: "Canada", flag: "🇨🇦", callingCode: "1" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", callingCode: "44" },
  // add more as needed
];

// Helper: format US phone as (xxx) xxx - xxxx
const formatUSPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const len = digits.length;

  if (len === 0) return "";
  if (len < 4) return `(${digits}`;
  if (len < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} - ${digits.slice(6)}`;
};

export default function RegisterView({
  onRegisterSuccess,
  onSwitchToLogin,
}: RegisterViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(
    COUNTRY_OPTIONS[0] // default US
  );
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const [phoneRaw, setPhoneRaw] = useState(""); // digits only
  const [phoneFormatted, setPhoneFormatted] = useState(""); // pretty display

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePhoneChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 15); // allow extra for intl
    setPhoneRaw(digits);

    if (selectedCountry.code === "US") {
      setPhoneFormatted(formatUSPhone(digits));
    } else {
      setPhoneFormatted(digits);
    }
  };

  const handleSelectCountry = (country: CountryOption) => {
    setSelectedCountry(country);
    setCountryModalVisible(false);

    // Re-format if switching back to US
    if (country.code === "US") {
      setPhoneFormatted(formatUSPhone(phoneRaw));
    } else {
      setPhoneFormatted(phoneRaw);
    }
  };

  const createAccount = async () => {
    setError("");
    if (!username || !password || !phoneRaw) {
      setError("Please enter username, password, and phone number.");
      return;
    }

    const phoneForApi = `+${selectedCountry.callingCode}${phoneRaw}`;

    setLoading(true);
    try {
      const data = await api.createAccount({
        username,
        password,
        email,
        phone: phoneForApi,
      });
      Alert.alert("Account Created", data?.message ?? "Welcome!");
      onRegisterSuccess(username, data.uuid);
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
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        {/* Phone row: custom country picker + phone input */}
        <View style={styles.phoneRow}>
          <TouchableOpacity
            style={styles.countryPickerWrapper}
            onPress={() => setCountryModalVisible(true)}
            disabled={loading}
          >
            <Text style={styles.flagText}>{selectedCountry.flag}</Text>
            <Text style={styles.callingCodeText}>
              +{selectedCountry.callingCode}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, styles.phoneInput]}
            placeholder={
              selectedCountry.code === "US"
                ? "(555) 555 - 5555"
                : "Phone number"
            }
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            autoCapitalize="none"
            value={phoneFormatted}
            onChangeText={handlePhoneChange}
            editable={!loading}
            maxLength={selectedCountry.code === "US" ? 18 : 20}
          />
        </View>

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

      {/* Country Picker Modal */}
      <Modal
        visible={countryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <FlatList
              data={COUNTRY_OPTIONS}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text style={styles.countryItemText}>
                    {item.flag}  {item.name} (+{item.callingCode})
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setCountryModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  countryPickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    marginRight: 8,
  },
  flagText: {
    fontSize: 18,
    marginRight: 6,
  },
  callingCodeText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "500",
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#0f172a",
  },
  countryItem: {
    paddingVertical: 10,
  },
  countryItemText: {
    fontSize: 15,
    color: "#0f172a",
  },
  modalCloseButton: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  modalCloseText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "500",
  },
});
