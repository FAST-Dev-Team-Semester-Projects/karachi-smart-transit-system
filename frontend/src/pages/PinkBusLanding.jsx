import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  ChevronLeft,
  Map,
  MapPin,
  ArrowDown,
  AlertTriangle,
  Bus,
  CheckCircle,
} from "lucide-react";
import { logout } from "../utils/auth";
import { socketService } from "../utils/socket";

const API_BASE = "http://localhost:5000";

const STATUS_STYLES = {
  running:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  scheduled:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  departed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  blocked:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const BLOCKED_MESSAGES = {
  passed_boarding_stop: {
    full: "This bus has already passed your selected boarding stop.",
    short: "Already Departed",
  },
  wrong_direction: {
    full: "This trip is going in the opposite direction of your selected journey.",
    short: "Wrong Direction",
  },
  default: {
    full: "This trip is not available for your selected stops.",
    short: "Unavailable",
  },
};

const getBlockedMessage = (reason, variant = "full") => {
  const entry = BLOCKED_MESSAGES[reason] || BLOCKED_MESSAGES.default;
  return entry[variant];
};

const PinkBusLanding = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate("/login");
    }
  };

  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const [stops, setStops] = useState([]);
  const [startStopId, setStartStopId] = useState("");
  const [endStopId, setEndStopId] = useState("");

  const [trips, setTrips] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Theme Configuration - Pink Bus (Women-only service)
  const theme = {
    bg: "bg-red-50 dark:bg-slate-950",
    accent: "text-pink-700 dark:text-pink-400",
    button:
      "bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-600",
    buttonGradient:
      "bg-linear-to-r from-pink-600 to-pink-500 hover:from-pink-700 hover:to-pink-600 dark:from-pink-700 dark:to-pink-600",
    border: "border-pink-200 dark:border-pink-800",
    ring: "focus:ring-pink-500 dark:focus:ring-pink-400",
    lightBg: "bg-pink-100 dark:bg-pink-900/30",
    lightText: "text-pink-800 dark:text-pink-200",
    cardBorder: "border-t-4 border-red-500 dark:border-red-600",
    icon: "text-pink-600 dark:text-pink-400",
    card: "bg-white dark:bg-slate-900",
  };

  // Fetch Red Bus routes (service_id = 7)
  useEffect(() => {
    let ignore = false;
    const fetchRoutes = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/services/9/routes`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!ignore) {
          if (res.ok) {
            const list = data.routes || data.data || [];
            setRoutes(list);
            if (list.length === 1) setSelectedRouteId(list[0].route_id);
          } else {
            setError(data.message || "Failed to fetch routes");
          }
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Network error");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchRoutes();
    return () => {
      ignore = true;
    };
  }, []);

  const buildTripsUrl = useCallback(() => {
    if (!selectedRouteId) return null;
    const params = new URLSearchParams();
    if (startStopId) params.append("boarding_stop_id", startStopId);
    if (endStopId) params.append("alighting_stop_id", endStopId);
    const query = params.toString();
    return `${API_BASE}/api/routes/${selectedRouteId}/trips/availability${query ? `?${query}` : ""}`;
  }, [selectedRouteId, startStopId, endStopId]);

  const reloadTrips = useCallback(() => {
    const url = buildTripsUrl();
    if (!url) return;
    fetch(url, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTrips(data.trips || []);
        }
      })
      .catch((err) => console.error("Failed to reload trips:", err));
  }, [buildTripsUrl]);

  // Fetch stops for route
  useEffect(() => {
    if (!selectedRouteId) return;
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError("");
      setStops([]);
      setStartStopId("");
      setEndStopId("");
      setTrips([]);
      try {
        const tripsUrl = `${API_BASE}/api/routes/${selectedRouteId}/trips/availability`;

        const [stopsRes, tripsRes] = await Promise.all([
          fetch(`${API_BASE}/api/routes/${selectedRouteId}/stops`, {
            credentials: "include",
          }),
          fetch(tripsUrl, { credentials: "include" }),
        ]);
        const stopsJson = await stopsRes.json();
        const tripsJson = await tripsRes.json();
        if (!ignore) {
          if (stopsRes.ok) setStops(stopsJson.stops || []);
          else setError(stopsJson.message || "Failed to load stops");
          if (tripsRes.ok) setTrips(tripsJson.trips || []);
          else
            setError(
              (prev) => prev || tripsJson.message || "Failed to load trips",
            );
        }
      } catch (e) {
        if (!ignore) setError(e.message || "Network error");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [selectedRouteId]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!selectedRouteId) return;

    socketService.connect();

    const handleTripUpdate = () => {
      reloadTrips();
    };

    const handleReturnTripCreated = (data) => {
      if (data && data.trip && Number(data.trip.route_id) === Number(selectedRouteId)) {
        const trip = data.trip;
        setTrips((prev) => {
          const idx = prev.findIndex((t) => t.trip_id === trip.trip_id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...trip };
            return next;
          }
          return [trip, ...prev];
        });
      } else {
        reloadTrips();
      }
    };

    // Listen to all trip events
    socketService.on("trip_started", handleTripUpdate);
    socketService.on("trip_position_update", handleTripUpdate);
    socketService.on("trip_completed", handleTripUpdate);
    socketService.on("trip_stopped", handleTripUpdate);
    socketService.on("return_trip_created", handleReturnTripCreated);
    return () => {
      socketService.off("trip_started", handleTripUpdate);
      socketService.off("trip_position_update", handleTripUpdate);
      socketService.off("trip_completed", handleTripUpdate);
      socketService.off("trip_stopped", handleTripUpdate);
      socketService.off("return_trip_created", handleReturnTripCreated);
    };
  }, [selectedRouteId, reloadTrips]);

  // Refetch trips whenever stop selections change
  useEffect(() => {
    if (!selectedRouteId) return;
    reloadTrips();
  }, [reloadTrips, selectedRouteId, startStopId, endStopId]);

  // Polling fallback every 15 seconds to ensure UI stays in sync
  useEffect(() => {
    if (!selectedRouteId) return;
    const intervalId = setInterval(() => {
      reloadTrips();
    }, 15000);
    return () => clearInterval(intervalId);
  }, [selectedRouteId, reloadTrips]);

  // Detect journey direction
  const journeyDirection = useMemo(() => {
    if (!startStopId || !endStopId) return null;
    const startIdx =
      stops.find((s) => String(s.stop_id) === String(startStopId))
        ?.stop_order ?? -1;
    const endIdx =
      stops.find((s) => String(s.stop_id) === String(endStopId))?.stop_order ??
      -1;
    if (startIdx <= 0 || endIdx <= 0 || startIdx === endIdx) return null;
    return endIdx > startIdx ? "forward" : "backward";
  }, [startStopId, endStopId, stops]);

  const canBook = useMemo(() => {
    return journeyDirection !== null;
  }, [journeyDirection]);

  // Filter trips by direction
  const filteredTrips = useMemo(() => {
    if (!journeyDirection) return trips;
    return trips.filter((trip) => trip.direction === journeyDirection);
  }, [trips, journeyDirection]);

  const formatDT = (dt) => {
    try {
      return new Date(dt).toLocaleString();
    } catch {
      return dt;
    }
  };

  const handleBook = async (trip) => {
    setError("");
    setMessage("");
    if (!canBook) {
      setError(
        "Please choose valid start and end stops (end must be after start).",
      );
      return;
    }

    try {
      if (trip.boarding_allowed === false) {
        setError(getBlockedMessage(trip.blocked_reason));
        return;
      }
      if (trip.available <= 0) {
        setError("No seats available on this trip.");
        return;
      }
      const fareRes = await fetch(
        `${API_BASE}/api/calculate_fare?start_stop_id=${startStopId}&end_stop_id=${endStopId}&route_id=${selectedRouteId}`,
        { credentials: "include" },
      );
      const fareData = await fareRes.json();

      if (!fareRes.ok || !fareData.success) {
        setError(fareData.message || "Failed to calculate fare");
        return;
      }

      const startStop = stops.find((s) => s.stop_id === Number(startStopId));
      const endStop = stops.find((s) => s.stop_id === Number(endStopId));

      navigate("/payment", {
        state: {
          trip_id: trip.trip_id,
          bus_id: trip.bus_id,
          number_plate: trip.number_plate,
          departure_time: trip.departure_time,
          boarding_stop_id: Number(startStopId),
          alighting_stop_id: Number(endStopId),
          start_stop_name: startStop?.stop_name || "Unknown",
          end_stop_name: endStop?.stop_name || "Unknown",
          fare_amount: fareData.fare_amount,
          service_name: fareData.service_name || "Pink Bus Service",
        },
      });
    } catch (e) {
      setError(e.message || "Network error");
    }
  };

  return (
    <div
      className={`min-h-screen ${theme.bg} flex flex-col p-6 font-sans relative overflow-hidden`}
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-b from-purple-600/10 to-orange-600/10 blur-3xl pointer-events-none" />

      <div className="w-full relative z-10">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`absolute left-0 px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-2 border ${theme.border} bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300`}
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>
          <h1
            className={`text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight text-center`}
          >
            <span className={theme.accent}>Pink Bus Service</span>
          </h1>
          <div className="absolute right-0">
            <Button
              onClick={handleLogout}
              className="text-md hover:scale-105 transition-transform bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg"
            >
              <LogOut className="stroke-3 w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-8 mb-10">
          {/* Top Section: Route & Stops Selection - Full Width */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Route Selection */}
            <div
              className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 ${theme.cardBorder}`}
            >
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Map className="w-6 h-6" /> Select Route
              </h2>
              <div className="space-y-3">
                {loading && routes.length === 0 ? (
                  <div className="text-slate-500 dark:text-slate-400 italic p-2">
                    Loading routes...
                  </div>
                ) : routes.length === 0 ? (
                  <div className="text-slate-500 dark:text-slate-400 italic p-2">
                    No routes found
                  </div>
                ) : (
                  routes.map((r) => (
                    <div
                      key={r.route_id}
                      onClick={() => setSelectedRouteId(r.route_id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                        String(selectedRouteId) === String(r.route_id)
                          ? `${theme.lightBg} ${theme.border} ${theme.lightText} font-bold`
                          : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      }`}
                    >
                      {r.route_name}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stop Selection */}
            <div
              className={`bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 ${theme.cardBorder}`}
            >
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6" /> Select Stops
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Boarding Station
                  </label>
                  <select
                    value={startStopId}
                    onChange={(e) => setStartStopId(e.target.value)}
                    disabled={!selectedRouteId || stops.length === 0}
                    className={`w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${theme.ring} transition-all hover:border-slate-300 dark:hover:border-slate-600 focus:shadow-lg`}
                  >
                    <option value="">Select starting stop</option>
                    {stops.map((s) => (
                      <option key={s.stop_id} value={s.stop_id}>
                        {s.stop_order}. {s.stop_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Destination Station
                  </label>
                  <select
                    value={endStopId}
                    onChange={(e) => setEndStopId(e.target.value)}
                    disabled={!selectedRouteId || stops.length === 0}
                    className={`w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${theme.ring} transition-all hover:border-slate-300 dark:hover:border-slate-600 focus:shadow-lg`}
                  >
                    <option value="">Select destination stop</option>
                    {stops.map((s) => (
                      <option key={s.stop_id} value={s.stop_id}>
                        {s.stop_order}. {s.stop_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Direction Indicator */}
                {journeyDirection && (
                  <div
                    className={`p-3 rounded-lg text-sm font-medium border flex items-center gap-2 ${
                      journeyDirection === "forward"
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                        : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    {journeyDirection === "forward"
                      ? "↗️ Forward Journey"
                      : "↙️ Backward Journey"}
                    <span className="text-xs opacity-75">
                      ({filteredTrips.length}{" "}
                      {filteredTrips.length === 1 ? "trip" : "trips"} available)
                    </span>
                  </div>
                )}

                {!canBook && startStopId && endStopId && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-pink-600 dark:text-pink-400 rounded-lg text-sm font-medium border border-red-100 dark:border-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Please select
                    different stops
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Trips Grid - Full Width */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Bus className="w-6 h-6" /> Available Trips
              </h2>
              {filteredTrips.length > 0 && (
                <span className="bg-white dark:bg-slate-800 px-3 py-1 rounded-full text-sm font-medium text-slate-500 dark:text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">
                  {filteredTrips.length}{" "}
                  {journeyDirection ? `${journeyDirection} ` : ""}trips
                </span>
              )}
            </div>

            {loading && filteredTrips.length === 0 && (
              <div className="p-12 text-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                Loading schedule...
              </div>
            )}

            {!loading && filteredTrips.length === 0 && journeyDirection && (
              <div className="p-12 text-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                No {journeyDirection} trips available for this route currently.
              </div>
            )}

            {!loading && trips.length === 0 && !journeyDirection && (
              <div className="p-12 text-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                No trips scheduled for this route currently.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTrips.map((t) => {
                const isRunning = t.status === "running" || t.is_running;
                const boardingBlocked = t.boarding_allowed === false;
                const directionLabel = (
                  t.direction ||
                  journeyDirection ||
                  ""
                ).toLowerCase();
                const statusKey = boardingBlocked
                  ? t.status === "wrong_direction"
                    ? "blocked"
                    : "departed"
                  : isRunning
                    ? "running"
                    : "scheduled";
                const statusClass =
                  STATUS_STYLES[statusKey] || STATUS_STYLES.scheduled;

                return (
                  <div
                    key={t.trip_id}
                    className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all duration-300 group relative overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 left-0 w-1 h-full ${theme.bg.replace("bg-", "bg-linear-to-b from-")}-400 to-transparent`}
                    ></div>

                    <div className="flex justify-between items-start mb-4 pl-2 gap-3">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                          Trip #{t.trip_id}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                          {t.number_plate || `Bus ${t.bus_id}`}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusClass}`}
                        >
                          {boardingBlocked && t.status === "wrong_direction"
                            ? "Wrong Direction"
                            : boardingBlocked && t.status === "departed"
                              ? "Already Departed"
                              : isRunning
                                ? "Running"
                                : "Scheduled"}
                        </span>
                        <span
                          className={`${theme.lightBg} ${theme.lightText} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide`}
                        >
                          {t.capacity} Seats
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 pl-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-medium">
                          Departure
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 text-base">
                          {formatDT(t.departure_time)}
                        </span>
                      </div>
                      {t.arrival_time && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400 font-medium">
                            Arrival
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-200 text-base">
                            {formatDT(t.arrival_time)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">
                          Status
                        </span>
                        <span
                          className={`font-semibold ${
                            isRunning
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {isRunning
                            ? `Running${t.current_stop_name ? ` – at ${t.current_stop_name}` : ""}`
                            : "Scheduled"}
                        </span>
                      </div>
                    </div>

                    {isRunning && (
                      <div className="mb-5 pl-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {t.current_stop_name
                            ? `Currently at ${t.current_stop_name}`
                            : "Live location syncing..."}
                        </div>
                        <div>
                          Stop{" "}
                          {typeof t.current_stop_index === "number"
                            ? Number(t.current_stop_index) + 1
                            : "—"}
                          {t.total_stops ? ` of ${t.total_stops}` : ""}
                        </div>
                        <div>
                          Direction:{" "}
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {directionLabel
                              ? directionLabel === "backward"
                                ? "Backward"
                                : "Forward"
                              : "Updating..."}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pl-2">
                      <div className="flex items-center justify-between mb-4 text-sm">
                        <span className="text-slate-400 font-medium">
                          Availability
                        </span>
                        <span
                          className={`font-bold ${
                            t.available > 5
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {Math.max(0, t.available)} seats left
                        </span>
                      </div>

                      {boardingBlocked && (
                        <div className="mb-3 p-3 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
                          {getBlockedMessage(t.blocked_reason)}
                        </div>
                      )}

                      <button
                        onClick={() => handleBook(t)}
                        disabled={
                          !canBook || t.available <= 0 || boardingBlocked
                        }
                        className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all duration-300 transform active:scale-95 ${
                          t.available > 0 && canBook && !boardingBlocked
                            ? `${theme.buttonGradient} text-white shadow-${theme.accent.split("-")[1]}-500/20`
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                        }`}
                      >
                        {boardingBlocked
                          ? getBlockedMessage(t.blocked_reason, "short")
                          : t.available > 0
                            ? "Book Ticket"
                            : "Sold Out"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {(message || error) && (
          <div className="fixed bottom-6 right-6 max-w-md animate-fade-in z-50">
            {message && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl shadow-2xl border border-emerald-100 dark:border-emerald-800 mb-2 flex items-center gap-3">
                <CheckCircle className="w-6 h-6" />
                {message}
              </div>
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-pink-800 dark:text-pink-200 p-4 rounded-xl shadow-2xl border border-red-100 dark:border-red-800 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinkBusLanding;
