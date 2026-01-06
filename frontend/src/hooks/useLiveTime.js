import { useState, useEffect } from "react";

/**
 * Custom hook for live updating time display
 * Shows current Pakistan time (no conversion needed - browser time is already local)
 *
 * @param {string} format - 'full' | 'date' | 'time' | 'custom'
 * @returns {string} Formatted current time
 */
export const useLiveTime = (format = "full") => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format based on requested format
  // Note: We use browser's native formatting since we want to show LOCAL time
  switch (format) {
    case "date":
      return currentTime.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    case "time":
      return currentTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    case "custom":
      return currentTime; // Return Date object for custom formatting
    case "full":
    default:
      return currentTime.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
  }
};

/**
 * Hook for displaying relative time (e.g., "2 minutes ago")
 * Updates every 10 seconds
 *
 * @param {string} dateString - ISO date string from backend (UTC)
 * @returns {string} Relative time string
 */
export const useRelativeTime = (dateString) => {
  const [relativeTime, setRelativeTime] = useState("");

  useEffect(() => {
    const updateRelativeTime = () => {
      if (!dateString) {
        setRelativeTime("");
        return;
      }

      // Backend sends UTC time without 'Z', so add it to parse correctly
      const utcString =
        dateString.endsWith("Z") || dateString.includes("+")
          ? dateString
          : dateString + "Z";

      const date = new Date(utcString);
      const now = new Date();

      // Both dates are now in local time (browser handles conversion)
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) {
        setRelativeTime("just now");
      } else if (diffMin < 60) {
        setRelativeTime(`${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`);
      } else if (diffHour < 24) {
        setRelativeTime(`${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`);
      } else {
        setRelativeTime(`${diffDay} day${diffDay !== 1 ? "s" : ""} ago`);
      }
    };

    updateRelativeTime();
    const intervalId = setInterval(updateRelativeTime, 10000); // Update every 10 seconds

    return () => clearInterval(intervalId);
  }, [dateString]);

  return relativeTime;
};
