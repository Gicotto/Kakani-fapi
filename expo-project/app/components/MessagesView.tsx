import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { api } from "../utils/api";

interface Message {
  id: number;
  thread_id: number;
  sender_uuid: string;
  sender_username: string;
  body: string;
  message_index: number;
  created_at: string;
}

interface MessagesViewProps {
  currentUsername: string;
  currentUserUuid: string;
  recipientUsername: string;
  recipientUuid: string;
  threadId?: number;
  onBack: () => void;
}

export default function MessagesView({
  currentUsername,
  currentUserUuid,
  recipientUsername,
  recipientUuid,
  threadId: propThreadId,
  onBack,
}: MessagesViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<number | undefined>(propThreadId);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    // Optional: Set up polling to refresh messages every few seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [threadId, recipientUsername]);

  const loadMessages = async () => {
    if (!recipientUsername) return;

    setLoading(true);
    try {
      // Pass currentUserUuid to filter deleted messages
      const messagesData = await api.getMessages(currentUsername, recipientUsername, currentUserUuid);
      setMessages(messagesData);

      // Extract threadId from first message if not already set
      if (messagesData.length > 0 && !threadId) {
        const extractedThreadId = messagesData[0].thread_id;
        console.log("Extracted threadId from messages:", extractedThreadId);
        setThreadId(extractedThreadId);
      }

      // Scroll to bottom when messages load
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("Failed to load messages:", error.message);
      // Don't show alert on every refresh, just log it
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }

    const messageToSend = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    setSending(true);
    try {
      await api.sendMessage(currentUsername, recipientUsername, messageToSend);

      // Reload messages to show the new one
      await loadMessages();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to send message");
      setNewMessage(messageToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    console.log("handleDeleteMessage called with messageId:", messageId);
    console.log("currentUserUuid:", currentUserUuid);

    // Web-compatible confirmation
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to delete this message? It will only be removed for you.");
      if (!confirmed) {
        console.log("Delete cancelled");
        return;
      }

      console.log("Delete confirmed, calling API...");
      try {
        await api.deleteMessage(messageId, currentUserUuid);
        console.log("Message deleted successfully");
        // Remove message from local state immediately
        setMessages(messages.filter(msg => msg.id !== messageId));
        window.alert("Message deleted");
      } catch (error: any) {
        console.error("Delete error:", error);
        window.alert(error.message || "Failed to delete message");
      }
    } else {
      // Native Alert for iOS/Android
      Alert.alert(
        "Delete Message",
        "Are you sure you want to delete this message? It will only be removed for you.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => console.log("Delete cancelled"),
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              console.log("Delete confirmed, calling API...");
              try {
                await api.deleteMessage(messageId, currentUserUuid);
                console.log("Message deleted successfully");
                // Remove message from local state immediately
                setMessages(messages.filter(msg => msg.id !== messageId));
                Alert.alert("Success", "Message deleted");
              } catch (error: any) {
                console.error("Delete error:", error);
                Alert.alert("Error", error.message || "Failed to delete message");
              }
            },
          },
        ]
      );
    }
  };

  const handleHideThread = async () => {
    console.log("handleHideThread called");
    console.log("threadId:", threadId);
    console.log("currentUserUuid:", currentUserUuid);

    // Web-compatible confirmation
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to hide this conversation with ${recipientUsername}? You can start a new conversation later.`);
      if (!confirmed) {
        console.log("Hide cancelled");
        return;
      }

      console.log("Hide confirmed, calling API...");
      try {
        if (threadId) {
          console.log("Calling hideThread API with threadId:", threadId, "userUuid:", currentUserUuid);
          await api.hideThread(threadId, currentUserUuid);
          console.log("Thread hidden successfully");
          window.alert("Conversation hidden");
          onBack();
        } else {
          console.error("No threadId available");
          window.alert("Thread ID not found");
        }
      } catch (error: any) {
        console.error("Hide thread error:", error);
        window.alert(error.message || "Failed to hide conversation");
      }
    } else {
      // Native Alert for iOS/Android
      Alert.alert(
        "Hide Conversation",
        `Are you sure you want to hide this conversation with ${recipientUsername}? You can start a new conversation later.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => console.log("Hide cancelled"),
          },
          {
            text: "Hide",
            style: "destructive",
            onPress: async () => {
              console.log("Hide confirmed, calling API...");
              try {
                if (threadId) {
                  console.log("Calling hideThread API with threadId:", threadId, "userUuid:", currentUserUuid);
                  await api.hideThread(threadId, currentUserUuid);
                  console.log("Thread hidden successfully");
                  Alert.alert("Success", "Conversation hidden", [
                    {
                      text: "OK",
                      onPress: onBack,
                    },
                  ]);
                } else {
                  console.error("No threadId available");
                  Alert.alert("Error", "Thread ID not found");
                }
              } catch (error: any) {
                console.error("Hide thread error:", error);
                Alert.alert("Error", error.message || "Failed to hide conversation");
              }
            },
          },
        ]
      );
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.sender_username === currentUsername;

    return (
      <TouchableOpacity
        onLongPress={() => {
          console.log("Long press triggered for message:", item.id);
          handleDeleteMessage(item.id);
        }}
        onPress={() => {
          // Empty onPress to prevent default behavior but allow long press
          console.log("Short press on message:", item.id);
        }}
        delayLongPress={500}
        activeOpacity={0.7}
        style={[
          styles.messageBubble,
          isCurrentUser ? styles.messageBubbleSent : styles.messageBubbleReceived,
        ]}
      >
        {!isCurrentUser && (
          <Text style={styles.senderName}>{item.sender_username}</Text>
        )}
        <Text
          style={[
            styles.messageText,
            isCurrentUser ? styles.messageTextSent : styles.messageTextReceived,
          ]}
        >
          {item.body}
        </Text>
        <Text
          style={[
            styles.messageTime,
            isCurrentUser ? styles.messageTimeSent : styles.messageTimeReceived,
          ]}
        >
          {formatTime(item.created_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        // Show time if today
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffInHours < 168) {
        // Show day of week if within a week
        return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
      } else {
        // Show full date if older
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      return '';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Messages List - Full screen */}
      <View style={styles.messagesContainer}>
        {/* Floating header info */}
        <View style={styles.floatingHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {recipientUsername.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName}>{recipientUsername}</Text>
            <Text style={styles.recipientStatus}>Active</Text>
          </View>
        </View>

        {/* Floating back button */}
        <TouchableOpacity onPress={onBack} style={styles.floatingBackButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        {/* Floating menu button (hide thread) */}
        <TouchableOpacity
          onPress={() => {
            console.log("Menu button pressed, threadId:", threadId);
            handleHideThread();
          }}
          style={styles.floatingMenuButton}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>

        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start the conversation with {recipientUsername}!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4fb",
  },
  messagesContainer: {
    flex: 1,
  },
  floatingHeader: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    paddingHorizontal: 80,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  recipientInfo: {
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  recipientStatus: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "500",
    textAlign: "center",
  },
  floatingBackButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  backArrow: {
    fontSize: 24,
    color: "#3b82f6",
    fontWeight: "600",
  },
  floatingMenuButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  menuIcon: {
    fontSize: 24,
    color: "#3b82f6",
    fontWeight: "700",
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 16,
  },
  messageBubble: {
    maxWidth: "75%",
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleSent: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  messageBubbleReceived: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextSent: {
    color: "#ffffff",
  },
  messageTextReceived: {
    color: "#0f172a",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeSent: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "right",
  },
  messageTimeReceived: {
    color: "#94a3b8",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  input: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    fontSize: 15,
    color: "#0f172a",
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "600",
  },
});
