import React from "react";
import { useTheme } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 left-6 z-50 p-3 rounded-full shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-yellow-400"
      aria-label="Toggle Dark Mode"
    >
      {theme === "dark" ? (
        <Sun className="w-6 h-6 fill-current" />
      ) : (
        <Moon className="w-6 h-6 fill-current text-slate-700" />
      )}
    </button>
  );
};

export default ThemeToggle;
