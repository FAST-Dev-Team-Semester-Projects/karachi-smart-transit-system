import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import {
  ClipboardList,
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  AlertCircle,
  User,
  Bus,
  Calendar,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

const toLocalISOSeconds = (date) => {
  if (!(date instanceof Date)) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const AdminDriversAssignments = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    driver_id: "",
    bus_id: "",
    start_time: null,
    end_time: null,
  });
  const [editing, setEditing] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/drivers-assignments?per_page=300`,
        {
          credentials: "include",
        },
      );
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
    // Fetch drivers and buses for dropdowns
    fetch(`${API_BASE}/admin/drivers-assignments/drivers`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setDrivers)
      .catch(() => setDrivers([]));
    fetch(`${API_BASE}/admin/drivers-assignments/buses`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(setBuses)
      .catch(() => setBuses([]));
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
        driver_id: parseInt(form.driver_id),
        bus_id: parseInt(form.bus_id),
        start_time: toLocalISOSeconds(form.start_time),
        end_time: form.end_time ? toLocalISOSeconds(form.end_time) : null,
      };
      let res;
      if (editing) {
        // Update only end_time
        res = await fetch(
          `${API_BASE}/admin/drivers-assignments/${editing.driver_id}/${editing.bus_id}/${encodeURIComponent(editing.start_time)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ end_time: payload.end_time }),
          },
        );
      } else {
        res = await fetch(`${API_BASE}/admin/drivers-assignments`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok)
        throw new Error((await res.json()).error || `HTTP ${res.status}`);
      setForm({ driver_id: "", bus_id: "", start_time: null, end_time: null });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setForm({
      driver_id: item.driver_id,
      bus_id: item.bus_id,
      start_time: item.start_time ? new Date(item.start_time) : null,
      end_time: item.end_time ? new Date(item.end_time) : null,
    });
    setEditing({
      driver_id: item.driver_id,
      bus_id: item.bus_id,
      start_time: item.start_time,
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this assignment?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/admin/drivers-assignments/${item.driver_id}/${item.bus_id}/${encodeURIComponent(item.start_time)}`,
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

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-blue-600" />
          <p className="animate-pulse">Loading assignments...</p>
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
                <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Driver Assignments
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Assign drivers to buses and schedule shifts
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200 font-medium">
            {editing ? (
              <>
                <Edit className="w-5 h-5 text-blue-500" />
                <span>Edit Assignment</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-green-500" />
                <span>New Assignment</span>
              </>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-4 items-start md:items-end flex-wrap"
          >
            <div className="w-full md:w-1/5 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Driver
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={form.driver_id}
                  onChange={(e) =>
                    setForm({ ...form, driver_id: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none disabled:opacity-50"
                  disabled={editing}
                >
                  <option value="">Select Driver...</option>
                  {drivers.map((d) => (
                    <option key={d.driver_id} value={d.driver_id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full md:w-1/5 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Bus
              </label>
              <div className="relative">
                <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  value={form.bus_id}
                  onChange={(e) => setForm({ ...form, bus_id: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none disabled:opacity-50"
                  disabled={editing}
                >
                  <option value="">Select Bus...</option>
                  {buses.map((b) => (
                    <option key={b.bus_id} value={b.bus_id}>
                      {b.number_plate}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="w-full md:w-1/5 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Start Time
              </label>
              <div className="relative datepicker-wrapper">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <DatePicker
                  popperClassName="z-[9999]"
                  portalId="root"
                  selected={form.start_time}
                  onChange={(date) => setForm({ ...form, start_time: date })}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="Pp"
                  placeholderText="Select start time"
                  popperPlacement="bottom-start"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none disabled:opacity-50"
                  wrapperClassName="w-full"
                  disabled={!!editing}
                />
              </div>
            </div>

            <div className="w-full md:w-1/5 space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                End Time
              </label>
              <div className="relative datepicker-wrapper">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                <DatePicker
                  popperClassName="z-[9999]"
                  portalId="root"
                  selected={form.end_time}
                  onChange={(date) => setForm({ ...form, end_time: date })}
                  showTimeSelect
                  timeIntervals={15}
                  dateFormat="Pp"
                  placeholderText="Select end time"
                  popperPlacement="bottom-start"
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                  wrapperClassName="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto pb-0.5">
              <button
                type="submit"
                disabled={!form.driver_id || !form.bus_id || !form.start_time}
                className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {editing ? (
                  <>
                    <Save className="w-4 h-4" /> Update
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Create
                  </>
                )}
              </button>

              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setForm({
                      driver_id: "",
                      bus_id: "",
                      start_time: "",
                      end_time: "",
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
          data={items}
          columns={[
            {
              key: "driver_name",
              label: "Driver",
              sortable: true,
              render: (row) => (
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {row.driver_name || "N/A"}
                </div>
              ),
            },
            {
              key: "number_plate",
              label: "Bus",
              sortable: true,
              render: (row) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  {row.number_plate || "N/A"}
                </span>
              ),
            },
            {
              key: "start_time",
              label: "Start Time",
              sortable: true,
              render: (row) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(row.start_time).toLocaleString()}
                </span>
              ),
            },
            {
              key: "end_time",
              label: "End Time",
              sortable: true,
              render: (row) => (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {row.end_time ? new Date(row.end_time).toLocaleString() : "-"}
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
                    onClick={() => handleEdit(r)}
                    className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title="Edit Assignment"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete Assignment"
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

export default AdminDriversAssignments;
