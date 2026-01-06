import { useState, useEffect } from "react";
import { socketService } from "../utils/socket";

export const useBusTracking = () => {
  const [activeTrips, setActiveTrips] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to socket
    socketService.connect();

    const handleConnect = () => {
      setConnected(true);
      socketService.emit("request_active_trips");
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleActiveTrips = (data) => {
      if (data.trips) {
        const tripsMap = {};
        data.trips.forEach((trip) => {
          tripsMap[trip.trip_id] = trip;
        });
        setActiveTrips(tripsMap);
      }
    };

    const handleTripStarted = (data) => {
      setActiveTrips((prev) => ({
        ...prev,
        [data.trip_id]: {
          trip_id: data.trip_id,
          current_stop_index: data.current_stop_index,
          current_stop_name: data.current_stop_name,
          total_stops: data.total_stops,
          status: "running",
        },
      }));
    };

    const handlePositionUpdate = (data) => {
      setActiveTrips((prev) => {
        if (!prev[data.trip_id]) return prev;
        return {
          ...prev,
          [data.trip_id]: {
            ...prev[data.trip_id],
            current_stop_index: data.current_stop_index,
            current_stop_id: data.current_stop_id,
            current_stop_name: data.current_stop_name,
            total_stops: data.total_stops,
          },
        };
      });
    };

    const handleTripCompleted = (data) => {
      setActiveTrips((prev) => {
        const updated = { ...prev };
        delete updated[data.trip_id];
        return updated;
      });
    };

    const handleTripStopped = (data) => {
      setActiveTrips((prev) => {
        const updated = { ...prev };
        delete updated[data.trip_id];
        return updated;
      });
    };

    // Register event listeners
    socketService.socket?.on("connect", handleConnect);
    socketService.socket?.on("disconnect", handleDisconnect);
    socketService.on("active_trips", handleActiveTrips);
    socketService.on("trip_started", handleTripStarted);
    socketService.on("trip_position_update", handlePositionUpdate);
    socketService.on("trip_completed", handleTripCompleted);
    socketService.on("trip_stopped", handleTripStopped);

    // Cleanup
    return () => {
      socketService.socket?.off("connect", handleConnect);
      socketService.socket?.off("disconnect", handleDisconnect);
      socketService.off("active_trips", handleActiveTrips);
      socketService.off("trip_started", handleTripStarted);
      socketService.off("trip_position_update", handlePositionUpdate);
      socketService.off("trip_completed", handleTripCompleted);
      socketService.off("trip_stopped", handleTripStopped);
    };
  }, []);

  return {
    activeTrips,
    connected,
    isTripActive: (tripId) => !!activeTrips[tripId],
    getTripStatus: (tripId) => activeTrips[tripId] || null,
  };
};
