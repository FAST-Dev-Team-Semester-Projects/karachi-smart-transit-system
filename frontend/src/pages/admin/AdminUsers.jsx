import React, { useEffect, useState } from "react";
import AdminTable from "../../components/AdminTable";
import { validate, required, minLength, isEmail } from "../../utils/validation";
import { Spinner } from "@/components/ui/spinner";
import {
  User,
  Plus,
  Save,
  X,
  Edit,
  Trash2,
  AlertCircle,
  Mail,
  Phone,
  Lock,
  Shield,
  UserCircle,
} from "lucide-react";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
    role: "passenger",
  });
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showPasswordField, setShowPasswordField] = useState(true);
  const [submittingDisabled, setSubmittingDisabled] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://localhost:5000/admin/users?per_page=300",
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // backend returns paginated { items, total, page, per_page }
      const rawUsers = Array.isArray(data)
        ? data
        : data.items || data.users || [];
      // dedupe by user_id
      const userMap = new Map();
      rawUsers.forEach((it) => {
        const id = it.user_id ?? it.id;
        if (id != null) userMap.set(String(id), it);
      });
      setUsers(Array.from(userMap.values()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Disable submit until form valid according to same rules used on submit
  const isUserFormValid = () => {
    const rules = editingId
      ? {
          username: [required, minLength(3)],
          full_name: required,
          email: [required, isEmail],
          ...(showPasswordField ? { password: required } : {}),
        }
      : {
          username: [required, minLength(3)],
          full_name: required,
          email: [required, isEmail],
          password: required,
        };
    const errs = validate(form, rules);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    setSubmittingDisabled(!isUserFormValid());
  }, [form, editingId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingId) {
      const rules = {
        username: [required, minLength(3)],
        full_name: required,
        email: [required, isEmail],
        password: required,
      };
      const errs = validate(form, rules);
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;
      try {
        const res = await fetch("http://localhost:5000/admin/users", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        await res.json();
        setForm({
          username: "",
          full_name: "",
          email: "",
          password: "",
          phone_number: "",
          role: "passenger",
        });
        load();
      } catch (err) {
        setError(err.message);
      }
    } else {
      // Update existing user
      const payload = {
        username: form.username,
        full_name: form.full_name,
        email: form.email,
        phone_number: form.phone_number,
        role: form.role,
      };
      if (form.password) payload.password = form.password; // only send if provided
      try {
        const res = await fetch(
          `http://localhost:5000/admin/users/${editingId}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        await res.json();
        setForm({
          username: "",
          full_name: "",
          email: "",
          password: "",
          phone_number: "",
          role: "passenger",
        });
        setEditingId(null);
        setErrors({});
        load();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  const handleDelete = async (id) => {
    // Backwards-compatible: accept either id or whole user object
    const userObj = typeof id === "object" && id ? id : null;
    const userId = userObj ? userObj.user_id || userObj.id : id;
    const pretty = userObj
      ? userObj.username || userObj.full_name || userId
      : userId;

    if (!confirm(`Delete user '${pretty}'?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (r) => {
    setEditingId(r.user_id || r.id);
    setForm({
      username: r.username || "",
      full_name: r.full_name || "",
      email: r.email || "",
      password: "",
      phone_number: r.phone_number || "",
      role: r.role || "passenger",
    });
    setShowPasswordField(false);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      username: "",
      full_name: "",
      email: "",
      password: "",
      phone_number: "",
      role: "passenger",
    });
    setErrors({});
    setShowPasswordField(true);
  };

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
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Users
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Manage registered users and roles
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200 font-medium">
            {editingId ? (
              <>
                <Edit className="w-5 h-5 text-blue-500" />
                <span>Edit User</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 text-green-500" />
                <span>Add New User</span>
              </>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {/* Username */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Username
              </label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  placeholder="e.g. jdoe"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border ${
                    errors.username
                      ? "border-red-500"
                      : "border-slate-200 dark:border-slate-700"
                  } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none`}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-500 ml-1">{errors.username}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
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
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border ${
                    errors.full_name
                      ? "border-red-500"
                      : "border-slate-200 dark:border-slate-700"
                  } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none`}
                />
              </div>
              {errors.full_name && (
                <p className="text-xs text-red-500 ml-1">{errors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  placeholder="e.g. user@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border ${
                    errors.email
                      ? "border-red-500"
                      : "border-slate-200 dark:border-slate-700"
                  } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 ml-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                  Password
                </label>
                {editingId && (
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPasswordField}
                      onChange={(e) => {
                        setShowPasswordField(e.target.checked);
                        if (!e.target.checked)
                          setForm({ ...form, password: "" });
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Change password
                  </label>
                )}
              </div>

              {(!editingId || showPasswordField) && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required={!editingId}
                    type="password"
                    placeholder={editingId ? "New password" : "Password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border ${
                      errors.password
                        ? "border-red-500"
                        : "border-slate-200 dark:border-slate-700"
                    } rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none`}
                  />
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-red-500 ml-1">{errors.password}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Phone
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

            {/* Role */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                Role
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none appearance-none"
                >
                  <option value="passenger">Passenger</option>
                  <option value="admin">Admin</option>
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

            {/* Actions */}
            <div className="md:col-span-2 lg:col-span-3 flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={submittingDisabled}
                className="flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {editingId ? (
                  <>
                    <Save className="w-4 h-4" /> Update User
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Create User
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
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
          data={users}
          columns={[
            { key: "user_id", label: "ID", sortable: true },
            {
              key: "username",
              label: "Username",
              sortable: true,
              render: (r) => (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                    {r.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {r.username}
                  </span>
                </div>
              ),
            },
            { key: "full_name", label: "Full Name", sortable: true },
            { key: "email", label: "Email", sortable: true },
            { key: "phone_number", label: "Phone", sortable: true },
            {
              key: "role",
              label: "Role",
              sortable: true,
              render: (r) => (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    r.role === "admin"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                      : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  }`}
                >
                  {r.role}
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
                    onClick={() => startEdit(r)}
                    className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    title="Edit User"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Delete User"
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

export default AdminUsers;
