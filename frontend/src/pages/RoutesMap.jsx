import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/context/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Map as MapIcon,
  Menu,
  X,
  CheckSquare,
  Square,
  ChevronDown,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

const SERVICES = [
  { id: 1, name: "Green Line BRT", type: "brt", color: "emerald" },
  { id: 2, name: "Orange Line BRT", type: "brt", color: "orange" },
  { id: 3, name: "Red Line BRT", type: "brt", color: "red" },
  { id: 4, name: "Yellow Line BRT", type: "brt", color: "yellow" },
  { id: 5, name: "Blue Line BRT", type: "brt", color: "blue" },
  { id: 6, name: "Brown Line BRT", type: "brt", color: "amber" },
  { id: 7, name: "Peoples Bus Service", type: "bus", color: "red" },
  { id: 8, name: "EV Bus Service", type: "bus", color: "teal" },
  { id: 9, name: "Pink Bus Service", type: "bus", color: "pink" },
];

const SERVICE_TAILWIND_COLORS = {
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  teal: "bg-teal-500",
  pink: "bg-pink-500",
};

// Color mapping from Tailwind color names to hex values for Leaflet
const COLOR_HEX_MAP = {
  emerald: "#10b981",
  orange: "#f97316",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  amber: "#f59e0b",
  teal: "#14b8a6",
  pink: "#ec4899",
};

