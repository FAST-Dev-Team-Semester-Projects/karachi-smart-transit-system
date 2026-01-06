import React from "react";
import PropTypes from "prop-types";
import { Search } from "lucide-react";

const AdminInput = React.forwardRef(
  ({ icon: Icon, error, className = "", ...props }, ref) => {
    const baseStyles = `
    w-full px-4 py-2.5 
    border rounded-lg
    bg-white dark:bg-slate-900 
    text-slate-900 dark:text-slate-100
    placeholder:text-slate-400 dark:placeholder:text-slate-500
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 
    ${
      error
        ? "border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
    }
    hover:border-slate-400 dark:hover:border-slate-500
    disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60
    shadow-sm hover:shadow-md focus:shadow-lg
  `
      .replace(/\s+/g, " ")
      .trim();

    if (Icon) {
      return (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            ref={ref}
            className={`${baseStyles} pl-11 ${className}`}
            {...props}
          />
          {error && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div>
        <input ref={ref} className={`${baseStyles} ${className}`} {...props} />
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

AdminInput.displayName = "AdminInput";

AdminInput.propTypes = {
  icon: PropTypes.elementType,
  error: PropTypes.string,
  className: PropTypes.string,
};

export const AdminSearchBox = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) => {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          w-full pl-12 pr-4 py-3
          border border-slate-300 dark:border-slate-600
          rounded-xl
          bg-white dark:bg-slate-900
          text-slate-900 dark:text-slate-100
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 
          focus:border-blue-500 dark:focus:border-blue-400 
          focus:ring-blue-500/20 dark:focus:ring-blue-400/20
          hover:border-slate-400 dark:hover:border-slate-500
          shadow-md hover:shadow-lg focus:shadow-xl
          ${className}
        `
          .replace(/\s+/g, " ")
          .trim()}
      />
    </div>
  );
};

AdminSearchBox.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
};

export const AdminSelect = React.forwardRef(
  ({ icon: Icon, error, className = "", children, ...props }, ref) => {
    const baseStyles = `
    w-full px-4 py-2.5
    border rounded-lg
    bg-white dark:bg-slate-900
    text-slate-900 dark:text-slate-100
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2
    ${
      error
        ? "border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
    }
    hover:border-slate-400 dark:hover:border-slate-500
    disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60
    shadow-sm hover:shadow-md focus:shadow-lg
    cursor-pointer
  `
      .replace(/\s+/g, " ")
      .trim();

    if (Icon) {
      return (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          </div>
          <select
            ref={ref}
            className={`${baseStyles} pl-11 pr-10 ${className}`}
            {...props}
          >
            {children}
          </select>
          {error && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      );
    }

    return (
      <div>
        <select ref={ref} className={`${baseStyles} ${className}`} {...props}>
          {children}
        </select>
        {error && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

AdminSelect.displayName = "AdminSelect";

AdminSelect.propTypes = {
  icon: PropTypes.elementType,
  error: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default AdminInput;
