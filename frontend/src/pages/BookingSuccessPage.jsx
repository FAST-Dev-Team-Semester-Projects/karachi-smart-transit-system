import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, Printer, Home, Calendar, Bus } from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";

const BookingSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingInfo = location.state;

  if (!bookingInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            No booking information found
          </h2>
          <Button onClick={() => navigate("/passenger")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden font-sans selection:bg-purple-100 selection:text-purple-900 flex items-center justify-center p-4">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-b from-purple-600/10 to-orange-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Success Header */}
          <div className="bg-green-500 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_70%)]" />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Booking Confirmed!
              </h1>
              <p className="text-green-100">Your ticket has been generated</p>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="p-6">
            <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
              {/* Perforated Line Effect */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-900 rounded-full border-r border-slate-200 dark:border-slate-800" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-900 rounded-full border-l border-slate-200 dark:border-slate-800" />
              <div className="absolute left-4 right-4 top-1/2 border-t-2 border-dashed border-slate-200 dark:border-slate-800" />

              {/* Top Section */}
              <div className="pb-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                      Booking ID
                    </p>
                    <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                      #{bookingInfo.booking_id}
                    </p>
                    {bookingInfo.payment_id && (
                      <p className="text-xs text-slate-500 mt-1">
                        Payment #{bookingInfo.payment_id}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                      Seat
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {bookingInfo.seat_number}
                    </p>
                    {bookingInfo.card_last_four && (
                      <p className="text-xs text-slate-500 mt-1">
                        Card •••• {bookingInfo.card_last_four}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <Bus className="w-5 h-5 text-slate-400" />
                  <span className="font-medium">
                    {bookingInfo.trip_info?.number_plate ||
                      `Bus ${bookingInfo.trip_info?.bus_id}`}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <span className="font-medium">
                    {bookingInfo.trip_info?.departure_time
                      ? new Date(
                          bookingInfo.trip_info.departure_time,
                        ).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="pt-6 space-y-4">
                <div className="relative pl-8 space-y-6">
                  {/* Timeline Line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 dark:border-slate-800" />

                  <div className="relative">
                    <div className="absolute -left-8 w-6 h-6 rounded-full bg-white dark:bg-slate-950 border-2 border-purple-500 z-10" />
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      From
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {bookingInfo.trip_info?.start_stop_name}
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-8 w-6 h-6 rounded-full bg-purple-500 border-2 border-purple-500 z-10" />
                    <p className="text-xs text-slate-500 uppercase font-bold">
                      To
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {bookingInfo.trip_info?.end_stop_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              {bookingInfo.qr_code && (
                <div className="pt-6 flex flex-col items-center justify-center border-t border-dashed border-slate-200 dark:border-slate-800 mt-6">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <QRCode
                      value={bookingInfo.qr_code}
                      size={120}
                      style={{
                        height: "auto",
                        maxWidth: "100%",
                        width: "100%",
                      }}
                      viewBox={`0 0 256 256`}
                    />
                  </div>
                  <p className="text-center text-[10px] text-slate-400 mt-2 font-mono tracking-wider">
                    {bookingInfo.qr_code}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between items-center px-2">
              <span className="text-slate-500 font-medium">Total Paid</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                Rs {bookingInfo.fare_amount}
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/passenger")}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                onClick={() => window.print()}
                className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
