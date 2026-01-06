import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

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

    this.socket.on("connect", () => {});

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

  // Listen to trip position updates
  onTripPositionUpdate(callback) {
    if (!this.socket) this.connect();
    this.socket.on("trip_position_update", callback);
    return () => this.socket.off("trip_position_update", callback);
  }

  // Listen to trip started events
  onTripStarted(callback) {
    if (!this.socket) this.connect();
    this.socket.on("trip_started", callback);
    return () => this.socket.off("trip_started", callback);
  }

  // Listen to trip completed events
  onTripCompleted(callback) {
    if (!this.socket) this.connect();
    this.socket.on("trip_completed", callback);
    return () => this.socket.off("trip_completed", callback);
  }

  // Listen to trip stopped events
  onTripStopped(callback) {
    if (!this.socket) this.connect();
    this.socket.on("trip_stopped", callback);
    return () => this.socket.off("trip_stopped", callback);
  }

  // Listen to return trip created events
  onReturnTripCreated(callback) {
    if (!this.socket) this.connect();
    this.socket.on("return_trip_created", callback);
    return () => this.socket.off("return_trip_created", callback);
  }

  // Listen to active trips list
  onActiveTrips(callback) {
    if (!this.socket) this.connect();
    this.socket.on("active_trips", callback);
    return () => this.socket.off("active_trips", callback);
  }

  // Request active trips
  requestActiveTrips() {
    if (!this.socket) this.connect();
    this.socket.emit("request_active_trips");
  }

  // Generic event listener methods
  on(event, callback) {
    if (!this.socket) this.connect();
    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (!this.socket) this.connect();
    this.socket.emit(event, data);
  }
}

// Export singleton instance
const socketService = new SocketService();
export { socketService };
export default socketService;
