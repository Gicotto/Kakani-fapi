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
    const res = await fetchWithTimeout(`${API_BASE_URL}/login`, {
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
    const res = await fetchWithTimeout(`${API_BASE_URL}/getactiveusers/`, {
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

  getMessages: async (currentUser: string, otherUser: string) => {
    const fetchWithTimeout = createFetchWithTimeout();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/messages/thread?user1=${encodeURIComponent(currentUser)}&user2=${encodeURIComponent(otherUser)}`,
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
};
