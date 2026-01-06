# Frontend (React + Vite)

This file describes how to run and develop the frontend locally, plus recommended environment configuration and troubleshooting for integration with the Flask backend.

**Defaults**
- Frontend dev URL: `http://localhost:5173`
- Backend dev URL: `http://localhost:5000`

## Features
- **Responsive UI**: Modern React interface with Tailwind CSS and dark mode support
- **Real-time Updates**: Live bus tracking via Socket.IO integration
- **Authentication**: Session-based login with protected routes and role-based access
- **Admin Dashboard**: Comprehensive management interface for transit operations
- **Booking System**: User-friendly ticket booking with payment processing
- **Interactive Maps**: Route visualization using Leaflet maps
- **Mobile-First Design**: Optimized for all device sizes

Prerequisites
- Node.js 18+ (or compatible LTS)
- npm (or yarn)

Quick start (Windows PowerShell)

```powershell
cd frontend
npm install
npm run dev
# open http://localhost:5173 in your browser
```

Build & preview

```powershell
npm run build
npm run preview
```

Environment (API base)
- Use `VITE_API_BASE` to point the frontend to a backend base URL in dev or staging. Create a `frontend/.env` or `frontend/.env.local` file with:

```
VITE_API_BASE=http://localhost:5000
```

Admin UI notes
- Admin pages and components live under `src/pages/` (look for `Admin*` files) and share a scoped stylesheet at `src/styles/admin.css` which contains high-specificity overrides for selects, buttons and pager styles.

Troubleshooting
- "Unexpected token '<'" when parsing JSON: frontend likely requested an HTML page (Vite dev server or 404). Check the Network tab and confirm requests are hitting `API_BASE` or the correct backend path.
- Cookies not set after login: ensure frontend requests use `credentials: 'include'`, and backend CORS allows credentials with the frontend origin (no `*` for `Access-Control-Allow-Origin`).
- Invisible select/dropdown text in admin: a global CSS rule may be overriding browser defaults — the project includes `src/styles/admin.css` to fix this for admin pages.

Testing & linting
- If present, run tests and linters defined in `package.json`:

```powershell
npm run test     # if available
npm run lint     # if available
```

Where to look (important files)
- App entry: `src/main.jsx`
- Routes / pages: `src/pages/` (e.g. `LoginPage.jsx`, `AdminPage.jsx`)
- Reusable admin table: `src/components/AdminTable.jsx`
- Admin CSS overrides: `src/styles/admin.css`
