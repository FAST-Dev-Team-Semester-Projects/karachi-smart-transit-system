import React, { useEffect, useState } from "react";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import { Map as MapIcon, Plus, Save, X, Edit, Trash2 } from "lucide-react";

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ route_name: "", service_id: "" });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch("http://localhost:5000/admin/routes?per_page=300", {
          credentials: "include",
        }),
        fetch("http://localhost:5000/admin/services?per_page=300", {
          credentials: "include",
        }),
      ]);
      if (!rRes.ok) throw new Error("Failed loading routes");
      if (!sRes.ok) throw new Error("Failed loading services");
      const rData = await rRes.json();
      const sData = await sRes.json();
      const rawRoutes = Array.isArray(rData)
        ? rData
        : rData.items || rData.routes || [];
      // dedupe by route_id
      const routeMap = new Map();
      rawRoutes.forEach((it) => {
        const id = it.route_id ?? it.id;
        if (id != null) routeMap.set(String(id), it);
      });
      setRoutes(Array.from(routeMap.values()));
      const svcArr = Array.isArray(sData)
        ? sData
        : sData.items || sData.services || [];
      setServices(svcArr);
    } catch (err) {
      console.error(err.message);
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

  const createOrUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        route_name: form.route_name,
        service_id: form.service_id,
      };
      let res;
      if (editingId) {
        res = await fetch(`http://localhost:5000/admin/routes/${editingId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:5000/admin/routes", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ route_name: "", service_id: "" });
      setEditingId(null);
      load();
    } catch (err) {
      console.error(err.message);
    }
  };

  const del = async (id) => {
    // accept id or row
    const obj = typeof id === "object" && id ? id : null;
    const routeId = obj ? obj.route_id || obj.id : id;
    const pretty = obj ? obj.route_name || obj.name || routeId : routeId;
    if (!confirm(`Delete route '${pretty}'?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/routes/${routeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status !== 204)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      load();
    } catch (err) {
      console.error(err.message);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-blue-600" />
          <p className="animate-pulse">Loading routes...</p>
        </div>
      </div>
    );

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <MapIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Routes
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Manage route definitions and service mapping
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200 font-medium">
            {editingId ? (
              <>
                <Edit className="w-5 h-5 text-blue-500" />
                <span>Edit Route</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-green-500" />
                <span>Add New Route</span>
              </>
            )}
          </div>

          <form
            onSubmit={createOrUpdate}
            className="flex flex-col md:flex-row gap-4 items-start md:items-end"
          >
            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Route Name
              </label>
              <div className="relative">
                <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  placeholder="e.g. Blue Line Express"
                  value={form.route_name}
                  onChange={(e) =>
                    setForm({ ...form, route_name: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Service
              </label>
              <div className="relative">
                <select
                  required
                  value={form.service_id}
                  onChange={(e) =>
                    setForm({ ...form, service_id: e.target.value })
                  }
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                >
                  <option value="">Select Service...</option>
                  {services.map((s) => (
                    <option key={s.service_id} value={s.service_id}>
                      {s.service_name || s.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto pb-0.5">
              <button
                type="submit"
                disabled={
                  !form.route_name.trim() || !String(form.service_id).trim()
                }
                className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {editingId ? (
                  <>
                    <Save className="w-4 h-4" /> Update
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
                    setForm({ route_name: "", service_id: "" });
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Table Card */}
        <AdminTable
          data={routes}
          columns={[
            { key: "route_id", label: "ID", sortable: true },
            {
              key: "route_name",
              label: "Route Name",
              sortable: true,
              render: (r) => (
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {r.route_name}
                </div>
              ),
            },
            {
              key: "service_name",
              label: "Service Name",
              sortable: true,
              render: (r) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {r.service_name || r.service_id}
                </span>
              ),
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
                      setEditingId(r.route_id);
                      setForm({
                        route_name: r.route_name || "",
                        service_id: r.service_id || "",
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title="Edit Route"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => del(r)}
                    className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete Route"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};

export default AdminRoutes;
