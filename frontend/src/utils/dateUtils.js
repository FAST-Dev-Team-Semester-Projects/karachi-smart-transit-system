/**
 * Date/Time Utility Functions
 *
 * Backend stores all times in UTC.
 * Frontend displays times in Pakistan Time (UTC+5).
 */

const PAKISTAN_OFFSET_HOURS = 5;

/**
 * Format datetime string (no conversion - already in local time)
 * @param {string} dateString - ISO datetime string from backend (e.g., "2025-11-26T21:23:13")
 * @returns {string} Formatted datetime
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";

  try {
    // No conversion - backend sends local time
    const date = new Date(dateString);

    // Format: "11/26/2025, 9:23:13 PM"
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Format date only (no time)
 * @param {string} dateString - ISO datetime string from backend
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);

    // Format: "11/26/2025"
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Format time only (no date)
 * @param {string} dateString - ISO datetime string from backend
 * @returns {string} Formatted time
 */
export const formatTime = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);

    // Format: "9:23:13 PM"
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return dateString;
  }
};

/**
 * Convert local Pakistan time to UTC for sending to backend
 * @param {Date} localDate - Local date object
 * @returns {string} ISO string in UTC
 */
export const toUTC = (localDate) => {
  if (!localDate) return null;

  try {
    // Subtract 5 hours to convert Pakistan Time to UTC
    const utcDate = new Date(localDate);
    utcDate.setHours(utcDate.getHours() - PAKISTAN_OFFSET_HOURS);
    return utcDate.toISOString();
  } catch (error) {
    console.error("Error converting to UTC:", error);
    return null;
  }
};

/**
 * Get current Pakistan Time
 * @returns {Date} Current date/time in Pakistan
 */
export const nowPakistan = () => {
  const now = new Date();
  now.setHours(now.getHours() + PAKISTAN_OFFSET_HOURS);
  return now;
};
