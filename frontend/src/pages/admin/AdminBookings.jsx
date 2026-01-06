import React, { useState, useEffect } from "react";
import AdminTable from "../../components/AdminTable";
import { Spinner } from "@/components/ui/spinner";
import { Ticket, AlertCircle, Info } from "lucide-react";

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch("http://localhost:5000/admin/bookings", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch bookings");
      const data = await response.json();
      
      // DEBUG: Log the first booking to see the exact format from backend
      if (data.bookings && data.bookings.length > 0) {
        console.log('=== FIRST BOOKING RAW DATA ===');
        console.log('Full booking:', JSON.stringify(data.bookings[0], null, 2));
        console.log('booking_date value:', data.bookings[0].booking_date);
        console.log('booking_date type:', typeof data.bookings[0].booking_date);
      }
      
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      let dateString = String(dateStr);
      
      // Check if it's HTTP/GMT format (e.g., "Mon, 01 Dec 2025 20:52:50 GMT")
      // The backend incorrectly serializes PKT times as GMT, so we need to adjust
      if (dateString.includes('GMT')) {
        // Parse the GMT string (browser treats it as UTC)
        const utcDate = new Date(dateString);
        
        if (!isNaN(utcDate.getTime())) {
          // The database stores PKT (UTC+5), but backend sent it as GMT
          // So we need to subtract 5 hours to get back to the original PKT time
          const pktDate = new Date(utcDate.getTime() - (5 * 60 * 60 * 1000));
          console.log('GMT parsed:', utcDate, '→ Adjusted to PKT:', pktDate, '→ Display:', pktDate.toLocaleString());
          return pktDate.toLocaleString();
        }
      }
      
      // Parse MySQL datetime format: "YYYY-MM-DD HH:MM:SS"
      const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
      
      if (match) {
        const [, year, month, day, hour, min, sec] = match;
        const d = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(min),
          parseInt(sec)
        );
        
        if (!isNaN(d.getTime())) {
          return d.toLocaleString();
        }
      }
      
      // Fallback: try standard parsing
      const d = new Date(dateString);
      if (!isNaN(d)) return d.toLocaleString();
      
      return dateStr;
    } catch (error) {
      console.error('Date parsing error:', error, 'for value:', dateStr);
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (amount == null) return "-";
    return `Rs. ${Number(amount).toFixed(2)}`;
  };

  const columns = [
    { key: "booking_id", label: "ID", sortable: true },
    {
      key: "passenger_name",
      label: "Passenger",
      sortable: true,
      render: (row) => row.passenger_name || row.username || "-",
    },
    {
      key: "route_name",
      label: "Route",
      sortable: true,
    },
    {
      key: "service_name",
      label: "Service",
      sortable: true,
      render: (row) => row.service_name || "-",
    },
    {
      key: "seat_number",
      label: "Seat",
      sortable: true,
    },
    {
      key: "trip_direction",
      label: "Direction",
      sortable: true,
      render: (row) => {
        const dir = row.direction || "forward";
        return dir === "forward" ? "→ Forward" : "← Backward";
      },
    },
    {
      key: "origin_stop_name",
      label: "From",
      sortable: true,
    },
    {
      key: "destination_stop_name",
      label: "To",
      sortable: true,
    },
    {
      key: "fare_amount",
      label: "Fare",
      sortable: true,
      render: (row) => formatCurrency(row.fare_amount),
    },
    {
      key: "payment_status",
      label: "Payment",
      sortable: true,
      render: (row) => {
        const status = row.payment_status || "pending";
        const statusColors = {
          paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          pending:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        };
        const colorClass =
          statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Booking Status",
      sortable: true,
      render: (row) => {
        const status = row.status || row.booking_status || "unknown";
        const statusColors = {
          confirmed:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          cancelled:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          pending:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        };
        const colorClass =
          statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      key: "booking_date",
      label: "Booked At",
      sortable: true,
      render: (row) => formatDateTime(row.booking_date),
    },
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8 text-blue-600" />
          <p className="animate-pulse">Loading bookings...</p>
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
                <Ticket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Bookings
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              View passenger bookings and payment status
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
                Bookings are created by passengers through the booking system.
                This page displays comprehensive booking details including
                payment status and trip information.
              </p>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <AdminTable columns={columns} data={bookings} />
      </div>
    </div>
  );
};

export default AdminBookings;
