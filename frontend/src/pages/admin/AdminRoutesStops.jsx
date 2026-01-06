import React, { useEffect, useState } from "react";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import {
  Link as LinkIcon,
  MapPin,
  Navigation,
  Plus,
  Save,
  X,
  AlertCircle,
  ArrowRight,
  Edit,
  Trash2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const AdminRoutesStops = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    route_id: "",
    stop_id: "",
    stop_order: "",
  });
  const [editing, setEditing] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/routes-stops?per_page=300`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Fetch routes and stops for dropdowns
    fetch(`${API_BASE}/admin/routes-stops/routes`, { credentials: "include" })
      .then((res) => res.json())
      .then(setRoutes)
      .catch(() => setRoutes([]));
    fetch(`${API_BASE}/admin/routes-stops/stops`, { credentials: "include" })
      .then((res) => res.json())
      .then(setStops)
      .catch(() => setStops([]));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        route_id: parseInt(form.route_id),
        stop_id: parseInt(form.stop_id),
        stop_order: parseInt(form.stop_order),
      };
      let res;
      if (editing) {
        // Update only stop_order
        res = await fetch(
          `${API_BASE}/admin/routes-stops/${editing.route_id}/${editing.stop_id}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stop_order: payload.stop_order }),
          },
        );
      } else {
        res = await fetch(`${API_BASE}/admin/routes-stops`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ route_id: "", stop_id: "", stop_order: "" });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setForm({
      route_id: item.route_id,
      stop_id: item.stop_id,
      stop_order: item.stop_order,
    });
    setEditing({ route_id: item.route_id, stop_id: item.stop_id });
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this mapping?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/admin/routes-stops/${item.route_id}/${item.stop_id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (res.status !== 204 && !res.ok) {
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <LinkIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Route-Stop Mappings
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Manage the sequence of stops for each route
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {editing ? (
              <>
                <Save className="w-5 h-5 text-blue-500" />
                Edit Mapping
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-blue-500" />
                Add New Mapping
              </>
            )}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4 items-start md:items-end"
          >
            <div className="w-full md:w-1/3 space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Route
              </label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={form.route_id}
                  onChange={(e) =>
                    setForm({ ...form, route_id: e.target.value })
                  }
                  disabled={!!editing}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="">Select Route</option>
                  {routes.map((r) => (
                    <option key={r.route_id} value={r.route_id}>
                      {r.route_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full md:w-1/3 space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Stop
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={form.stop_id}
                  onChange={(e) =>
                    setForm({ ...form, stop_id: e.target.value })
                  }
                  disabled={!!editing}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="">Select Stop</option>
                  {stops.map((s) => (
                    <option key={s.stop_id} value={s.stop_id}>
                      {s.stop_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full md:w-1/4 space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Stop Order
              </label>
              <div className="relative">
                <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="number"
                  placeholder="Order"
                  value={form.stop_order}
                  onChange={(e) =>
                    setForm({ ...form, stop_order: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto pb-0.5">
              {(() => {
                const isValid =
                  String(form.route_id).trim() !== "" &&
                  String(form.stop_id).trim() !== "" &&
                  String(form.stop_order).trim() !== "";
                return (
                  <button
                    type="submit"
                    disabled={!isValid}
                    className={`px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2 ${
                      isValid
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {editing ? (
                      <>
                        <Save className="w-4 h-4" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add
                      </>
                    )}
                  </button>
                );
              })()}
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({ route_id: "", stop_id: "", stop_order: "" });
                  }}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px] text-slate-600 dark:text-slate-400">
            <div className="flex flex-col items-center gap-4">
              <Spinner className="w-8 h-8 text-blue-600" />
              <p className="animate-pulse">Loading route-stop mappings...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p>{error}</p>
          </div>
        ) : (
          <AdminTable
            columns={[
              {
                key: "route_id",
                label: "Route ID",
                render: (row) => (
                  <span className="font-mono text-xs">{row.route_id}</span>
                ),
              },
              {
                key: "route_name",
                label: "Route Name",
                render: (row) => {
                  const r = routes.find(
                    (r) => String(r.route_id) === String(row.route_id),
                  );
                  return (
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {r ? r.route_name : row.route_id}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "stop_id",
                label: "Stop ID",
                render: (row) => (
                  <span className="font-mono text-xs">{row.stop_id}</span>
                ),
              },
              {
                key: "stop_name",
                label: "Stop Name",
                render: (row) => {
                  const s = stops.find(
                    (s) => String(s.stop_id) === String(row.stop_id),
                  );
                  return (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="text-slate-700 dark:text-slate-300">
                        {s ? s.stop_name : row.stop_id}
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "stop_order",
                label: "Order",
                render: (row) => (
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-sm">
                    {row.stop_order}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(row)}
                      className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={items}
          />
        )}
      </div>
    </div>
  );
};

export default AdminRoutesStops;
