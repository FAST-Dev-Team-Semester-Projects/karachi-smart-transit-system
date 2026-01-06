import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Map,
  MapPin,
  Bus,
  ChevronDown,
  Menu,
  X,
  Navigation,
  ArrowRight,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

const ROUTE_LENGTHS = {
  R1: 28,
  R2: 30,
  R3: 31,
  R4: 21,
  R8: 17,
  R9: 42,
  R10: 28,
  R11: 19,
  R12: 31,
  R13: 20,
  EV1: 28,
  EV2: 30,
  EV3: 20,
  EV4: 34,
  EV5: 41,
  P1: 28,
  P2: 30,
  P3: 31,
  P9: 42,
  P10: 28,
  "Green Line BRT": 26,
  "Orange Line BRT": 3.9,
  "Red Line BRT": 27,
  "Yellow Line BRT": 22,
  "Blue Line BRT": 30,
  "Brown Line BRT": 22,
};

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

const SERVICE_COLORS = {
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  teal: "bg-teal-500",
  pink: "bg-pink-500",
};

const PublicRoutes = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState(null);
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll for navbar background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchRoutes = async (serviceId) => {
    try {
      const res = await fetch(`${API_BASE}/api/services/${serviceId}/routes`);
      const data = await res.json();
      if (data.success) {
        return data.routes;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch routes", error);
      return [];
    }
  };

  const fetchStops = async (routeId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/routes/${routeId}/stops`);
      const data = await res.json();
      if (data.success) {
        setStops(data.stops);
      }
    } catch (error) {
      console.error("Failed to fetch stops", error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = async (service) => {
    if (service.type === "brt") {
      // For BRT, fetch routes (expecting 1) and select it immediately
      setLoading(true);
      setSelectedService(service);
      setExpandedServiceId(null);
      const serviceRoutes = await fetchRoutes(service.id);
      setRoutes(serviceRoutes);
      if (serviceRoutes.length > 0) {
        setSelectedRoute(serviceRoutes[0]);
        await fetchStops(serviceRoutes[0].route_id);
      } else {
        setSelectedRoute(null);
        setStops([]);
        setLoading(false);
      }
      setMobileMenuOpen(false);
    } else {
      // For Bus services, toggle expansion
      if (expandedServiceId === service.id) {
        setExpandedServiceId(null);
      } else {
        setExpandedServiceId(service.id);
        setLoading(true);
        const serviceRoutes = await fetchRoutes(service.id);
        setRoutes(serviceRoutes);
        setLoading(false);
      }
    }
  };

  const handleRouteClick = (route, service) => {
    setSelectedService(service);
    setSelectedRoute(route);
    fetchStops(route.route_id);
    setMobileMenuOpen(false);
  };

  // Helper to get route length
  // Matches "R1", "EV1", "P1" etc. from the start of the route name
  const getRouteLength = (routeName) => {
    // Check for BRT service match first
    if (
      selectedService?.type === "brt" &&
      ROUTE_LENGTHS[selectedService.name]
    ) {
      return ROUTE_LENGTHS[selectedService.name];
    }
    // Try exact match
    if (ROUTE_LENGTHS[routeName]) return ROUTE_LENGTHS[routeName];
    // Try matching first part (e.g. "R1 - Route Name" -> "R1")
    const code = routeName.split(" ")[0];
    if (ROUTE_LENGTHS[code]) return ROUTE_LENGTHS[code];
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* Background Gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none -z-10" />

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-4 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg border-b border-slate-200/50 dark:border-slate-800/50"
            : "bg-transparent"
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
          <Button
            onClick={() => navigate("/register")}
            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-semibold px-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Register
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

      <div className="pt-24 w-full max-w-[95%] mx-auto px-4 pb-12 flex flex-col md:flex-row gap-8 h-[calc(100vh-6rem)]">
        {/* Sidebar */}
        <aside
          className={`
          fixed md:relative inset-0 z-40 bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent
          md:w-80 shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:block pt-24 md:pt-0 px-4 md:px-0
        `}
        >
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bus className="w-5 h-5 text-purple-600" /> Transit Services
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {SERVICES.map((service) => (
                <div key={service.id} className="space-y-1">
                  <button
                    onClick={() => handleServiceClick(service)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 ${
                      selectedService?.id === service.id &&
                      service.type === "brt"
                        ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${SERVICE_COLORS[service.color] || "bg-slate-500"}`}
                      />
                      {service.name}
                    </span>
                    {service.type === "bus" && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          expandedServiceId === service.id ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Expanded Routes for Bus Services */}
                  {service.type === "bus" &&
                    expandedServiceId === service.id && (
                      <div className="pl-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {loading && routes.length === 0 ? (
                          <div className="p-2 text-sm text-slate-400 italic">
                            Loading routes...
                          </div>
                        ) : (
                          routes.map((route) => (
                            <button
                              key={route.route_id}
                              onClick={() => handleRouteClick(route, service)}
                              className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-sm text-left transition-all duration-200 ${
                                selectedRoute?.route_id === route.route_id
                                  ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium border-l-2 border-purple-500"
                                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                              {route.route_name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-hidden flex flex-col">
          {selectedRoute ? (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col overflow-hidden animate-in fade-in duration-300">
              {/* Route Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                      <span className="uppercase tracking-wider">
                        {selectedService?.name}
                      </span>
                      {/* <span>•</span>
                      <span>Route #{selectedRoute.route_id}</span> */}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline flex-wrap gap-2">
                      {selectedRoute.route_name}
                      {[3, 4, 5, 6].includes(selectedService?.id) && (
                        <span className="text-2xl font-normal italic opacity-50 text-slate-500 dark:text-slate-400">
                          (Under Construction)
                        </span>
                      )}
                    </h1>
                  </div>
                  {getRouteLength(selectedRoute.route_name) && (
                    <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-orange-500" />
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">
                            Length
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {getRouteLength(selectedRoute.route_name)} km
                          </div>
                        </div>
                      </div>
                      <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-purple-500" />
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase">
                            Stops
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {stops.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stops List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400 gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    Loading stops...
                  </div>
                ) : stops.length > 0 ? (
                  <div className="max-w-4xl mx-auto">
                    <div className="space-y-0">
                      {stops.map((stop, index) => (
                        <div
                          key={stop.stop_id}
                          className="flex items-stretch gap-6 group"
                        >
                          {/* Stop Marker Column */}
                          <div className="flex flex-col items-center w-16 shrink-0 relative">
                            {/* Top Line */}
                            <div
                              className={`w-0.5 flex-1 ${index === 0 ? "bg-transparent" : "bg-slate-200 dark:bg-slate-800"}`}
                            />

                            {/* Dot */}
                            <div
                              className={`relative z-10 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 shadow-sm transition-all duration-300 shrink-0 my-1 ${
                                index === 0
                                  ? "bg-green-500 scale-125"
                                  : index === stops.length - 1
                                    ? "bg-red-500 scale-125"
                                    : "bg-slate-300 dark:bg-slate-600 group-hover:bg-purple-500 group-hover:scale-110"
                              }`}
                            />

                            {/* Bottom Line */}
                            <div
                              className={`w-0.5 flex-1 ${index === stops.length - 1 ? "bg-transparent" : "bg-slate-200 dark:bg-slate-800"}`}
                            />
                          </div>

                          {/* Stop Content */}
                          <div className="flex-1 py-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:border-purple-200 dark:group-hover:border-purple-800 transition-all duration-200">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                                  {stop.stop_name}
                                </h3>
                                <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                                  #{index + 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                {index === 0 && (
                                  <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                    <ArrowRight className="w-3 h-3" /> Start
                                  </span>
                                )}
                                {index === stops.length - 1 && (
                                  <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> End
                                  </span>
                                )}
                                {stop.latitude && stop.longitude && (
                                  <span className="text-xs opacity-60">
                                    {stop.latitude}, {stop.longitude}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-8">
                    <MapPin className="w-12 h-12 mb-4 opacity-20" />
                    <p>No stops found for this route.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Map className="w-10 h-10 text-purple-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Select a Route
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-md">
                Choose a transit service from the sidebar to view its routes and
                stops details.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PublicRoutes;
