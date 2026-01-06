import { Loader2Icon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

function Spinner({ className, size = "md", ...props }) {
  // Map common semantic sizes to Tailwind width/height classes
  const sizeClass =
    size === "sm"
      ? "w-4 h-4"
      : size === "lg"
      ? "w-6 h-6"
      : size === "xs"
      ? "w-3 h-3"
      : "w-5 h-5"; // default md

  // Avoid passing non-numeric `size` prop to the underlying SVG (which expects length)
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(`${sizeClass} animate-spin`, className)}
      {...props}
    />
  );
}

export { Spinner };
