import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { checkAuth } from "../utils/auth";
import { ShieldAlert, Lightbulb } from "lucide-react";

/**
 * Protected route component that checks authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @param {boolean} props.requireAdmin - Whether admin role is required
 */
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [authState, setAuthState] = useState({
    loading: true,
    isAuthenticated: false,
    isAdmin: false,
    username: null,
  });

  useEffect(() => {
    const verifyAuth = async () => {
      const result = await checkAuth();
      setAuthState({
        loading: false,
        isAuthenticated: result.isAuthenticated,
        isAdmin: result.isAdmin,
        username: result.user?.username,
      });
    };

    // Initial check
    verifyAuth();

    // Re-check auth every 30 seconds to detect session changes
    const interval = setInterval(verifyAuth, 30000);

    // Also check when tab becomes visible (user switches back to this tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        verifyAuth();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Show loading state
  if (authState.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but not admin when admin is required
  if (requireAdmin && !authState.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-lg p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
              <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            You need administrator privileges to access this page.
          </p>
          {authState.username && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Currently logged in as: <strong className="text-slate-900 dark:text-slate-100">{authState.username}</strong> (not
              an admin)
            </p>
          )}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                  <strong>Tip:</strong> If you were logged in as admin in another
                  tab, logging in as a different user overwrites your session.
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  Use different browsers or incognito windows to test multiple users
                  simultaneously.
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => (window.location.href = "/passenger")}
              className="px-6 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => (window.location.href = "/login")}
              className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Login as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed - render children
  return children;
};

export default ProtectedRoute;
