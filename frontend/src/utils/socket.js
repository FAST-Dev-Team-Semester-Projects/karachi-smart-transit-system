import { io } from "socket.io-client";

// Derive a correct Socket.IO base URL.
// - Prefer explicit VITE_SOCKET_URL
// - Otherwise, try to strip any `/api` path from VITE_API_BASE
// - Finally, fall back to a sensible localhost default
function getSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;

  const apiBase = import.meta.env.VITE_API_BASE;
  if (apiBase) {
    try {
      const url = new URL(apiBase);
      // Socket.IO should connect to the origin (no extra path like /api)
      return url.origin;
    } catch {
      // Fallback: just strip a trailing `/api` if present
      return apiBase.replace(/\/api\/?$/, "");
    }
  }

  // Default dev setup: backend on 5000
  return "http://localhost:5000";
}

const SOCKET_URL = getSocketUrl();

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      this.socket.emit("request_active_trips");
    });

    this.socket.on("disconnect", () => {});

    this.socket.on("connect_error", (error) => {});

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }

    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (!this.socket) {
      this.connect();
    }
    this.socket.emit(event, data);
  }

  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
    }
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
