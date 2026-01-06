import React, { useState, useEffect } from "react";
import AdminTable from "../../components/AdminTable";
import {
  CreditCard,
  AlertCircle,
  Info,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch("http://localhost:5000/admin/payments", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch payments");
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  // Format method for display
  const formatMethod = (method) => {
    return method === "recharge_card" ? "Recharge Card" : "Online";
  };

  // Status badge styling
  const getStatusBadge = (status) => {
    const styles = {
      paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || ""}`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  const columns = [
    { key: "payment_id", label: "Payment ID" },
    { key: "booking_id", label: "Booking ID" },
    { key: "username", label: "User" },
    { key: "route_name", label: "Route" },
    {
      key: "amount",
      label: "Amount",
      render: (row) => formatAmount(row.amount),
    },
    {
      key: "method",
      label: "Method",
      render: (row) => formatMethod(row.method),
    },
    { key: "payment_date", label: "Payment Date" },
    {
      key: "status",
      label: "Status",
      render: (row) => getStatusBadge(row.status),
    },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-blue-600" />
          <p className="animate-pulse">Loading payments...</p>
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

  // Calculate payment statistics
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "pending").length;
  const failedCount = payments.filter((p) => p.status === "failed").length;

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Payments
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Monitor payment transactions and status
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Read-Only View
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Payments are processed automatically during the booking flow.
                This page is for viewing and monitoring payment transactions
                only.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Total Amount
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white ml-1">
              {formatAmount(totalAmount)}
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-green-200 dark:border-green-900/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Paid
              </span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 ml-1">
              {paidCount}
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-yellow-200 dark:border-yellow-900/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Pending
              </span>
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 ml-1">
              {pendingCount}
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Failed
              </span>
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 ml-1">
              {failedCount}
            </div>
          </div>
        </div>

        {/* Search & Table */}
        <AdminTable columns={columns} data={payments} />
      </div>
    </div>
  );
};

export default AdminPayments;
