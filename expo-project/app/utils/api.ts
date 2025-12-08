import { LoginCredentials, RegisterCredentials } from "../types";

// ---- Backend base URL helper ----
const getBaseUrl = () => {
  return "http://127.0.0.1:8000";
  // return "http://10.1.64.76:8000"; // Uncomment for device testing
};

export const API_BASE_URL = getBaseUrl();

const createFetchWithTimeout = (timeoutMs: number = 15000) => {
  return async (url: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  };
};

export const api = {
  login: async (credentials: LoginCredentials) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Login failed (${res.status})`
      );
    }

    return data;
  },

  createAccount: async (credentials: RegisterCredentials) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/users/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          `Account creation failed (${res.status})`
      );
    }

    return data;
  },

  getActiveUsers: async () => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/users/active/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.success) {
      throw new Error(
        data?.detail ||
          data?.message ||
          `Unable to retrieve users (${res.status})`
      );
    }

    return data.active_users;
  },

  sendMessage: async (fromUser: string, toUser: string, message: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ fromUser, toUser, message }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to send message (${res.status})`
      );
    }

    return data;
  },

  sendInvite: async (fromUser: string, toUser1: string, toUser2: string, invite: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/invites/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ fromUser, toUser1, toUser2, invite }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to send invite (${res.status})`
      );
    }

    return data;
  },

  // ============================================
  // NEW MULTI-CHANNEL INVITE METHODS
  // ============================================

  /**
   * Create invite with multi-channel support (username/email/phone)
   * @param createdBy - Username of the user creating the invite
   * @param inviteData - Invite data with recipient information
   */
  createInvite: async (
    createdBy: string,
    inviteData: {
      recipient1_username: string | null;
      recipient1_email: string | null;
      recipient1_phone: string | null;
      recipient2_username: string | null;
      recipient2_email: string | null;
      recipient2_phone: string | null;
      expires_in_hours?: number;
    }
  ) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/invites/create?created_by=${createdBy}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(inviteData),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to create invite (${res.status})`
      );
    }

    return data;
  },

  /**
   * Accept an invite
   * @param userUuid - UUID of the user accepting the invite
   * @param inviteCode - The invite code
   * @param recipientNumber - Which recipient slot (1 or 2)
   */
  acceptInvite: async (
    userUuid: string,
    inviteCode: string,
    recipientNumber: 1 | 2
  ) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/invites/accept?user_uuid=${userUuid}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          code: inviteCode,
          recipient_number: recipientNumber,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to accept invite (${res.status})`
      );
    }

    return data;
  },

  /**
   * Check the status of an invite
   * @param inviteCode - The invite code to check
   */
  checkInviteStatus: async (inviteCode: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/invites/check/${inviteCode}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to check invite status (${res.status})`
      );
    }

    return data;
  },

  /**
   * Resend invite notification to a recipient
   * @param inviteCode - The invite code
   * @param recipientNumber - Which recipient to resend to (1 or 2)
   */
  resendInvite: async (inviteCode: string, recipientNumber: 1 | 2) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/invites/resend/${inviteCode}?recipient_number=${recipientNumber}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to resend invite (${res.status})`
      );
    }

    return data;
  },

  /**
   * Get all pending external invites for a user
   * @param userUuid - UUID of the user
   */
  getPendingInvites: async (userUuid: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/invites/pending/${userUuid}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to get pending invites (${res.status})`
      );
    }

    return data;
  },

  // ============================================
  // END NEW INVITE METHODS
  // ============================================

  getMessages: async (currentUser: string, otherUser: string, requestingUserUuid?: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    let url = `${API_BASE_URL}/messages/thread?user1=${encodeURIComponent(currentUser)}&user2=${encodeURIComponent(otherUser)}`;

    // Add requesting_user_uuid for filtering deleted messages
    if (requestingUserUuid) {
      url += `&requesting_user_uuid=${encodeURIComponent(requestingUserUuid)}`;
    }

    const res = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to get messages (${res.status})`
      );
    }

    // Return empty array if no messages or if request failed
    if (!data.success) {
      console.error("Get messages failed:", data.error);
      return [];
    }

    return data.messages || [];
  },

  getThreads: async (username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/messages/threads?username=${encodeURIComponent(username)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to get threads (${res.status})`
      );
    }

    if (!data.success) {
      console.error("Get threads failed:", data.error);
      return [];
    }

    return data.threads || [];
  },

  /**
   * Delete a message for the current user (soft delete)
   * @param messageId - ID of the message to delete
   * @param userUuid - UUID of the user deleting the message
   */
  deleteMessage: async (messageId: number, userUuid: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/messages/message/${messageId}?user_uuid=${encodeURIComponent(userUuid)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to delete message (${res.status})`
      );
    }

    return data;
  },

  /**
   * Hide a thread for the current user
   * @param threadId - ID of the thread to hide
   * @param userUuid - UUID of the user hiding the thread
   */
  hideThread: async (threadId: number, userUuid: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/messages/thread/${threadId}?user_uuid=${encodeURIComponent(userUuid)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.detail || data?.message || `Failed to hide thread (${res.status})`
      );
    }

    return data;
  },

  getUserDetails: async (username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/users/details?username=${username}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          `Failed to fetch user details (${res.status})`
      );
    }
    return data;
  },

  changePassword: async (data: {
    username: string;
    current_password: string;
    new_password: string;
  }) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/users/changepassword/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        responseData?.detail ||
          responseData?.error ||
          responseData?.message ||
          `Failed to change password (${res.status})`
      );
    }
    return responseData;
  },

  searchUsers: async (username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/friends/search?query=${encodeURIComponent(username)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.detail || 
          data?.message ||
          `Failed to find users (${res.status})`
      );
    }
    return data;
  },

  sendFriendRequest: async (data: {
    requester_username: string;
    recipient_username: string;
  }) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/friends/request/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        responseData?.detail ||
          responseData?.error ||
          responseData?.message ||
          `Failed to send friend request (${res.status})`
      );
    }
    return responseData;
  },

  getRelationshipStatus: async (username: string, otherUsername: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/friends/relationship-status?username=${encodeURIComponent(username)}&other_username=${encodeURIComponent(otherUsername)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Failed to get relationship status (${res.status})`);
    }
    return data;
  },

  respondToFriendRequest: async (data: {
    request_id: number;
    username: string;
    action: string;
  }) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/friends/request/respond`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        responseData?.detail ||
          responseData?.error ||
          responseData?.message ||
          `Failed to respond to friend request (${res.status})`
      );
    }
    return responseData;
  },

  getPendingRequests: async (username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/friends/requests/pending?username=${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.detail || 
          data?.message ||
          `Failed to get pending requests (${res.status})`
      );
    }
    return data;
  },

  getFriendsList: async (username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/friends/list?username=${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.detail || 
          data?.message ||
          `Failed to get friends list (${res.status})`
      );
    }
    return data;
  },

  removeFriend: async (requestData: {
    username: string;
    friend_username: string;
  }) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/friends/remove?username=${encodeURIComponent(requestData.username)}&friend_username=${encodeURIComponent(requestData.friend_username)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data?.detail || 
          data?.message ||
          `Failed to remove friend (${res.status})`
      );
    }
    return data;
  },

  getNotifications: async (username: string, limit: number = 20, unreadOnly: boolean = false) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/?username=${encodeURIComponent(username)}&limit=${limit}&unread_only=${unreadOnly}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Failed to get notifications (${res.status})`);
    }
    return data;
  },

  getUnreadCount: async (username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/unread-count?username=${encodeURIComponent(username)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Failed to get unread count (${res.status})`);
    }
    return data;
  },

  markNotificationsAsRead: async (notificationIds: number[]) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Failed to mark notifications as read (${res.status})`);
    }
    return data;
  },

  markAllNotificationsAsRead: async (username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/mark-all-read?username=${encodeURIComponent(username)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Failed to mark all as read (${res.status})`);
    }
    return data;
  },

  deleteNotification: async (notificationId: number, username: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(`${API_BASE_URL}/notifications/${notificationId}?username=${encodeURIComponent(username)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Failed to delete notification (${res.status})`);
    }
    return data;
  },
  
};