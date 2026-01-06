import React, { useState, useEffect, useMemo } from "react";
import { socketService } from "../../utils/socket";
import {
  Bus,
  MapPin,
  Navigation,
  Play,
  Square,
  AlertCircle,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const AdminBusTracking = () => {
  const [trips, setTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runningStatusCache, setRunningStatusCache] = useState({});

  const clearCachedStatus = (tripId) => {
    setRunningStatusCache((prev) => {
      if (!prev[tripId]) return prev;
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
  };

  useEffect(() => {
    fetchTrips();
    fetchActiveTrips();

    // Auto-refresh trips list every 30 seconds as fallback
    const refreshInterval = setInterval(() => {
      fetchTrips();
    }, 30000);

    // Connect to socket
    socketService.connect();

    // Listen for trip updates
    const handleTripStarted = (data) => {
      clearCachedStatus(data.trip_id);
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
      // Update the trip status in the trips list
      setTrips((prev) =>
        prev.map((trip) =>
          trip.trip_id === data.trip_id ? { ...trip, status: "running" } : trip,
        ),
      );
    };

    const handlePositionUpdate = (data) => {
      clearCachedStatus(data.trip_id);
      setActiveTrips((prev) => ({
        ...prev,
        [data.trip_id]: {
          ...prev[data.trip_id],
          current_stop_index: data.current_stop_index,
          current_stop_id: data.current_stop_id,
          current_stop_name: data.current_stop_name,
          total_stops: data.total_stops,
        },
      }));
    };

    const handleTripCompleted = (data) => {
      clearCachedStatus(data.trip_id);
      setActiveTrips((prev) => {
        const updated = { ...prev };
        delete updated[data.trip_id];
        return updated;
      });
      // Refresh trips list
      fetchTrips();
    };

    const handleTripStopped = (data) => {
      clearCachedStatus(data.trip_id);
      setActiveTrips((prev) => {
        const updated = { ...prev };
        delete updated[data.trip_id];
        return updated;
      });
      fetchTrips();
    };

    const mergeTripIntoList = (trip) => {
      if (!trip) return;
      setTrips((prev) => {
        const idx = prev.findIndex((t) => t.trip_id === trip.trip_id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...trip };
          return next;
        }
        return [trip, ...prev];
      });
    };

    const handleReturnTripCreated = (data) => {
      // Optimistically add the new scheduled trip to the trips list using supplied payload
      if (data && data.trip) {
        mergeTripIntoList(data.trip);
      } else {
        fetchTrips();
      }
      // Ensure active trips are refreshed
      fetchActiveTrips();
    };

    socketService.on("trip_started", handleTripStarted);
    socketService.on("trip_position_update", handlePositionUpdate);
    socketService.on("trip_completed", handleTripCompleted);
    socketService.on("trip_stopped", handleTripStopped);
    socketService.on("return_trip_created", handleReturnTripCreated);

    return () => {
      clearInterval(refreshInterval);
      socketService.off("trip_started", handleTripStarted);
      socketService.off("trip_position_update", handlePositionUpdate);
      socketService.off("trip_completed", handleTripCompleted);
      socketService.off("trip_stopped", handleTripStopped);
      socketService.off("return_trip_created", handleReturnTripCreated);
    };
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/trips?per_page=50`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.items) {
        setTrips(data.items);
      }
      setLoading(false);
    } catch {
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
    } catch (err) {}
  };

  const startTrip = async (tripId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/trips/${tripId}/start`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        alert(`Trip started! Bus will reach next stop in 15 seconds.`);
        // Explicitly refresh data to ensure UI updates even if socket event is missed
        fetchTrips();
        fetchActiveTrips();
      } else {
        alert(data.error || "Failed to start trip");
      }
    } catch (err) {
      alert("Error starting trip: " + err.message);
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
      if (data.success) {
        alert("Trip stopped successfully");
        clearCachedStatus(tripId);
        fetchTrips();
        fetchActiveTrips();
      } else {
        alert(data.error || "Failed to stop trip");
      }
    } catch (err) {
      alert("Error stopping trip: " + err.message);
    }
  };

  const getLiveStatus = (tripId) =>
    activeTrips[tripId] || runningStatusCache[tripId];

  const getProgressPercentage = (tripId) => {
    const live = getLiveStatus(tripId);
    if (
      !live ||
      typeof live.current_stop_index !== "number" ||
      typeof live.total_stops !== "number" ||
      live.total_stops === 0
    ) {
      return 0;
    }
    return Math.round(
      (live.current_stop_index / Math.max(1, live.total_stops)) * 100,
    );
  };

  const runningTripIds = useMemo(
    () =>
      trips
        .filter(
          (trip) =>
            (trip.status || trip.trip_status || "").toLowerCase() === "running",
        )
        .map((trip) => trip.trip_id),
    [trips],
  );

  const runningIdsMissingTelemetry = useMemo(
    () =>
      runningTripIds.filter(
        (tripId) => !activeTrips[tripId] && !runningStatusCache[tripId],
      ),
    [runningTripIds, activeTrips, runningStatusCache],
  );

  useEffect(() => {
    setRunningStatusCache((prev) => {
      if (!runningTripIds.length) {
        return Object.keys(prev).length ? {} : prev;
      }
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach((key) => {
        const numericKey = Number(key);
        if (activeTrips[numericKey] || !runningTripIds.includes(numericKey)) {
          delete next[numericKey];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [runningTripIds, activeTrips]);

  useEffect(() => {
    if (!runningIdsMissingTelemetry.length) return;
    let cancelled = false;
    const controller = new AbortController();

    const hydrate = async () => {
      const results = await Promise.all(
        runningIdsMissingTelemetry.map(async (tripId) => {
          try {
            const res = await fetch(
              `${API_BASE}/admin/trips/${tripId}/status`,
              {
                credentials: "include",
                signal: controller.signal,
              },
            );
            if (!res.ok) {
              return { tripId, payload: null };
            }
            const data = await res.json();
            if (data.status !== "running") {
              return { tripId, payload: null };
            }
            return { tripId, payload: data };
          } catch {
            return { tripId, payload: null };
          }
        }),
      );
      if (cancelled) return;
      setRunningStatusCache((prev) => {
        const next = { ...prev };
        let changed = false;
        results.forEach(({ tripId, payload }) => {
          if (payload) {
            next[tripId] = payload;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    hydrate();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [runningIdsMissingTelemetry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.15),transparent_60%)] pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Real-Time Bus Tracking
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Monitor active trips and manage bus schedules
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                How it works
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>
                  Click &quot;Start Trip&quot; to begin real-time tracking
                </li>
                <li>Bus moves to next stop every 15 seconds automatically</li>
                <li>Track current position and progress in real-time</li>
                <li>Trip completes automatically when reaching final stop</li>
                <li>
                  Passengers can only book trips that haven&apos;t passed their
                  boarding stop
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Active Trips Section */}
        {Object.keys(activeTrips).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active Trips ({Object.keys(activeTrips).length})
            </h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.values(activeTrips).map((trip) => (
                <div
                  key={trip.trip_id}
                  className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-green-200 dark:border-green-800/30 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Navigation className="w-24 h-24 text-green-500" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-lg">
                            TRIP #{trip.trip_id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-green-500" />
                          <span className="font-medium">
                            {trip.current_stop_name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 ml-6 mt-0.5">
                          Stop {trip.current_stop_index + 1} of{" "}
                          {trip.total_stops}
                        </div>
                      </div>
                      <button
                        onClick={() => stopTrip(trip.trip_id)}
                        className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                        title="Stop Trip"
                      >
                        <Square className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>Progress</span>
                        <span>{getProgressPercentage(trip.trip_id)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-full rounded-full transition-all duration-500 ease-out relative"
                          style={{
                            width: `${getProgressPercentage(trip.trip_id)}%`,
                          }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Trips Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            All Scheduled Trips
          </h3>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Trip ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Bus ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Route ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Departure
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {trips.map((trip) => {
                    const liveStatus = getLiveStatus(trip.trip_id);
                    const isActive = Boolean(activeTrips[trip.trip_id]);
                    const isRunning =
                      (trip.status || "").toLowerCase() === "running";
                    return (
                      <tr
                        key={trip.trip_id}
                        className={`transition-colors ${
                          isActive
                            ? "bg-green-50/50 dark:bg-green-900/10"
                            : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          #{trip.trip_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {trip.bus_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {trip.route_id}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              trip.direction === "forward"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            }`}
                          >
                            {trip.direction === "forward"
                              ? "→ Forward"
                              : "← Backward"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {new Date(trip.departure_time).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              isActive
                                ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                                : trip.status === "scheduled"
                                  ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                                  : trip.status === "completed"
                                    ? "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
                            }`}
                          >
                            {isActive ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                                RUNNING
                              </>
                            ) : (
                              trip.status.toUpperCase()
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {!isActive && trip.status === "scheduled" && (
                            <button
                              onClick={() => startTrip(trip.trip_id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm shadow-green-600/20"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Start Trip
                            </button>
                          )}
                          {isRunning && (
                            <div className="space-y-2 min-w-[200px]">
                              <div
                                className={`flex items-center gap-1.5 text-xs font-medium ${
                                  liveStatus
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">
                                  {liveStatus?.current_stop_name ||
                                    "Awaiting live position..."}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {liveStatus
                                    ? `Stop ${
                                        Number(
                                          liveStatus.current_stop_index ?? 0,
                                        ) + 1
                                      } of ${liveStatus.total_stops ?? "?"}`
                                    : "Tracking data syncing"}
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      liveStatus
                                        ? "bg-green-500"
                                        : "bg-slate-400 animate-pulse"
                                    }`}
                                    style={{
                                      width: liveStatus
                                        ? `${getProgressPercentage(
                                            trip.trip_id,
                                          )}%`
                                        : "30%",
                                    }}
                                  />
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                                  {liveStatus
                                    ? `${getProgressPercentage(
                                        trip.trip_id,
                                      )}% Complete`
                                    : "Waiting for telemetry"}
                                </div>
                              </div>
                            </div>
                          )}
                          {trip.status === "completed" && (
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBusTracking;
