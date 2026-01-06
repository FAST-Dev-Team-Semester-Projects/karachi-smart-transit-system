import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoutesMap from "./pages/RoutesMap";
import PublicRoutes from "./pages/PublicRoutes";
import PassengerDashboard from "./pages/PassengerPage";
import GreenLineLanding from "./pages/GreenLineLanding";
import OrangeLineLanding from "./pages/OrangeLineLanding";
import YellowLineLanding from "./pages/YellowLineLanding";
import BrownLineLanding from "./pages/BrownLineLanding";
import BlueLineLanding from "./pages/BlueLineLanding";
import RedBusLanding from "./pages/RedBusLanding";
import RedLineLanding from "./pages/RedLineLanding";
import EVBusLanding from "./pages/EVBusLanding";
import PinkBusLanding from "./pages/PinkBusLanding";
import PaymentPage from "./pages/PaymentPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import AdminPage from "./pages/AdminPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBuses from "./pages/admin/AdminBuses";
import AdminRoutes from "./pages/admin/AdminRoutes";
import AdminTrips from "./pages/admin/AdminTrips";
import AdminStops from "./pages/admin/AdminStops";
import AdminServices from "./pages/admin/AdminServices";
import AdminReports from "./pages/admin/AdminReports";
import AdminBusTracking from "./pages/admin/AdminBusTracking";
import AdminRoutesStops from "./pages/admin/AdminRoutesStops";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminDriversAssignments from "./pages/admin/AdminDriversAssignments";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminTickets from "./pages/admin/AdminTickets";
import { ThemeProvider } from "./context/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ThemeToggle />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/routes-map" element={<RoutesMap />} />
          <Route path="/public-routes" element={<PublicRoutes />} />
          {/* Protected passenger routes */}
          <Route
            path="/passenger"
            element={
              <ProtectedRoute>
                <PassengerDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/GreenLine" element={<GreenLineLanding />} />
          <Route path="/OrangeLine" element={<OrangeLineLanding />} />
          <Route path="/RedLine" element={<RedLineLanding />} />
          <Route path="/YellowLine" element={<YellowLineLanding />} />
          <Route path="/BlueLine" element={<BlueLineLanding />} />
          <Route path="/BrownLine" element={<BrownLineLanding />} />
          <Route path="/RedBus" element={<RedBusLanding />} />
          <Route path="/EVBus" element={<EVBusLanding />} />
          <Route path="/PinkBus" element={<PinkBusLanding />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/booking-success" element={<BookingSuccessPage />} />

          {/* Protected admin routes - require admin role */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminPage />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="routes" element={<AdminRoutes />} />
            <Route path="stops" element={<AdminStops />} />
            <Route path="routes-stops" element={<AdminRoutesStops />} />
            <Route path="buses" element={<AdminBuses />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route
              path="drivers-assignments"
              element={<AdminDriversAssignments />}
            />
            <Route path="trips" element={<AdminTrips />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="bus-tracking" element={<AdminBusTracking />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
