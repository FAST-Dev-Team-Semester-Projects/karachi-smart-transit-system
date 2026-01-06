import React from "react";
import { useLiveTime } from "../hooks/useLiveTime";
import { Clock } from "lucide-react";

/**
 * LiveClock Component
 * Displays current Pakistan time that updates every second
 *
 * @param {Object} props
 * @param {string} props.format - 'full' | 'date' | 'time' (default: 'full')
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showIcon - Show clock icon (default: false)
 * @param {string} props.label - Optional label text
 */
const LiveClock = ({
  format = "full",
  className = "",
  showIcon = false,
  label = "",
}) => {
  const currentTime = useLiveTime(format);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Clock className="w-4 h-4" />}
      {label && <span className="font-semibold">{label}</span>}
      <span className="font-mono">{currentTime}</span>
    </div>
  );
};

export default LiveClock;
