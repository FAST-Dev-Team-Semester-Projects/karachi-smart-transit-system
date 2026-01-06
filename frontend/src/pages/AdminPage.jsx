import React, { useState, useEffect } from "react";
import { socketService } from "../utils/socket";
import {
  Play,
  Zap,
  Settings,
  Trash2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const AdminPage = () => {
  const [trips, setTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [tripStatusFilter, setTripStatusFilter] = useState("all"); // NEW: Filter state

  // NEW: State for dropdowns
  const [services, setServices] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Daily Trip Generator State
  const [generatorState, setGeneratorState] = useState({
    daily_start_time: "10:00:00",  // Changed to 10 AM for easier evaluation
    daily_end_time: "10:30:00",    // Changed to 10:30 AM for easier evaluation
    seconds_between_bus_departures: 30,
    // Note: seconds_between_each_stop and seconds_waiting_at_final_stop are hardcoded
    // in the API call (15 and 30 respectively) because bus_tracker.py uses hardcoded values
    service_id: "", // empty = all services
    route_id: "", // empty = all routes
    isGenerating: false,
    isClearing: false,
    lastResult: null,
  });

  useEffect(() => {
    fetchTrips();
    fetchActiveTrips();
    fetchServices(); // NEW: Fetch services for dropdown
    fetchRoutes(); // NEW: Fetch routes for dropdown

    // Set up periodic polling as a reliable fallback every 15s
    // (matches backend bus position update interval)
    const intervalId = setInterval(() => {
      fetchActiveTrips();
    }, 15000);

    // Connect to socket (real-time updates when available)
    socketService.connect();

    // Listen for trip updates via WebSocket
    const handleTripStarted = (data) => {
      console.log("Trip started event received:", data);
      setActiveTrips((prev) => ({
        ...prev,
        [data.trip_id]: {
          trip_id: data.trip_id,
          route_id: data.route_id,
          route_name: data.route_name,
          current_stop_index: data.current_stop_index,
          current_stop_name: data.current_stop_name,
          total_stops: data.total_stops,
          status: "running",
        },
      }));

      // Update trip status in trips list
      setTrips((prev) =>
        prev.map((trip) =>
          trip.trip_id === data.trip_id ? { ...trip, status: "running" } : trip
        )
      );

      // Refresh the full list to ensure new trips appear
      fetchTrips();

      // Add notification
      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          tripId: data.trip_id,
          message: `Trip #${data.trip_id} started!`,
          type: "success",
        },
      ]);

      // Auto-remove notification after 3 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }, 3000);
    };

    const handlePositionUpdate = (data) => {
      setActiveTrips((prev) => {
        // Create new entry if missing, or update existing
        const existing = prev[data.trip_id] || {
          trip_id: data.trip_id,
          status: "running",
          started_at: new Date().toISOString(), // Fallback
        };

        return {
          ...prev,
          [data.trip_id]: {
            ...existing,
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
        // Get trip info before removing
        const completedTrip = prev[data.trip_id];

        // Add notification
        const notificationId = Date.now();
        setNotifications((prevNotif) => [
          ...prevNotif,
          {
            id: notificationId,
            tripId: data.trip_id,
            message: completedTrip
              ? `Trip #${data.trip_id} completed! Final stop: ${completedTrip.current_stop_name}`
              : `Trip #${data.trip_id} completed!`,
            type: "success",
          },
        ]);

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prevNotif) =>
            prevNotif.filter((n) => n.id !== notificationId)
          );
        }, 5000);

        const updated = { ...prev };
        delete updated[data.trip_id];
        return updated;
      });

      // Update trip status in trips list to 'completed'
      setTrips((prev) =>
        prev.map((trip) =>
          trip.trip_id === data.trip_id
            ? { ...trip, status: "completed" }
            : trip
        )
      );

      // Refresh full trips list to ensure DB state is reflected
      fetchTrips();

      // Update trip status in trips list
      setTrips((prev) =>
        prev.map((trip) =>
          trip.trip_id === data.trip_id
            ? { ...trip, status: "completed" }
            : trip
        )
      );
    };

    const handleTripStopped = (data) => {
      setActiveTrips((prev) => {
        const updated = { ...prev };
        delete updated[data.trip_id];
        return updated;
      });

      // Add notification for stopped trip
      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          tripId: data.trip_id,
          message: `Trip #${data.trip_id} was stopped manually`,
          type: "warning",
        },
      ]);

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }, 5000);

      // Update trip status in trips list
      setTrips((prev) =>
        prev.map((trip) =>
          trip.trip_id === data.trip_id
            ? { ...trip, status: "cancelled" }
            : trip
        )
      );
    };

    // Listen for return trip created
    const mergeTripIntoList = (trip) => {
      if (!trip) return;
      setTrips((prev) => {
        const idx = prev.findIndex((t) => t.trip_id === trip.trip_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...trip };
          return next;
        }
        // Prepend so newest scheduled trips appear at top
        return [trip, ...prev];
      });
    };

    const handleReturnTripCreated = (data) => {
      // Add notification
      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          tripId: data.new_trip_id,
          message: `Return trip #${data.new_trip_id} auto-created for bus ${data.bus_id} (${data.direction})`,
          type: "success",
        },
      ]);

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }, 5000);

      // Try to merge trip into the local trips list for immediate UI update
      if (data.trip) {
        mergeTripIntoList(data.trip);
      } else {
        // Fallback to re-fetching trips if the event doesn't contain details
        fetchTrips();
      }

      // Also refresh active trips list to keep UI in sync
      fetchActiveTrips();
    };

    const handleTripRemoved = (data) => {
      // Remove stale trip from activeTrips
      setActiveTrips((prev) => {
        const updated = { ...prev };
        delete updated[data.trip_id];
        return updated;
      });

      // Optionally refresh trips list to sync status
      fetchTrips();
    };

    // Handle socket reconnection - force resync
    const handleReconnect = () => {
      console.log("Socket reconnected, resyncing active trips...");
      fetchActiveTrips();
      fetchTrips();
    };

    socketService.on("trip_started", handleTripStarted);
    socketService.on("trip_position_update", handlePositionUpdate);
    socketService.on("trip_completed", handleTripCompleted);
    socketService.on("trip_stopped", handleTripStopped);
    socketService.on("return_trip_created", handleReturnTripCreated);
    socketService.on("trip_removed", handleTripRemoved);
    socketService.on("connect", handleReconnect);

    return () => {
      clearInterval(intervalId);
      socketService.off("trip_started", handleTripStarted);
      socketService.off("trip_position_update", handlePositionUpdate);
      socketService.off("trip_completed", handleTripCompleted);
      socketService.off("trip_stopped", handleTripStopped);
      socketService.off("return_trip_created", handleReturnTripCreated);
      socketService.off("trip_removed", handleTripRemoved);
      socketService.off("connect", handleReconnect);
    };
  }, []); // Empty dependency array is fine - we use functional updates

  const fetchTrips = async () => {
    try {
      // Fetch all trips (backend now returns data from trip_details_view)
      // Filter by trip_status instead of status since view uses trip_status column
      const response = await fetch(`${API_BASE}/admin/trips?per_page=50`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.items) {
        // Load ALL trips into state - filtering happens via dropdown
        setTrips(data.items);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch trips:", err);
      setError("Failed to fetch trips");
      setLoading(false);
    }
  };
  const fetchActiveTrips = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/trips/active`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success && data.active_trips) {
        const activeMap = {};
        data.active_trips.forEach((trip) => {
          activeMap[trip.trip_id] = trip;
        });
        setActiveTrips(activeMap);
      }
    } catch {
      // Silently fail - activeTrips will be fetched on next poll
    }
  };

  // NEW: Fetch services for dropdown
  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/services`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.items) {
        setServices(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch services:", err);
    }
  };

  // NEW: Fetch routes for dropdown
  const fetchRoutes = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/routes?per_page=100`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.items) {
        setRoutes(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch routes:", err);
    }
  };

  const startTrip = async (tripId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/trips/${tripId}/start`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();

      if (!data.success) {
        // Show error notification
        const notificationId = Date.now();
        setNotifications((prev) => [
          ...prev,
          {
            id: notificationId,
            tripId: tripId,
            message: data.error || "Failed to start trip",
            type: "error",
          },
        ]);

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }, 5000);
      } else {
        // Optimistically add/start this trip in activeTrips so UI updates immediately
        setActiveTrips((prev) => ({
          ...prev,
          [tripId]: {
            trip_id: tripId,
            current_stop_index: 0,
            current_stop_name: data.starting_stop || "Starting point",
            total_stops: data.total_stops || 1,
            status: "running",
          },
        }));

        // Also update the trips list to reflect running status
        setTrips((prev) =>
          prev.map((trip) =>
            trip.trip_id === tripId ? { ...trip, status: "running" } : trip
          )
        );
      }
      // Success notification will still also be handled by WebSocket event when connected
    } catch (err) {
      // Show error notification
      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          tripId: tripId,
          message: "Error starting trip: " + err.message,
          type: "error",
        },
      ]);

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }, 5000);
    }
  };

  const stopTrip = async (tripId) => {
    if (!confirm("Are you sure you want to stop this trip?")) return;

    try {
      const response = await fetch(`${API_BASE}/admin/trips/${tripId}/stop`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!data.success) {
        // Show error notification
        const notificationId = Date.now();
        setNotifications((prev) => [
          ...prev,
          {
            id: notificationId,
            tripId: tripId,
            message: data.error || "Failed to stop trip",
            type: "error",
          },
        ]);

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }, 5000);
      }
      // Success notification will be handled by WebSocket event
    } catch (err) {
      // Show error notification
      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          tripId: tripId,
          message: "Error stopping trip: " + err.message,
          type: "error",
        },
      ]);

      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }, 5000);
    }
  };

  const generateDailyTrips = async () => {
    if (
      !confirm(
        "Generate daily trips for all routes?\n\nThis will create multiple trips for today. Routes that already have trips will be skipped."
      )
    ) {
      return;
    }

    try {
      setGeneratorState((prev) => ({ ...prev, isGenerating: true }));

      const response = await fetch(`${API_BASE}/admin/trips/generate-daily`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daily_start_time: generatorState.daily_start_time,
          daily_end_time: generatorState.daily_end_time,
          seconds_between_bus_departures:
            generatorState.seconds_between_bus_departures,
          // Hardcoded values (bus_tracker.py uses these regardless of input)
          seconds_between_each_stop: 15, // Hardcoded: bus_tracker.py Line 225
          seconds_waiting_at_final_stop: 30, // Hardcoded: bus_tracker.py Line 48
          // NEW: Add optional filters only if provided
          ...(generatorState.service_id && {
            service_id: parseInt(generatorState.service_id),
          }),
          ...(generatorState.route_id && {
            route_id: parseInt(generatorState.route_id),
          }),
          // Note: max_routes removed - Service and Route filters are sufficient
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratorState((prev) => ({
          ...prev,
          isGenerating: false,
          lastResult: data,
        }));

        // Show success notification
        const notificationId = Date.now();
        setNotifications((prev) => [
          ...prev,
          {
            id: notificationId,
            message: `✅ Generated ${data.trips_created} trips for ${data.routes_processed} routes (${data.routes_skipped} skipped)`,
            type: "success",
          },
        ]);

        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }, 8000);

        // Refresh trips
        fetchTrips();
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (error) {
      setGeneratorState((prev) => ({ ...prev, isGenerating: false }));

      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          message: `❌ Trip generation failed: ${error.message}`,
          type: "error",
        },
      ]);

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }, 8000);
    }
  };

  const clearDailyTrips = async () => {
    const isTruncate = generatorState.truncateAll;
    const confirmMessage = isTruncate
      ? "⚠️ DANGER: Are you sure you want to TRUNCATE the entire trips table?\n\nThis will delete ALL trips (past, present, future) and reset trip IDs. This cannot be undone!"
      : "Are you sure you want to clear today's scheduled trips?\n\nRunning and completed trips will be preserved.";

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setGeneratorState((prev) => ({ ...prev, isClearing: true }));

      const response = await fetch(`${API_BASE}/admin/trips/clear-daily`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truncate_all: isTruncate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratorState((prev) => ({
          ...prev,
          isClearing: false,
          lastResult: null,
        }));

        // Show success notification
        const notificationId = Date.now();
        setNotifications((prev) => [
          ...prev,
          {
            id: notificationId,
            tripId: "SYSTEM",
            message:
              data.message ||
              (isTruncate
                ? "All trips truncated successfully"
                : "Today's trips cleared successfully"),
            type: "success",
          },
        ]);

        // Auto-remove notification
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId)
          );
        }, 5000);

        // Refresh trips list
        fetchTrips();
        fetchActiveTrips();
      } else {
        setError(data.error || "Failed to clear trips");
        setGeneratorState((prev) => ({ ...prev, isClearing: false }));
      }
    } catch (err) {
      setError("Failed to clear trips: " + err.message);
      setGeneratorState((prev) => ({ ...prev, isClearing: false }));
    }
  };

  const getProgressPercentage = (tripId) => {
    const active = activeTrips[tripId];
    if (!active) return 0;
    // Use total_stops - 1 so that reaching the last stop (index = total-1) equals 100%
    const totalIntervals = Math.max(1, (active.total_stops || 1) - 1);
    return Math.round((active.current_stop_index / totalIntervals) * 100);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Real-time bus tracking and trip management
        </p>
      </div>

      {/* Daily Trip Generator */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Daily Trip Generator
            </h2>
          </div>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          Simulate real-world transport operations by generating multiple daily
          trips for all routes.
        </p>
        </div>

        {/* Parameters always visible - collapse functionality removed */}
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Configuration
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  step="1"
                  value={generatorState.daily_start_time}
                  onChange={(e) =>
                    setGeneratorState((prev) => ({
                      ...prev,
                      daily_start_time: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  step="1"
                  value={generatorState.daily_end_time}
                  onChange={(e) =>
                    setGeneratorState((prev) => ({
                      ...prev,
                      daily_end_time: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Interval Between Buses
                  <span className="text-slate-500 ml-1">
                    (seconds between departures)
                  </span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={generatorState.seconds_between_bus_departures}
                  onChange={(e) =>
                    setGeneratorState((prev) => ({
                      ...prev,
                      seconds_between_bus_departures: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Note: Stop Duration and Return Buffer inputs removed from UI */}
              {/* These are hardcoded to 15 and 30 seconds in the API call because */}
              {/* bus_tracker.py uses hardcoded values (Line 225: 15s, Line 48: 30s) */}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-300 dark:border-slate-600 pt-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Route Filtering (optional - leave empty to generate for all
                  routes)
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-4">
                <p>
                  • <strong>Service:</strong> Generate trips for all routes in
                  selected service
                </p>
                <p>
                  • <strong>Route:</strong> Generate trips for only this
                  specific route
                </p>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Filter - DROPDOWN */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Service
                  </label>
                  <select
                    value={generatorState.service_id}
                    onChange={(e) =>
                      setGeneratorState((prev) => ({
                        ...prev,
                        service_id: e.target.value,
                        route_id: "",
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All services</option>
                    {services.map((service) => (
                      <option key={service.service_id} value={service.service_id}>
                        {service.service_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Route Filter - DROPDOWN (filtered by service) */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Route
                  </label>
                  <select
                    value={generatorState.route_id}
                    onChange={(e) =>
                      setGeneratorState((prev) => ({
                        ...prev,
                        route_id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All routes</option>
                    {routes
                      .filter(
                        (route) =>
                          !generatorState.service_id ||
                          route.service_id === parseInt(generatorState.service_id)
                      )
                      .map((route) => (
                        <option key={route.route_id} value={route.route_id}>
                          {route.route_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Note: Max Routes field removed - Service and Route filters are sufficient */}
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={generateDailyTrips}
            disabled={generatorState.isGenerating || generatorState.isClearing}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700  disabled:bg-slate-400 disabled:cursor-not-allowed font-medium transition shadow-sm"
          >
            {generatorState.isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Generate Daily Trips</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg pr-4">
            <button
              onClick={clearDailyTrips}
              disabled={
                generatorState.isGenerating || generatorState.isClearing
              }
              className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition shadow-sm ${
                generatorState.truncateAll
                  ? "bg-red-700 hover:bg-red-800 ring-2 ring-red-500 ring-offset-2"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:bg-slate-400 disabled:cursor-not-allowed`}
            >
              {generatorState.isClearing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Clearing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {generatorState.truncateAll
                      ? "Clear ALL Trips (Truncate)"
                      : "Clear Today's Trips"}
                  </span>
                </>
              )}
            </button>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={generatorState.truncateAll || false}
                onChange={(e) =>
                  setGeneratorState((prev) => ({
                    ...prev,
                    truncateAll: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Truncate All
              </span>
            </label>
          </div>
        </div>

        {generatorState.lastResult && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-sm text-green-900 dark:text-green-100">
              <strong>Last Generation:</strong>{" "}
              {generatorState.lastResult.trips_created} trips created for{" "}
              {generatorState.lastResult.routes_processed} routes (
              {generatorState.lastResult.routes_skipped} skipped)
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-center justify-between p-4 rounded-lg border-l-4 transition-all duration-300 ${
                notification.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600"
                  : notification.type === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-600"
                    : "bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-600"
              }`}
            >
              <div className="flex items-center gap-3">
                {notification.type === "success" ? (
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : notification.type === "warning" ? (
                  <svg
                    className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                <div>
                  <div
                    className={`font-medium ${
                      notification.type === "success"
                        ? "text-green-900 dark:text-green-100"
                        : notification.type === "warning"
                          ? "text-yellow-900 dark:text-yellow-100"
                          : "text-red-900 dark:text-red-100"
                    }`}
                  >
                    {notification.message}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      notification.type === "success"
                        ? "text-green-700 dark:text-green-300"
                        : notification.type === "warning"
                          ? "text-yellow-700 dark:text-yellow-300"
                          : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className={`p-1 rounded hover:bg-white/50 dark:hover:bg-black/20 transition ${
                  notification.type === "success"
                    ? "text-green-600 dark:text-green-400"
                    : notification.type === "warning"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Active Trips Section */}
      {Object.keys(activeTrips).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            Active Trips ({Object.keys(activeTrips).length})
          </h2>
          <div className="space-y-4">
            {Object.values(activeTrips).map((trip) => (
              <div
                key={trip.trip_id}
                className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100 text-lg">
                      Trip #{trip.trip_id}
                      {trip.route_name && (
                        <span className="ml-2 text-sm font-normal text-green-700 dark:text-green-300">
                          ({trip.route_name})
                        </span>
                      )}
                    </div>
                    {trip.route_id && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        Route ID: {trip.route_id}
                      </div>
                    )}
                    <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Current Stop: <strong>{trip.current_stop_name}</strong>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Stop {trip.current_stop_index + 1} of {trip.total_stops}
                    </div>
                  </div>
                  <button
                    onClick={() => stopTrip(trip.trip_id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium transition"
                  >
                    Stop Trip
                  </button>
                </div>
                  <div className="mt-3">
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          trip.current_stop_index === (trip.total_stops - 1)
                            ? "bg-green-500"
                            : "bg-green-600 dark:bg-green-400"
                        }`}
                        style={{
                          width: `${getProgressPercentage(trip.trip_id)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {trip.current_stop_index === (trip.total_stops - 1) ? (
                          <span className="font-bold animate-pulse">
                            Arrived - Offloading...
                          </span>
                        ) : (
                          <span>In Transit</span>
                        )}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {getProgressPercentage(trip.trip_id)}% Complete
                      </div>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Trips Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            All Trips
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Filter:
            </label>
            <select
              value={tripStatusFilter}
              onChange={(e) => setTripStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Trips</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        {trips.filter((trip) => {
          if (tripStatusFilter === "all") return true;
          const status = (trip.status || trip.trip_status || "").toLowerCase();
          return status === tripStatusFilter;
        }).length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {tripStatusFilter === "all"
              ? "No trips available. Create trips from the Trips page."
              : `No ${tripStatusFilter} trips found.`}
          </div>
        ) : (
          <div className="space-y-3">
            {trips
              .filter((trip) => {
                // First filter by status dropdown
                if (tripStatusFilter !== "all") {
                  const status = (
                    trip.status ||
                    trip.trip_status ||
                    ""
                  ).toLowerCase();
                  if (status !== tripStatusFilter) return false;
                }
                // Then exclude trips that are already shown in Active Trips panel
                return !activeTrips[trip.trip_id];
              })
              .map((trip) => {
                const live = activeTrips[trip.trip_id];
                const isRunning =
                  (trip.status || trip.trip_status || "").toLowerCase() ===
                  "running";
                const progress =
                  live && typeof live.current_stop_index === "number"
                    ? Math.round(
                        (live.current_stop_index /
                          Math.max(1, (live.total_stops || 1) - 1)) *
                          100
                      )
                    : 0;
                return (
                  <div
                    key={trip.trip_id}
                    className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            Trip #{trip.trip_id}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Bus {trip.bus_id} • Route {trip.route_id}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            (trip.status || trip.trip_status) === "running"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          }`}
                        >
                          {(
                            trip.status ||
                            trip.trip_status ||
                            "SCHEDULED"
                          ).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Departure
                          </div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {new Date(trip.departure_time).toLocaleString()}
                          </div>
                        </div>
                        {!isRunning &&
                          (
                            trip.status ||
                            trip.trip_status ||
                            ""
                          ).toLowerCase() === "scheduled" && (
                            <button
                              onClick={() => startTrip(trip.trip_id)}
                              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition flex items-center gap-2 min-w-[120px]"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              <span>Start</span>
                            </button>
                          )}
                        {isRunning && (
                          <button
                            onClick={() => stopTrip(trip.trip_id)}
                            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition min-w-[120px]"
                          >
                            Stop Trip
                          </button>
                        )}
                        {(
                          trip.status ||
                          trip.trip_status ||
                          ""
                        ).toLowerCase() === "completed" && (
                          <button
                            disabled
                            className="px-6 py-2 bg-green-500 text-white rounded-lg font-medium cursor-not-allowed opacity-75 min-w-[120px]"
                          >
                            Completed
                          </button>
                        )}
                      </div>
                    </div>
                    {isRunning && (
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          {live?.current_stop_name ? (
                            <>
                              Current Stop:{" "}
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {live.current_stop_name}
                              </span>
                            </>
                          ) : (
                            "Awaiting live position..."
                          )}
                        </div>
                        {live && (
                          <div>
                            Stop {Number(live.current_stop_index ?? 0) + 1} of{" "}
                            {live.total_stops ?? "?"}{" "}
                            <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                              {progress}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
