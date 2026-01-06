import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from "lucide-react";

// Simple client-side table with sorting and pagination
const AdminTable = ({
  data = [],
  columns = [],
  initialSort = null,
  pageSizeOptions = [5, 10, 25, 50],
  showSearch = true,
}) => {
  const [sortBy, setSortBy] = useState(initialSort ? initialSort.key : null);
  const [sortDir, setSortDir] = useState(initialSort ? initialSort.dir : "asc");
  const [pageSize, setPageSize] = useState(pageSizeOptions[0]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchColumn, setSearchColumn] = useState("ALL");

  // Safety check: ensure data is an array
  const safeData = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    if (!search) return safeData.slice();
    const q = search.toLowerCase();
    return safeData.filter((row) => {
      // If admin picked a specific column, only search that column
      if (searchColumn && searchColumn !== "ALL") {
        const val = row[searchColumn];
        return val != null && String(val).toLowerCase().includes(q);
      }
      // Default: First try matching using the configured columns (fast and specific)
      const byColumns = columns
        .filter((col) => col.key !== "actions" && col.searchable !== false)
        .some((col) => {
          const val = row[col.key];
          if (val == null) return false;
          return String(val).toLowerCase().includes(q);
        });
      if (byColumns) return true;
      // Fallback: search across all values on the row object to be robust
      return Object.values(row).some(
        (v) => v != null && String(v).toLowerCase().includes(q),
      );
    });
  }, [safeData, search, columns, searchColumn]);

  const sorted = useMemo(() => {
    if (!sortBy) return filtered.slice();
    const copy = filtered.slice();
    copy.sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (va == null && vb == null) return 0;
      if (va == null) return -1;
      if (vb == null) return 1;
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va).localeCompare(String(vb));
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [filtered, sortBy, sortDir, columns]);

  // If no explicit sort chosen, apply sort on filtered data
  const finalList = sortBy ? sorted : filtered.slice();
  const total = finalList.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageData = finalList.slice(page * pageSize, page * pageSize + pageSize);

  // (debug logs removed)

  const toggleSort = (key, sortable) => {
    if (!sortable) return;
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  return (
    <div className="w-full">
      {/* Search and Filter Bar */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {showSearch && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={searchColumn}
                onChange={(e) => {
                  setSearchColumn(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80"
                aria-label="Select search field"
              >
                <option value="ALL">All Fields</option>
                {columns
                  .filter((c) => c.key !== "actions" && c.searchable !== false)
                  .map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                aria-label="Search items"
              />
            </div>
          </div>
        )}
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">
          {total} records found
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors ${
                      col.sortable
                        ? "cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200"
                        : ""
                    }`}
                    onClick={() => toggleSort(col.key, col.sortable)}
                  >
                    <div className="flex items-center gap-2 group">
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-slate-400 group-hover:text-blue-500 transition-colors">
                          {sortBy === col.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-transparent">
              {pageData.map((row, idx) => (
                <tr
                  key={`${row.trip_id ?? row.id ?? row.user_id ?? row.bus_id ?? "r"}-${idx}`}
                  className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors duration-150"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap"
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {pageData.length === 0 && (
                <tr>
                  <td
                    className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                    colSpan={columns.length}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p>No results found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setPage(0);
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            {pageSizeOptions.map((ps) => (
              <option key={ps} value={ps}>
                {ps}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">
            Page {page + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(0)}
              disabled={page === 0}
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(Math.min(pageCount - 1, page + 1))}
              disabled={page >= pageCount - 1}
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              onClick={() => setPage(pageCount - 1)}
              disabled={page >= pageCount - 1}
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

AdminTable.propTypes = {
  data: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      sortable: PropTypes.bool,
      searchable: PropTypes.bool,
      render: PropTypes.func,
    }),
  ),
  initialSort: PropTypes.shape({
    key: PropTypes.string,
    dir: PropTypes.oneOf(["asc", "desc"]),
  }),
  pageSizeOptions: PropTypes.arrayOf(PropTypes.number),
  showSearch: PropTypes.bool,
};

export default AdminTable;
