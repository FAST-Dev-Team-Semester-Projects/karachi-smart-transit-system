import React, { useEffect, useState } from "react";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import {
  Briefcase,
  Plus,
  Save,
  X,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/admin/services?per_page=300",
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed loading services");
      const data = await res.json();
      const svcArr = Array.isArray(data)
        ? data
        : data.items || data.services || [];
      // dedupe by service_id
      const svcMap = new Map();
      svcArr.forEach((it) => {
        const id = it.service_id ?? it.id;
        if (id != null) svcMap.set(String(id), it);
      });
      const uniqueSvc = Array.from(svcMap.values());
      setServices(uniqueSvc);
      setError(null);
    } catch (err) {
      console.error(err.message);
      setError(err.message || "Failed loading services");
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
      const payload = { service_name: form.name };
      let res;
      if (editingId) {
        res = await fetch(`http://localhost:5000/admin/services/${editingId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("http://localhost:5000/admin/services", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ name: "" });
      setEditingId(null);
      load();
    } catch (err) {
      console.error(err.message);
      setError(err.message || "Failed saving service");
    }
  };

  const del = async (id) => {
    const obj = typeof id === "object" && id ? id : null;
    const serviceId = obj ? obj.service_id || obj.id : id;
    const pretty = obj ? obj.service_name || obj.name || serviceId : serviceId;
    if (!confirm(`Delete service '${pretty}'?`)) return;
    try {
      const res = await fetch(
        `http://localhost:5000/admin/services/${serviceId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (res.status !== 204)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      load();
    } catch (err) {
      console.error(err.message);
      setError(err.message || "Failed deleting service");
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
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Services
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Manage service types and metadata
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {editingId ? (
              <>
                <Save className="w-5 h-5 text-blue-500" />
                Edit Service
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-blue-500" />
                Create New Service
              </>
            )}
          </h2>
          <form
            onSubmit={createOrUpdate}
            className="flex flex-col md:flex-row gap-4 items-start md:items-end"
          >
            <div className="w-full md:w-1/2 space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Service Name
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  placeholder="e.g. Red Line BRT"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto pb-0.5">
              {(() => {
                const isValid = form.name.trim() !== "";
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
                    {editingId ? (
                      <>
                        <Save className="w-4 h-4" />
                        Update
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create
                      </>
                    )}
                  </button>
                );
              })()}
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ name: "" });
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
              <p className="animate-pulse">Loading services...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p>{error}</p>
          </div>
        ) : (
          <AdminTable
            data={services}
            columns={[
              {
                key: "service_id",
                label: "ID",
                sortable: true,
                render: (r) => (
                  <span className="font-mono text-xs text-slate-500">
                    {r.service_id}
                  </span>
                ),
              },
              {
                key: "service_name",
                label: "Service Name",
                sortable: true,
                render: (r) => (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {r.service_name || r.name || "-"}
                    </span>
                  </div>
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
                        setEditingId(r.service_id);
                        setForm({ name: r.service_name || r.name || "" });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => del(r)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default AdminServices;
