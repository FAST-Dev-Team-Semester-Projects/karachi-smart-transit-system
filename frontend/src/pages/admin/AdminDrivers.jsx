import React, { useEffect, useState } from "react";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import {
  User,
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  CreditCard,
  Phone,
} from "lucide-react";

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    full_name: "",
    license_number: "",
    phone_number: "",
  });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/admin/drivers?per_page=300",
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawDrivers = Array.isArray(data)
        ? data
        : data.items || data.drivers || [];
      // dedupe by driver_id
      const driverMap = new Map();
      rawDrivers.forEach((it) => {
        const id = it.driver_id ?? it.id;
        if (id != null) driverMap.set(String(id), it);
      });
      setDrivers(Array.from(driverMap.values()));
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
        full_name: form.full_name,
        license_number: form.license_number,
        phone_number: form.phone_number || null,
      };

      let res;
      if (editingId) {
        // Update
        res = await fetch(`http://localhost:5000/admin/drivers/${editingId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
        res = await fetch("http://localhost:5000/admin/drivers", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ full_name: "", license_number: "", phone_number: "" });
      setEditingId(null);
      load();
    } catch (err) {
      console.error(err.message);
    }
  };

  const del = async (id) => {
    // accept either id or full row object
    const driverObj = typeof id === "object" && id ? id : null;
    const driverId = driverObj ? driverObj.driver_id || driverObj.id : id;
    const pretty = driverObj
      ? driverObj.full_name || driverObj.license_number || driverId
      : driverId;
    if (!confirm(`Delete driver '${pretty}'?`)) return;
    try {
      const res = await fetch(
        `http://localhost:5000/admin/drivers/${driverId}`,
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
    }
  };

  const edit = (driverObj) => {
    const id = driverObj.driver_id ?? driverObj.id;
    setEditingId(id);
    setForm({
      full_name: driverObj.full_name || "",
      license_number: driverObj.license_number || "",
      phone_number: driverObj.phone_number || "",
    });
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Drivers
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Manage driver profiles and licenses
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200 font-medium">
            {editingId ? (
              <>
                <Edit className="w-5 h-5 text-blue-500" />
                <span>Edit Driver</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-green-500" />
                <span>Add New Driver</span>
              </>
            )}
          </div>

          <form
            onSubmit={createOrUpdate}
            className="flex flex-col md:flex-row gap-4 items-start md:items-end"
          >
            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  placeholder="e.g. John Doe"
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                License Number
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  placeholder="e.g. LIC-12345678"
                  value={form.license_number}
                  onChange={(e) =>
                    setForm({ ...form, license_number: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="w-full md:w-1/3 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  placeholder="e.g. +92 300 1234567"
                  value={form.phone_number}
                  onChange={(e) =>
                    setForm({ ...form, phone_number: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto pb-0.5">
              <button
                type="submit"
                disabled={!form.full_name.trim() || !form.license_number.trim()}
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
                    setForm({
                      full_name: "",
                      license_number: "",
                      phone_number: "",
                    });
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
          data={drivers}
          columns={[
            { key: "driver_id", label: "ID", sortable: true },
            { key: "full_name", label: "Full Name", sortable: true },
            { key: "license_number", label: "License Number", sortable: true },
            { key: "phone_number", label: "Phone Number", sortable: true },
            {
              key: "actions",
              label: "Actions",
              sortable: false,
              searchable: false,
              render: (r) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => edit(r)}
                    className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title="Edit Driver"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => del(r)}
                    className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete Driver"
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

export default AdminDrivers;