const RoutesMap = () => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // State
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [serviceRoutes, setServiceRoutes] = useState({}); // Map serviceId -> routes[]
  const [selectedRoutes, setSelectedRoutes] = useState(new Set()); // Multiple selected route IDs
  const [loadingRoutes, setLoadingRoutes] = useState(new Set()); // Set of serviceIds being fetched
  const [tileStatus, setTileStatus] = useState("loading");
  const [tileErrorHost, setTileErrorHost] = useState(null);
  const [tileLayerKey, setTileLayerKey] = useState(0);
  const [tileFallbackEnabled, setTileFallbackEnabled] = useState(false);

  // Route visualization state
  const [showRouteStops, setShowRouteStops] = useState(true);
  const [showRouteTrace, setShowRouteTrace] = useState(true);
  const [routesData, setRoutesData] = useState({}); // Map routeId -> { stops: [], color: '' }
  const mapRef = useRef(null);

  // Reset tile loading state whenever theme changes
  useEffect(() => {
    setTileFallbackEnabled(false);
    setTileStatus("loading");
    setTileErrorHost(null);
    setTileLayerKey((prev) => prev + 1);
  }, [theme]);

  const handleTileLoad = () => {
    setTileStatus("loaded");
  };

  const handleTileError = (event) => {
    const failingHost = (() => {
      try {
        return new URL(event?.tile?.src || "").host;
      } catch {
        return null;
      }
    })();
    setTileErrorHost(failingHost);

    // If dark-mode provider fails, fall back to standard OSM tiles
    if (!tileFallbackEnabled && theme === "dark") {
      console.warn(
        "Dark tile provider failed, falling back to standard OSM tiles.",
      );
      setTileFallbackEnabled(true);
      setTileStatus("loading");
      setTileLayerKey((prev) => prev + 1);
      return;
    }

    setTileStatus("error");
  };

  const retryTileLoad = () => {
    setTileStatus("loading");
    setTileErrorHost(null);
    setTileLayerKey((prev) => prev + 1);
  };

  // Handle scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch routes for a service
  const fetchRoutes = async (serviceId) => {
    // If already fetched, return the existing routes
    if (serviceRoutes[serviceId]) return serviceRoutes[serviceId];

    setLoadingRoutes((prev) => new Set(prev).add(serviceId));
    try {
      const res = await fetch(`${API_BASE}/api/services/${serviceId}/routes`);
      const data = await res.json();
      if (data.success) {
        setServiceRoutes((prev) => ({ ...prev, [serviceId]: data.routes }));
        return data.routes;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch routes", error);
      return [];
    } finally {
      setLoadingRoutes((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  const toggleServiceExpansion = async (serviceId) => {
    const service = SERVICES.find((s) => s.id === serviceId);

    if (service.type === "brt") {
      // For BRT, directly toggle the single route without expanding
      const routes = await fetchRoutes(serviceId);
      if (routes && routes.length > 0) {
        const route = routes[0];
        setSelectedRoutes((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(route.route_id)) {
            newSet.delete(route.route_id);
          } else {
            newSet.add(route.route_id);
          }
          return newSet;
        });
      }
    } else {
      // For Bus services, toggle expansion
      if (expandedServiceId === serviceId) {
        setExpandedServiceId(null);
      } else {
        setExpandedServiceId(serviceId);
        await fetchRoutes(serviceId);
      }
    }
  };

  const toggleRouteSelection = async (route) => {
    setSelectedRoutes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(route.route_id)) {
        newSet.delete(route.route_id);
      } else {
        newSet.add(route.route_id);
      }
      return newSet;
    });
  };

  // Fetch route stops when routes are selected
  useEffect(() => {
    const fetchStopsForRoutes = async () => {
      // Remove data for unselected routes
      setRoutesData((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((routeId) => {
          if (!selectedRoutes.has(parseInt(routeId))) {
            delete updated[routeId];
          }
        });
        return updated;
      });

      // Fetch stops for newly selected routes
      for (const routeId of selectedRoutes) {
        if (routesData[routeId]) continue; // Already fetched

        try {
          const res = await fetch(`${API_BASE}/api/routes/${routeId}/stops`);
          const data = await res.json();
          if (data.success && data.stops) {
            // Find the service color for this route
            let routeColor = null;
            for (const serviceId in serviceRoutes) {
              const routes = serviceRoutes[serviceId];
              const matchedRoute = routes.find((r) => r.route_id === routeId);
              if (matchedRoute) {
                const service = SERVICES.find(
                  (s) => s.id === parseInt(serviceId),
                );
                if (service) {
                  routeColor = service.color;
                }
                break;
              }
            }

            setRoutesData((prev) => ({
              ...prev,
              [routeId]: { stops: data.stops, color: routeColor },
            }));
          }
        } catch (error) {
          console.error("Failed to fetch stops:", error);
        }
      }
    };

    fetchStopsForRoutes();
  }, [selectedRoutes, serviceRoutes]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-purple-100 selection:text-purple-900 flex flex-col">
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-1000 flex justify-between items-center px-6 py-4 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg border-b border-slate-200/50 dark:border-slate-800/50"
            : "bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
        }`}
      >
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800">
            <img
              src="/ksts_favicon.png"
              className="w-6 h-6 object-contain"
              alt="KSTS Logo"
            />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white hidden sm:block">
            KSTS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/login")}
            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-semibold px-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Login
          </Button>
          <button
            className="md:hidden p-2 text-slate-600 dark:text-slate-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>

      <div className="flex-1 pt-20 flex relative h-[calc(100vh-5rem)] overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
          absolute md:relative inset-y-0 left-0 z-999 bg-white dark:bg-slate-900 
          w-80 shrink-0 shadow-xl border-r border-slate-200 dark:border-slate-800
          transition-transform duration-300 ease-in-out flex flex-col
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          mt-20 md:mt-0 h-[calc(100vh-5rem)] md:h-auto
        `}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-purple-600" /> Route Explorer
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {SERVICES.map((service) => {
              // For BRT, find if its single route is selected
              const isBrtSelected =
                service.type === "brt" &&
                serviceRoutes[service.id]?.some((r) =>
                  selectedRoutes.has(r.route_id),
                );

              return (
                <div key={service.id} className="space-y-1">
                  <button
                    onClick={() => toggleServiceExpansion(service.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 ${
                      // Highlight if any route in this service is selected
                      serviceRoutes[service.id]?.some((r) =>
                        selectedRoutes.has(r.route_id),
                      )
                        ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${SERVICE_TAILWIND_COLORS[service.color] || "bg-slate-500"}`}
                      />
                      {service.name}
                    </span>
                    {service.type === "brt" ? (
                      isBrtSelected ? (
                        <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                      )
                    ) : (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          expandedServiceId === service.id ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Routes List - Only for Bus Services */}
                  {service.type === "bus" &&
                    expandedServiceId === service.id && (
                      <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {loadingRoutes.has(service.id) &&
                        !serviceRoutes[service.id] ? (
                          <div className="p-2 text-sm text-slate-400 italic">
                            Loading routes...
                          </div>
                        ) : (
                          serviceRoutes[service.id]?.map((route) => (
                            <div
                              key={route.route_id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <button
                                onClick={() => toggleRouteSelection(route)}
                                className="flex items-center gap-3 w-full text-left"
                              >
                                {selectedRoutes.has(route.route_id) ? (
                                  <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                )}
                                <span
                                  className={`text-sm ${selectedRoutes.has(route.route_id) ? "text-slate-900 dark:text-white font-medium" : "text-slate-600 dark:text-slate-400"}`}
                                >
                                  {route.route_name}
                                </span>
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Map Area */}
        <div className="flex-1 h-[calc(100vh-5rem)] relative z-0">
          {/* Map Controls - Top Right Corner */}
          <div className="absolute top-4 right-4 z-1000 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showStops"
                checked={showRouteStops}
                onChange={(e) => setShowRouteStops(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-slate-100 border-slate-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
              />
              <label
                htmlFor="showStops"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                Show Stops
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showTrace"
                checked={showRouteTrace}
                onChange={(e) => setShowRouteTrace(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-slate-100 border-slate-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
              />
              <label
                htmlFor="showTrace"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                Show Route Trace
              </label>
            </div>
          </div>

          <MapContainer
            center={[24.8607, 67.0011]}
            zoom={11}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            zoomControl={true}
            attributionControl={false}
          >
            <TileLayer
              key={tileLayerKey}
              attribution=""
              url={
                tileFallbackEnabled || theme !== "dark"
                  ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              }
              subdomains={["a", "b", "c"]}
              eventHandlers={{
                load: handleTileLoad,
                tileerror: handleTileError,
              }}
            />

            {/* Map Bounds Updater */}
            {Object.keys(routesData).length > 0 && (
              <MapBoundsUpdater routesData={routesData} />
            )}

            {/* Render all selected routes */}
            {Object.entries(routesData).map(([routeId, data]) => {
              const { stops, color } = data;
              if (!stops || stops.length === 0) return null;

              return (
                <React.Fragment key={routeId}>
                  {/* Route Trace (Polyline) */}
                  {showRouteTrace && stops.length > 1 && (
                    <Polyline
                      positions={stops.map((stop) => [
                        stop.latitude,
                        stop.longitude,
                      ])}
                      color={COLOR_HEX_MAP[color] || "#6366f1"}
                      weight={5}
                      opacity={0.85}
                    />
                  )}

                  {/* Stop Markers */}
                  {showRouteStops &&
                    stops.map((stop, index) => (
                      <Marker
                        key={`${routeId}-${stop.stop_id}`}
                        position={[stop.latitude, stop.longitude]}
                        icon={createColoredIcon(
                          color,
                          index === 0,
                          index === stops.length - 1,
                        )}
                      >
                        <Popup>
                          <div className="text-sm">
                            <div className="font-bold text-slate-900">
                              {stop.stop_name}
                            </div>
                            <div className="text-xs text-slate-500">
                              Stop #{index + 1}
                            </div>
                          </div>
                        </Popup>
                        <Tooltip
                          direction="top"
                          offset={[0, -20]}
                          opacity={0.9}
                        >
                          <div className="text-xs">
                            <div className="font-semibold">
                              {stop.stop_name}
                            </div>
                            <div className="text-slate-600">
                              Stop #{index + 1}
                            </div>
                          </div>
                        </Tooltip>
                      </Marker>
                    ))}
                </React.Fragment>
              );
            })}

            {tileStatus === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80 text-center p-6">
                <div>
                  <p className="text-white text-lg font-semibold">
                    Map tiles could not load
                  </p>
                  <p className="text-slate-300 text-sm mt-2 max-w-lg">
                    Please check your connection or allow requests to{" "}
                    <span className="font-semibold">
                      {tileErrorHost || "the tile provider"}
                    </span>
                    . VPNs, firewalls, or ad blockers often block map tiles.
                  </p>
                </div>
                <Button
                  onClick={retryTileLoad}
                  className="px-6 bg-white text-slate-900 hover:bg-slate-100"
                >
                  Retry loading map
                </Button>
              </div>
            )}
          </MapContainer>
        </div>
      </div>
      <div className="z-9999">
        <ThemeToggle />
      </div>
    </div>
  );
};

// Helper component to update map bounds when stops change
// eslint-disable-next-line react/prop-types
function MapBoundsUpdater({ routesData }) {
  const map = useMap();

  useEffect(() => {
    const allStops = [];
    Object.values(routesData).forEach((data) => {
      if (data.stops) {
        allStops.push(...data.stops);
      }
    });

    if (allStops.length > 0) {
      const bounds = L.latLngBounds(
        allStops.map((stop) => [stop.latitude, stop.longitude]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routesData, map]);

  return null;
}

// Function to create colored marker icons
function createColoredIcon(color, isStart = false, isEnd = false) {
  const hexColor = COLOR_HEX_MAP[color] || "#6366f1";

  // Use black for start/end markers
  const markerColor = isStart || isEnd ? "#000000" : hexColor;

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${markerColor}" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default RoutesMap;
