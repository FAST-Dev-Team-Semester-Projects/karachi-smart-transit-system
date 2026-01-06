import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Spinner } from "@/components/ui/spinner";
import PropTypes from "prop-types";
import {
  BarChart3,
  TrendingUp,
  Users,
  Bus,
  CreditCard,
  Calendar,
  RefreshCw,
  Activity,
  AlertCircle,
  Search,
  Filter,
  CheckCircle2,
  DollarSign,
  Ticket,
  Map,
  Clock,
  Zap,
  MapPin,
} from "lucide-react";

const StatCard = ({ title, value, subtitle, icon, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    green:
      "bg-green-50/50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    purple:
      "bg-purple-50/50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    orange:
      "bg-orange-50/50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    red: "bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
    indigo:
      "bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  };

  return (
    <div
      className={`p-5 rounded-2xl border ${colorClasses[color]} backdrop-blur-sm transition-all hover:shadow-md hover:scale-[1.02] duration-200`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wider">
          {title}
        </h3>
        <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20 shadow-sm">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold mb-1 tracking-tight">{value}</div>
      {subtitle && (
        <div className="text-xs font-medium opacity-70">{subtitle}</div>
      )}
    </div>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node.isRequired,
  color: PropTypes.oneOf([
    "blue",
    "green",
    "purple",
    "orange",
    "red",
    "indigo",
  ]),
};

const AdminReports = () => {
  const [dashboard, setDashboard] = useState(null);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [activeTab, setActiveTab] = useState("overview");

  // State for stored procedures (DB Functions tab)
  const [tripId, setTripId] = useState("");
  const [dailyAnalytics, setDailyAnalytics] = useState(null);
  const [tripRevenue, setTripRevenue] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch dashboard overview on mount
  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const qparams = new URLSearchParams();
      if (dateRange.from) {
        qparams.append("from", dateRange.from.toISOString().split("T")[0]);
      }
      if (dateRange.to) {
        qparams.append("to", dateRange.to.toISOString().split("T")[0]);
      }
      const res = await fetch(
        `http://localhost:5000/admin/reports/dashboard?${qparams.toString()}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || "Failed to fetch dashboard");
      }

      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async (endpoint) => {
    setLoading(true);
    setError(null);
    try {
      const qparams = new URLSearchParams();
      
      // Helper to format date as YYYY-MM-DDTHH:mm:ss in local time
      const toLocalISOString = (date, timeStr) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T${timeStr}`;
      };

      if (dateRange.from) {
        qparams.set(
          "start_date",
          toLocalISOString(dateRange.from, "00:00:00")
        );
      }
      if (dateRange.to) {
        qparams.set(
          "end_date",
          toLocalISOString(dateRange.to, "23:59:59")
        );
      }

      const res = await fetch(
        `http://localhost:5000/admin/reports/${endpoint}?${qparams.toString()}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || "Failed to fetch report");
      }

      const data = await res.json();
      setActiveReport(data);
    } catch (err) {
      setError(err.message);
      setActiveReport(null);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    fetchDashboard();
    if (activeTab !== "overview" && activeTab !== "functions") {
      const reportMap = {
        revenue: "revenue/daily",
        bookings: "bookings/daily",
        routes: "route-performance",
      };
      if (reportMap[activeTab]) {
        fetchReport(reportMap[activeTab]);
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveReport(null);
    setError(null);

    const reportMap = {
      revenue: "revenue/daily",
      bookings: "bookings/daily",
      routes: "route-performance",
    };

    if (reportMap[tab]) {
      fetchReport(reportMap[tab]);
    }
  };

  return (
    <div className="relative min-h-screen space-y-6">
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Analytics Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 ml-14">
              Comprehensive insights into your transit system performance
            </p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium mr-2">
              <Filter className="w-4 h-4" />
              <span>Filter by date:</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 relative z-20">
              <Calendar className="w-4 h-4 text-slate-400 z-10" />
              <DatePicker
                popperClassName="z-[9999]"
                portalId="root"
                selected={dateRange.from}
                onChange={(date) => setDateRange({ ...dateRange, from: date })}
                placeholderText="Start Date"
                popperPlacement="bottom-start"
                className="bg-transparent border-none text-sm text-slate-900 dark:text-slate-100 focus:outline-none w-24"
              />
            </div>
            <span className="text-slate-400">to</span>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 relative">
              <Calendar className="w-4 h-4 text-slate-400 pointer-events-none z-10" />
              <DatePicker
                popperClassName="z-[9999]"
                portalId="root"
                selected={dateRange.to}
                onChange={(date) => setDateRange({ ...dateRange, to: date })}
                placeholderText="End Date"
                popperPlacement="bottom-start"
                className="bg-transparent border-none text-sm text-slate-900 dark:text-slate-100 focus:outline-none w-24"
              />
            </div>
            <button
              onClick={applyDateFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm shadow-sm shadow-blue-600/20 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Apply Filter
            </button>
            {(dateRange.from || dateRange.to) && (
              <button
                onClick={() => {
                  setDateRange({ from: "", to: "" });
                  setTimeout(() => {
                    fetchDashboard();
                    if (activeTab !== "overview" && activeTab !== "functions")
                      handleTabChange(activeTab);
                  }, 0);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {[
              {
                id: "overview",
                label: "Overview",
                icon: <BarChart3 className="w-4 h-4" />,
              },
              {
                id: "functions",
                label: "DB Functions",
                icon: <Zap className="w-4 h-4" />,
              },
              {
                id: "revenue",
                label: "Revenue",
                icon: <DollarSign className="w-4 h-4" />,
              },
              {
                id: "bookings",
                label: "Bookings",
                icon: <Ticket className="w-4 h-4" />,
              },
              {
                id: "routes",
                label: "Routes",
                icon: <Map className="w-4 h-4" />,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2.5 rounded-xl transition-all font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <Spinner size="lg" className="text-blue-600" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && dashboard && !loading && (
          <div className="space-y-6">
            {/* Bookings Stats */}
            <div>
              <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-blue-600" />
                Bookings Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Bookings"
                  value={dashboard.bookings.total.toLocaleString()}
                  icon={<Ticket className="w-5 h-5 text-blue-600" />}
                  color="blue"
                />
                <StatCard
                  title="Confirmed"
                  value={dashboard.bookings.confirmed.toLocaleString()}
                  subtitle={`${((dashboard.bookings.confirmed / dashboard.bookings.total) * 100 || 0).toFixed(1)}% of total`}
                  icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
                  color="green"
                />
                <StatCard
                  title="Cancelled"
                  value={dashboard.bookings.cancelled.toLocaleString()}
                  subtitle={`${dashboard.bookings.cancellation_rate}% cancellation rate`}
                  icon={<AlertCircle className="w-5 h-5 text-red-600" />}
                  color="red"
                />
                <StatCard
                  title="Cancellation Rate"
                  value={`${dashboard.bookings.cancellation_rate}%`}
                  subtitle={
                    dashboard.bookings.cancellation_rate > 10
                      ? "Above threshold"
                      : "Within target"
                  }
                  icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
                  color={
                    dashboard.bookings.cancellation_rate > 10
                      ? "orange"
                      : "green"
                  }
                />
              </div>
            </div>

            {/* Revenue Stats */}
            <div>
              <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Revenue Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={`Rs ${dashboard.revenue.total.toLocaleString()}`}
                  icon={<DollarSign className="w-5 h-5 text-green-600" />}
                  color="green"
                />
                <StatCard
                  title="Paid Payments"
                  value={dashboard.revenue.paid_payments.toLocaleString()}
                  subtitle="Successful transactions"
                  icon={<CreditCard className="w-5 h-5 text-blue-600" />}
                  color="blue"
                />
                <StatCard
                  title="Average Fare"
                  value={`Rs ${dashboard.revenue.average_fare.toFixed(2)}`}
                  subtitle="Per booking"
                  icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                  color="purple"
                />
              </div>
            </div>

            {/* Trips Stats */}
            <div>
              <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bus className="w-5 h-5 text-blue-600" />
                Trip Statistics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                  title="Total Trips"
                  value={dashboard.trips.total.toLocaleString()}
                  icon={<Bus className="w-5 h-5 text-blue-600" />}
                  color="blue"
                />
                <StatCard
                  title="Completed"
                  value={dashboard.trips.completed.toLocaleString()}
                  icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
                  color="green"
                />
                <StatCard
                  title="Running"
                  value={dashboard.trips.running.toLocaleString()}
                  icon={<Activity className="w-5 h-5 text-orange-600" />}
                  color="orange"
                />
                <StatCard
                  title="Scheduled"
                  value={dashboard.trips.scheduled.toLocaleString()}
                  icon={<Calendar className="w-5 h-5 text-indigo-600" />}
                  color="indigo"
                />
                <StatCard
                  title="Cancelled"
                  value={dashboard.trips.cancelled.toLocaleString()}
                  icon={<AlertCircle className="w-5 h-5 text-red-600" />}
                  color="red"
                />
              </div>
            </div>

            {/* Resources Stats */}
            <div>
              <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                System Resources
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                  title="Buses"
                  value={dashboard.resources.buses.toLocaleString()}
                  icon={<Bus className="w-5 h-5 text-blue-600" />}
                  color="blue"
                />
                <StatCard
                  title="Drivers"
                  value={dashboard.resources.drivers.toLocaleString()}
                  icon={<Users className="w-5 h-5 text-purple-600" />}
                  color="purple"
                />
                <StatCard
                  title="Passengers"
                  value={dashboard.resources.passengers.toLocaleString()}
                  icon={<Users className="w-5 h-5 text-green-600" />}
                  color="green"
                />
                <StatCard
                  title="Routes"
                  value={dashboard.resources.routes.toLocaleString()}
                  icon={<Map className="w-5 h-5 text-orange-600" />}
                  color="orange"
                />
                <StatCard
                  title="Stops"
                  value={dashboard.resources.stops.toLocaleString()}
                  icon={<MapPin className="w-5 h-5 text-indigo-600" />}
                  color="indigo"
                />
              </div>
            </div>
          </div>
        )}

        {/* Other Tabs - Display activeReport */}
        {activeTab !== "overview" &&
          activeTab !== "functions" &&
          activeReport &&
          !loading && (
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {activeTab === "revenue" && (
                  <DollarSign className="w-6 h-6 text-green-600" />
                )}
                {activeTab === "bookings" && (
                  <Ticket className="w-6 h-6 text-blue-600" />
                )}
                {activeTab === "routes" && (
                  <Map className="w-6 h-6 text-orange-600" />
                )}
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Report
              </h2>

              {/* Revenue Daily */}
              {activeTab === "revenue" && Array.isArray(activeReport) && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Revenue (Rs)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {activeReport.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                            {row.day}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-green-600 dark:text-green-400">
                            {row.revenue
                              ? parseInt(row.revenue).toLocaleString()
                              : 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bookings Daily */}
              {activeTab === "bookings" && Array.isArray(activeReport) && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Bookings
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {activeReport.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                            {row.day}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                            {row.bookings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Route Performance */}
              {activeTab === "routes" && Array.isArray(activeReport) && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Route
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Trips
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Bookings
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Revenue (Rs)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {activeReport.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                            {row.route_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {row.service_name}
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-slate-900 dark:text-slate-100">
                            {row.total_trips}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                            {row.total_bookings}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-green-600 dark:text-green-400">
                            {parseInt(row.revenue || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        {/* DB Functions Tab - MySQL Stored Procedures */}
        {activeTab === "functions" && !loading && (
          <div className="space-y-6">
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-500" />
                MySQL Stored Procedures Analytics
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 ml-8">
                Real-time analytics powered by MySQL functions and stored
                procedures
              </p>

              {/* Daily Booking Analytics */}
              <div className="mb-8 p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Daily Booking Analytics
                </h3>
                <div className="flex gap-3 items-center mb-6">
                  <div className="relative datepicker-wrapper">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                    <DatePicker
                      popperClassName="z-[9999]"
                      portalId="root"
                      selected={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      placeholderText="Select Date"
                      popperPlacement="bottom-start"
                      className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all w-full"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const dateStr = selectedDate
                          ? selectedDate.toISOString().split("T")[0]
                          : "";
                        const res = await fetch(
                          `http://localhost:5000/admin/reports/daily-analytics?date=${dateStr}`,
                          { credentials: "include" }
                        );
                        const data = await res.json();
                        setDailyAnalytics(data);
                        setLoading(false);
                      } catch (err) {
                        setError(err.message);
                        setLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-blue-600/20 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Load Analytics
                  </button>
                </div>

                {dailyAnalytics && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="Total Bookings"
                      value={dailyAnalytics.total_bookings || 0}
                      icon={<Ticket className="w-5 h-5 text-blue-600" />}
                      color="blue"
                    />
                    <StatCard
                      title="Confirmed"
                      value={dailyAnalytics.confirmed_bookings || 0}
                      icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
                      color="green"
                    />
                    <StatCard
                      title="Cancelled"
                      value={dailyAnalytics.cancelled_bookings || 0}
                      icon={<AlertCircle className="w-5 h-5 text-red-600" />}
                      color="red"
                    />
                    <StatCard
                      title="Unique Passengers"
                      value={dailyAnalytics.unique_passengers || 0}
                      icon={<Users className="w-5 h-5 text-purple-600" />}
                      color="purple"
                    />
                    <StatCard
                      title="Trips Booked"
                      value={dailyAnalytics.trips_booked || 0}
                      icon={<Bus className="w-5 h-5 text-indigo-600" />}
                      color="indigo"
                    />
                    <StatCard
                      title="Daily Revenue"
                      value={`Rs ${parseFloat(dailyAnalytics.daily_revenue || 0).toLocaleString()}`}
                      icon={<DollarSign className="w-5 h-5 text-green-600" />}
                      color="green"
                    />
                    <StatCard
                      title="Avg Booking Value"
                      value={`Rs ${parseFloat(dailyAnalytics.avg_booking_value || 0).toFixed(2)}`}
                      icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
                      color="orange"
                    />
                    {dailyAnalytics.most_popular_route && (
                      <div className="col-span-2 p-5 rounded-2xl border bg-sky-50/50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800 backdrop-blur-sm">
                        <div className="text-sm font-semibold opacity-80 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Most Popular Route
                        </div>
                        <div className="font-bold text-lg">
                          {dailyAnalytics.most_popular_route}
                        </div>
                        {dailyAnalytics.most_popular_service && (
                          <div className="text-sm opacity-70 mt-1">
                            {dailyAnalytics.most_popular_service}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-slate-200 dark:border-slate-700 my-8" />

              {/* Trip Revenue Breakdown */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Trip Revenue Breakdown
                </h3>
                <div className="flex gap-3 items-center mb-6">
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Enter Trip ID"
                      value={tripId}
                      onChange={(e) => setTripId(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <button
                    onClick={async () => {
                      if (!tripId) {
                        setError("Please enter a trip ID");
                        return;
                      }
                      try {
                        setLoading(true);
                        const res = await fetch(
                          `http://localhost:5000/admin/reports/trip-revenue/${tripId}`,
                          { credentials: "include" }
                        );
                        if (!res.ok) {
                          throw new Error("Trip not found");
                        }
                        const data = await res.json();
                        setTripRevenue(data);
                        setLoading(false);
                      } catch (err) {
                        setError(err.message);
                        setTripRevenue(null);
                        setLoading(false);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors font-medium shadow-sm shadow-green-600/20 flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Get Revenue
                  </button>
                </div>

                {tripRevenue && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="col-span-full p-5 rounded-2xl border bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                              Trip #{tripRevenue.trip_id}
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                              {tripRevenue.route_name}
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
                              <Bus className="w-4 h-4" />
                              {tripRevenue.service_name} •{" "}
                              {tripRevenue.number_plate}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                              Departure
                            </div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-end gap-2">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {tripRevenue.departure_time}
                            </div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-2 ${
                                tripRevenue.trip_status === "completed"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : tripRevenue.trip_status === "running"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400"
                              }`}
                            >
                              {tripRevenue.trip_status === "completed" && (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {tripRevenue.trip_status === "running" && (
                                <Activity className="w-3 h-3" />
                              )}
                              {tripRevenue.trip_status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <StatCard
                        title="Total Bookings"
                        value={tripRevenue.total_bookings || 0}
                        subtitle={`${tripRevenue.confirmed_bookings} confirmed, ${tripRevenue.cancelled_bookings} cancelled`}
                        icon={<Ticket className="w-5 h-5 text-blue-600" />}
                        color="blue"
                      />
                      <StatCard
                        title="Bus Capacity"
                        value={tripRevenue.bus_capacity || 0}
                        subtitle={`${tripRevenue.utilization_percent}% utilized`}
                        icon={<Bus className="w-5 h-5 text-indigo-600" />}
                        color="indigo"
                      />
                      <StatCard
                        title="Total Revenue"
                        value={`Rs ${parseFloat(tripRevenue.total_revenue || 0).toLocaleString()}`}
                        subtitle={`Avg: Rs ${parseFloat(tripRevenue.average_fare || 0).toFixed(2)}`}
                        icon={<DollarSign className="w-5 h-5 text-green-600" />}
                        color="green"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;
