/**
 * Authentication utility functions
 */

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

/**
 * Check if user is authenticated and get their info
 * @returns {Promise<{isAuthenticated: boolean, user: object|null, isAdmin: boolean}>}
 */
export async function checkAuth() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/check`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        isAuthenticated: true,
        user: data.user,
        isAdmin: data.user?.role === "admin",
      };
    }

    return {
      isAuthenticated: false,
      user: null,
      isAdmin: false,
    };
  } catch (error) {
    console.error("Auth check failed:", error);
    return {
      isAuthenticated: false,
      user: null,
      isAdmin: false,
    };
  }
}

/**
 * Logout user
 * @returns {Promise<boolean>}
 */
export async function logout() {
  try {
    const response = await fetch(`${API_BASE}/api/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    console.error("Logout failed:", error);
    return false;
  }
}
