import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

interface TopBarProps {
  onMenuPress: () => void;
  onHomePress?: () => void;
  showHome?: boolean;
}

export default function TopBar({ onMenuPress, onHomePress, showHome = true }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      {showHome && (
        <TouchableOpacity style={styles.homeButton} onPress={onHomePress}>
          <Text style={styles.homeButtonText}>Home</Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Search conversations..."
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity style={styles.profileButton} onPress={onMenuPress}>
        <Text style={styles.profileIcon}>⋮</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#e0f2fe",
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
});
