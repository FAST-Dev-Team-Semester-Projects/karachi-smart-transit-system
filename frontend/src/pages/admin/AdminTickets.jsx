import React, { useState, useEffect } from "react";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import {
  Ticket,
  Search,
  Info,
  CheckCircle,
  XCircle,
  QrCode,
  Calendar,
  User,
  MapPin,
  AlertCircle,
} from "lucide-react";

const AdminTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch("http://localhost:5000/admin/tickets", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter tickets based on search term
  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.route_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.qr_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.booking_status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticket_id?.toString().includes(searchTerm) ||
      ticket.booking_id?.toString().includes(searchTerm),
  );

  // Status badge styling for booking status
  const getStatusBadge = (status) => {
    const styles = {
      confirmed:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || ""}`}
      >
        {status.toUpperCase()}
      </span>
    );
  };

  // Truncate QR code for display
  const truncateQRCode = (qrCode) => {
    if (!qrCode) return "N/A";
    if (qrCode.length <= 20) return qrCode;
    return `${qrCode.substring(0, 10)}...${qrCode.substring(qrCode.length - 7)}`;
  };

  const columns = [
    { key: "ticket_id", label: "Ticket ID" },
    { key: "booking_id", label: "Booking ID" },
    { key: "username", label: "Passenger" },
    { key: "route_name", label: "Route" },
    { key: "seat_number", label: "Seat" },
    {
      key: "qr_code",
      label: "QR Code",
      render: (row) => (
        <span className="font-mono text-xs" title={row.qr_code}>
          {truncateQRCode(row.qr_code)}
        </span>
      ),
    },
    { key: "issue_date", label: "Issue Date" },
    {
      key: "booking_status",
      label: "Status",
      render: (row) => getStatusBadge(row.booking_status),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Spinner size="lg" className="text-blue-600" />
      </div>
    );
  }

  if (error)
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <p>{error}</p>
      </div>
    );

  // Calculate ticket statistics
  const confirmedCount = filteredTickets.filter(
    (t) => t.booking_status === "confirmed",
  ).length;
  const cancelledCount = filteredTickets.filter(
    (t) => t.booking_status === "cancelled",
  ).length;

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              View Tickets
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Monitor ticket issuance and status
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 backdrop-blur-sm border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Read-Only View
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Tickets are automatically generated when bookings are confirmed.
              This page is for viewing and monitoring ticket issuance only.
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Ticket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                Total
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {filteredTickets.length}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total Tickets
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {confirmedCount}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirmed Tickets
            </p>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                Void
              </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
              {cancelledCount}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cancelled Tickets
            </p>
          </div>
        </div>

        {/* Table */}
        <AdminTable
          columns={[
            {
              key: "ticket_id",
              label: "Ticket ID",
              render: (row) => (
                <span className="font-mono text-xs text-slate-500">
                  {row.ticket_id}
                </span>
              ),
            },
            {
              key: "booking_id",
              label: "Booking ID",
              render: (row) => (
                <span className="font-mono text-xs text-slate-500">
                  {row.booking_id}
                </span>
              ),
            },
            {
              key: "username",
              label: "Passenger",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {row.username}
                    </div>
                    {row.full_name && (
                      <div className="text-xs text-slate-500">
                        {row.full_name}
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: "route_name",
              label: "Route",
              render: (row) => (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {row.route_name}
                  </span>
                </div>
              ),
            },
            {
              key: "seat_number",
              label: "Seat",
              render: (row) => (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium">
                  {row.seat_number}
                </span>
              ),
            },
            {
              key: "qr_code",
              label: "QR Code",
              render: (row) => (
                <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                  <QrCode className="w-4 h-4" />
                  <span title={row.qr_code}>{truncateQRCode(row.qr_code)}</span>
                </div>
              ),
            },
            {
              key: "issue_date",
              label: "Issue Date",
              render: (row) => (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-4 h-4" />
                  {row.issue_date}
                </div>
              ),
            },
            {
              key: "booking_status",
              label: "Status",
              render: (row) => getStatusBadge(row.booking_status),
            },
          ]}
          data={tickets}
        />
      </div>
    </div>
  );
};
export default AdminTickets;
