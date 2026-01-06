import React, { useEffect, useState } from "react";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import {
  Bus,
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  AlertCircle,
  Hash,
  Users,
} from "lucide-react";

const AdminBuses = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ number_plate: "", capacity: "" });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/admin/buses?per_page=300",
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawBuses = Array.isArray(data)
        ? data
        : data.items || data.buses || [];
      // dedupe by bus_id
      const busMap = new Map();
      rawBuses.forEach((it) => {
        const id = it.bus_id ?? it.id;
        if (id != null) busMap.set(String(id), it);
      });
      setBuses(Array.from(busMap.values()));
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

  const createOrUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        number_plate: form.number_plate,
        capacity: parseInt(form.capacity || 0),
      };

      let res;
      if (editingId) {
        // Update
        res = await fetch(`http://localhost:5000/admin/buses/${editingId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        res = await fetch("http://localhost:5000/admin/buses", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ number_plate: "", capacity: "" });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const del = async (id) => {
    // accept either id or full row object
    const busObj = typeof id === "object" && id ? id : null;
    const busId = busObj ? busObj.bus_id || busObj.id : id;
    const pretty = busObj
      ? busObj.number_plate || busObj.numberPlate || busId
      : busId;
    if (!confirm(`Delete bus '${pretty}'?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/buses/${busId}`, {
        method: "DELETE",
        credentials: "include",
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
      <div className="flex items-center justify-center min-h-[400px] text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-blue-600" />
          <p className="animate-pulse">Loading buses...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <p>{error}</p>
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
                <Bus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Buses
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Manage vehicle fleet and capacities
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200 font-medium">
            {editingId ? (
              <>
                <Edit className="w-5 h-5 text-blue-500" />
                <span>Edit Bus</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-green-500" />
                <span>Add New Bus</span>
              </>
            )}
          </div>

          <form
            onSubmit={createOrUpdate}
            className="flex flex-col md:flex-row gap-4 items-start md:items-end"
          >
            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Number Plate
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  placeholder="e.g. ABC-1234"
                  value={form.number_plate}
                  onChange={(e) =>
                    setForm({ ...form, number_plate: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="w-full md:w-1/4 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Capacity
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="number"
                  placeholder="e.g. 40"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto pb-0.5">
              <button
                type="submit"
                disabled={
                  !form.number_plate.trim() || !String(form.capacity).trim()
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
                    setForm({ number_plate: "", capacity: "" });
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
          data={buses}
          columns={[
            { key: "bus_id", label: "ID", sortable: true },
            {
              key: "number_plate",
              label: "Number Plate",
              sortable: true,
              render: (r) => (
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {r.number_plate}
                </div>
              ),
            },
            {
              key: "capacity",
              label: "Capacity",
              sortable: true,
              render: (r) => (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Users className="w-3 h-3" />
                  {r.capacity}
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
                      setEditingId(r.bus_id || r.id);
                      setForm({
                        number_plate: r.number_plate || "",
                        capacity: r.capacity != null ? String(r.capacity) : "",
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title="Edit Bus"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => del(r)}
                    className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete Bus"
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

export default AdminBuses;
