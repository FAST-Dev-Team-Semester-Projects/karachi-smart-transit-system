import React, { useEffect, useState } from "react";
import "../../styles/admin.css";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, checkAuth } from "../../utils/auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Wrench,
  Map,
  MapPin,
  Link,
  Bus,
  Car,
  ClipboardList,
  Clock,
  Users,
  Ticket,
  CreditCard,
  QrCode,
  TrendingUp,
  LogOut,
} from "lucide-react";

const AdminLayout = () => {
  const navigate = useNavigate();
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  const links = [
    {
      to: "/admin",
      label: "Dashboard",
      end: true,
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    // Configuration & Setup
    {
      to: "/admin/services",
      label: "Services",
      icon: <Wrench className="w-5 h-5" />,
    },
    { to: "/admin/routes", label: "Routes", icon: <Map className="w-5 h-5" /> },
    {
      to: "/admin/stops",
      label: "Stops",
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      to: "/admin/routes-stops",
      label: "Route Stops",
      icon: <Link className="w-5 h-5" />,
    },
    // Fleet Management
    { to: "/admin/buses", label: "Buses", icon: <Bus className="w-5 h-5" /> },
    {
      to: "/admin/drivers",
      label: "Drivers",
      icon: <Car className="w-5 h-5" />,
    },
    {
      to: "/admin/drivers-assignments",
      label: "Driver Assignments",
      icon: <ClipboardList className="w-5 h-5" />,
    },
    // Operations
    { to: "/admin/trips", label: "Trips", icon: <Clock className="w-5 h-5" /> },
    // User Management
    { to: "/admin/users", label: "Users", icon: <Users className="w-5 h-5" /> },
    // Transactions
    {
      to: "/admin/bookings",
      label: "Bookings",
      icon: <Ticket className="w-5 h-5" />,
    },
    {
      to: "/admin/payments",
      label: "Payments",
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      to: "/admin/tickets",
      label: "Tickets",
      icon: <QrCode className="w-5 h-5" />,
    },
    // Analytics
    {
      to: "/admin/reports",
      label: "Reports",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate("/login");
    } else {
      alert("Logout failed. Please try again.");
    }
  };

  // Monitor session changes
  useEffect(() => {
    const checkSession = async () => {
      const result = await checkAuth();
      if (result.isAuthenticated && !result.isAdmin) {
        // User is logged in but not as admin anymore
        setShowSessionWarning(true);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkSession, 10000);

    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 admin-root relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />

      {/* Session Warning Banner */}
      {showSessionWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 text-center shadow-lg">
          <p className="font-semibold">⚠️ Session Changed!</p>
          <p className="text-sm">
            You are no longer logged in as admin. Redirecting to login...
          </p>
        </div>
      )}
      {/* Sidebar for md+ screens */}
      <aside className="hidden md:flex w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex-col z-10">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Admin Panel
          </h2>
        </div>
        <nav className="p-4 space-y-2 overflow-y-auto flex-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-slate-200 dark:bg-slate-800 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`text-lg ${
                      isActive ? "text-purple-600 dark:text-orange-500" : ""
                    }`}
                  >
                    {l.icon}
                  </span>
                  <span
                    className={`truncate font-medium ${
                      isActive ? "text-black dark:text-white" : ""
                    }`}
                  >
                    {l.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 relative z-10 overflow-y-auto h-screen">
        {/* Top Bar with Logout */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all hover:scale-105"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Logout</span>
          </Button>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden mb-4">
          <div className="flex gap-2 overflow-auto pb-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `whitespace-nowrap px-3 py-1 rounded-lg flex items-center gap-2 transition-colors ${
                    isActive
                      ? "bg-slate-200 dark:bg-slate-800 text-black dark:text-white font-bold"
                      : "bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  }`
                }
              >
                <span className="text-sm">{l.icon}</span>
                <span className="text-sm font-medium">{l.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="container mx-auto px-4 pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
