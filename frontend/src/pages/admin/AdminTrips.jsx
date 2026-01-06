import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import LiveClock from "../../components/LiveClock";
import {
  Clock,
  Calendar,
  Map as MapIcon,
  Bus,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Edit,
  Plus,
  X,
  Check,
} from "lucide-react";

const toLocalISOSeconds = (date) => {
  if (!(date instanceof Date)) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const AdminTrips = () => {
  const [trips, setTrips] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    route_id: "",
    bus_id: "",
    departure_dt: null,
    direction: "forward",
  });
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, rRes, bRes] = await Promise.all([
        fetch("http://localhost:5000/admin/trips?per_page=300", {
          credentials: "include",
        }),
        fetch("http://localhost:5000/admin/routes?per_page=300", {
          credentials: "include",
        }),
        fetch("http://localhost:5000/admin/buses?per_page=300", {
          credentials: "include",
        }),
      ]);
      if (!tRes.ok) throw new Error("Failed loading trips");
      const tData = await tRes.json();
      const rData = await rRes.json();
      const bData = await bRes.json();
      const rawTrips = Array.isArray(tData)
        ? tData
        : tData.items || tData.trips || [];
      // dedupe by trip_id to avoid duplicate rows caused by backend joins or repeated items
      const tripsMap = new Map();
      rawTrips.forEach((it) => {
        const id = it.trip_id ?? it.id;
        if (id != null) tripsMap.set(String(id), it);
      });
      setTrips(Array.from(tripsMap.values()));
      setRoutes(
        Array.isArray(rData) ? rData : rData.items || rData.routes || [],
      );
      setBuses(Array.isArray(bData) ? bData : bData.items || bData.buses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  const formatLocal = (val) => {
    if (!val) return "-";
    try {
      const d = new Date(val);
      if (!isNaN(d)) return d.toLocaleString();
      // fallback: try treating as UTC by appending Z
      const d2 = new Date(val + "Z");
      if (!isNaN(d2)) return d2.toLocaleString();
      return val;
    } catch {
      return val;
    }
  };

  const createOrUpdate = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate that departure time is in the future
    if (form.departure_dt) {
      const selectedTime = new Date(form.departure_dt);
      const now = new Date();

      if (selectedTime <= now) {
        alert(
          "⚠️ Departure time must be in the future!\n\nCurrent time: " +
            now.toLocaleString() +
            "\nSelected time: " +
            selectedTime.toLocaleString(),
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      let departure_iso = null;
      if (form.departure_dt) {
        departure_iso = toLocalISOSeconds(form.departure_dt);
      }
      const payload = {
        route_id: form.route_id,
        bus_id: form.bus_id,
        departure_time: departure_iso,
        direction: form.direction,
      };
      let res;
      if (editingId) {
        res = await fetch(`http://localhost:5000/admin/trips/${editingId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:5000/admin/trips", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ route_id: "", bus_id: "", departure_dt: null });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const del = async (id) => {
    const obj = typeof id === "object" && id ? id : null;
    const tripId = obj ? obj.trip_id || obj.id : id;
    const prettyRoute = obj ? obj.route_name || obj.route_id : "";
    const prettyBus = obj ? obj.number_plate || obj.bus_id : "";
    const prettyTime = obj
      ? obj.departure_time
        ? formatLocal(obj.departure_time)
        : ""
      : "";
    const pretty =
      prettyRoute || prettyBus
        ? `${prettyRoute} / ${prettyBus} ${prettyTime ? "at " + prettyTime : ""}`
        : tripId;
    if (!confirm(`Delete trip '${pretty}'?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/trips/${tripId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.status !== 204)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading)
    return (
      <div className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
        <Spinner />
        <span>Loading trips...</span>
      </div>
    );
  if (error)
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;

  // Build lookup maps from fetched routes and buses to show human-friendly values
  const routeMap = (routes || []).reduce((acc, it) => {
    const id = it.route_id ?? it.id;
    if (id != null) acc[String(id)] = it.route_name ?? it.name ?? "";
    return acc;
  }, {});
  const busMap = (buses || []).reduce((acc, it) => {
    const id = it.bus_id ?? it.id;
    if (id != null) acc[String(id)] = it.number_plate ?? it.numberPlate ?? "";
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold mb-1 flex items-center gap-3 text-slate-900 dark:text-slate-100 tracking-tight">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span>Trips Management</span>
          </h1>
        </div>
      </div>

      <div className="mb-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="mb-6 p-3 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-blue-900 dark:text-blue-100">
            Current Time:
          </span>{" "}
          <LiveClock className="text-blue-800 dark:text-blue-200 font-mono" />
          <span className="ml-auto text-blue-700 dark:text-blue-300 text-xs bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full">
            Only future times selectable
          </span>
        </div>
        <form
          onSubmit={createOrUpdate}
          className="flex flex-col lg:flex-row gap-4 items-start lg:items-end"
        >
          <div className="w-full lg:w-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Route
              </label>
              <div className="relative">
                <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={form.route_id}
                  onChange={(e) =>
                    setForm({ ...form, route_id: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">Choose route</option>
                  {routes.map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.route_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Bus
              </label>
              <div className="relative">
                <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={form.bus_id}
                  onChange={(e) => setForm({ ...form, bus_id: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">Choose bus</option>
                  {buses.map((b) => (
                    <option key={b.bus_id} value={b.bus_id}>
                      {b.number_plate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Departure Time
              </label>
              <div className="relative datepicker-wrapper">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <DatePicker
                  popperClassName="z-[9999]"
                  portalId="root"
                  selected={form.departure_dt}
                  onChange={(date) => setForm({ ...form, departure_dt: date })}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="Pp"
                  placeholderText="Select date and time"
                  minDate={new Date()}
                  minTime={
                    form.departure_dt &&
                    form.departure_dt.toDateString() ===
                      new Date().toDateString()
                      ? new Date()
                      : new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  maxTime={new Date(new Date().setHours(23, 59, 59, 999))}
                  popperPlacement="bottom-start"
                  filterTime={(time) => {
                    const selectedDate = form.departure_dt || new Date();
                    const isToday =
                      selectedDate.toDateString() === new Date().toDateString();

                    if (isToday) {
                      return time > new Date();
                    }
                    return true;
                  }}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  wrapperClassName="w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end w-full lg:w-auto">
            <div className="space-y-1.5 w-full md:w-auto">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Direction
              </label>
              <div
                className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 cursor-pointer w-full md:w-48 relative h-[42px] border border-slate-200 dark:border-slate-700"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    direction:
                      prev.direction === "forward" ? "backward" : "forward",
                  }))
                }
              >
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-out ${
                    form.direction === "forward"
                      ? "left-1"
                      : "left-[calc(50%+2px)]"
                  }`}
                ></div>
                <div
                  className={`flex-1 flex items-center justify-center gap-2 z-10 text-sm font-medium transition-colors duration-300 ${
                    form.direction === "forward"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-500"
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Forward
                </div>
                <div
                  className={`flex-1 flex items-center justify-center gap-2 z-10 text-sm font-medium transition-colors duration-300 ${
                    form.direction === "backward"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-500"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Backward
                </div>
              </div>
            </div>

            {(() => {
              const isValid =
                String(form.route_id).trim() !== "" &&
                String(form.bus_id).trim() !== "" &&
                form.departure_dt &&
                form.direction;
              return (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="submit"
                    className={`flex-1 md:flex-none h-[42px] px-6 rounded-xl shadow-sm transition-all font-medium flex items-center justify-center gap-2 ${
                      isValid && !isSubmitting
                        ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                    }`}
                    disabled={!isValid || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="text-current" />{" "}
                        Processing...
                      </>
                    ) : editingId ? (
                      <>
                        <Check className="w-4 h-4" /> Update
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Create
                      </>
                    )}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm({
                          route_id: "",
                          bus_id: "",
                          departure_dt: null,
                          direction: "forward",
                        });
                      }}
                      className="h-[42px] px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </form>
      </div>

      <AdminTable
        data={trips}
        columns={[
          { key: "trip_id", label: "ID", sortable: true },
          {
            key: "route",
            label: "Route",
            sortable: true,
            render: (r) => {
              const idPart = r.route_id
                ? String(r.route_id)
                : r.routeId
                  ? String(r.routeId)
                  : "";
              const nameFromRow = r.route_name || r.name || "";
              const lookupName =
                routeMap[String(r.route_id ?? r.routeId)] || "";
              const namePart = nameFromRow || lookupName;
              return idPart && namePart
                ? `${idPart} — ${namePart}`
                : namePart || idPart || "-";
            },
          },
          {
            key: "service_name",
            label: "Service",
            sortable: true,
            render: (r) => r.service_name || "-",
          },
          {
            key: "number_plate",
            label: "Bus",
            sortable: true,
            render: (r) => {
              const bp =
                r.number_plate ||
                r.numberPlate ||
                busMap[String(r.bus_id ?? r.busId)] ||
                "";
              const capacity = r.bus_capacity ? ` (${r.bus_capacity})` : "";
              return bp
                ? `${bp}${capacity}`
                : r.bus_id
                  ? String(r.bus_id)
                  : "-";
            },
          },
          {
            key: "direction",
            label: "Direction",
            sortable: true,
            render: (r) => {
              const dir = r.direction || "forward";
              return dir === "forward" ? "→ Forward" : "← Backward";
            },
          },
          {
            key: "departure_time",
            label: "Departure",
            sortable: true,
            render: (r) => formatLocal(r.departure_time),
          },
          {
            key: "bookings",
            label: "Bookings",
            sortable: true,
            render: (r) => {
              const confirmed = r.confirmed_bookings ?? 0;
              const available = r.available_seats ?? r.bus_capacity ?? 0;
              return `${confirmed} / ${confirmed + available}`;
            },
          },
          {
            key: "status",
            label: "Status",
            sortable: true,
            render: (r) => {
              const statusText = r.status || r.trip_status || "Unknown";
              const statusColors = {
                scheduled:
                  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                running:
                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                completed:
                  "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
                cancelled:
                  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
              };
              const colorClass =
                statusColors[statusText.toLowerCase()] ||
                "bg-gray-100 text-gray-800";
              return (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}
                >
                  {statusText}
                </span>
              );
            },
          },
          {
            key: "actions",
            label: "Actions",
            sortable: false,
            searchable: false,
            render: (r) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingId(r.trip_id);
                    setForm({
                      route_id: r.route_id || "",
                      bus_id: r.bus_id || "",
                      departure_dt: r.departure_time
                        ? new Date(r.departure_time)
                        : null,
                      direction: r.direction || "forward",
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Edit Trip"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => del(r)}
                  className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  title="Delete Trip"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};

export default AdminTrips;
