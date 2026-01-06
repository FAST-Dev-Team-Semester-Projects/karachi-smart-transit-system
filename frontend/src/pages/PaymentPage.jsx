import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  CreditCard,
  Calendar,
  Lock,
  User,
  ArrowLeft,
  Bus,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE = "http://localhost:5000";

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state;

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testCards, setTestCards] = useState([]);
  const [showTestCards, setShowTestCards] = useState(false);

  // Redirect if no booking data
  useEffect(() => {
    if (!bookingData) {
      navigate(-1);
    }
  }, [bookingData, navigate]);

  // Load test cards
  useEffect(() => {
    const loadTestCards = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/test_cards`);
        const data = await response.json();
        if (data.success) {
          setTestCards(data.cards);
        }
      } catch (error) {
        console.error("Failed to load test cards:", error);
      }
    };
    loadTestCards();
  }, []);

  if (!bookingData) {
    return null;
  }

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, "");
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(" ") : cleaned;
  };

  const handleCardNumberChange = (e) => {
    const input = e.target.value;
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, "");

    // Limit to 19 digits max
    if (digitsOnly.length <= 19) {
      setCardNumber(formatCardNumber(digitsOnly));
    }
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    if (value.length <= 5) {
      setExpiryDate(value);
    }
  };

  const handleCvvChange = (e) => {
    const value = e.target.value;
    if (value.length <= 3 && /^\d*$/.test(value)) {
      setCvv(value);
    }
  };

  const useTestCard = (card) => {
    setCardNumber(formatCardNumber(card.full_number));
    setCvv(card.cvv);
    setExpiryDate(card.expiry);
    setCardName("TEST USER");
    setShowTestCards(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      setError("Card number must be between 13-19 digits");
      return;
    }
    if (!cardName.trim()) {
      setError("Cardholder name is required");
      return;
    }
    if (expiryDate.length !== 5) {
      setError("Invalid expiry date (use MM/YY)");
      return;
    }
    if (cvv.length < 3 || cvv.length > 4) {
      setError("CVV must be 3 or 4 digits");
      return;
    }

    setLoading(true);

    try {
      // Create booking with credit card details
      // Backend will validate card (Luhn algorithm) and process payment in SQL
      const bookingResponse = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: bookingData.trip_id,
          boarding_stop_id: bookingData.boarding_stop_id,
          alighting_stop_id: bookingData.alighting_stop_id,
          card_number: cleanCardNumber,
          cvv: cvv,
          expiry: expiryDate,
          cardholder_name: cardName,
        }),
      });

      const bookingResult = await bookingResponse.json();

      if (bookingResponse.ok && bookingResult.success) {
        // Navigate to success page
        navigate("/booking-success", {
          state: {
            booking_id: bookingResult.booking_id,
            payment_id: bookingResult.payment_id,
            fare_amount: bookingResult.fare_amount,
            seat_number: bookingResult.seat_number,
            card_last_four: bookingResult.card_last_four,
            qr_code: bookingResult.qr_code,
            trip_info: bookingData,
          },
        });
      } else {
        // Show error from backend (could be invalid card, payment declined, etc.)
        setError(bookingResult.message || "Booking failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-b from-purple-600/10 to-orange-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="rounded-full w-10 h-10 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Complete Your Booking
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Booking Summary - Left Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Bus className="w-5 h-5 text-purple-600" />
                Trip Summary
              </h2>

              <div className="space-y-6 relative">
                {/* Timeline Line */}
                <div className="absolute left-[11px] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-800" />

                {/* From */}
                <div className="relative flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-purple-500 z-10 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      From
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {bookingData.start_stop_name}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {new Date(bookingData.departure_time).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  </div>
                </div>

                {/* To */}
                <div className="relative flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-purple-500 z-10 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      To
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {bookingData.end_stop_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Bus className="w-4 h-4" /> Service
                  </span>
                  <span className="font-medium">
                    {bookingData.service_name || "Green Line BRT"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Bus Number
                  </span>
                  <span className="font-medium">
                    {bookingData.number_plate || `Bus ${bookingData.bus_id}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date
                  </span>
                  <span className="font-medium">
                    {new Date(bookingData.departure_time).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-end">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                    Total Fare
                  </span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-orange-500">
                    Rs {bookingData.fare_amount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form - Right Column */}
          <div className="lg:col-span-7">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  Secure Payment
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTestCards(!showTestCards)}
                  className="text-xs"
                >
                  {showTestCards ? "Hide Test Cards" : "Use Test Card"}
                </Button>
              </div>

              {/* Test Cards List */}
              {showTestCards && testCards.length > 0 && (
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Select a test card
                  </p>
                  <div className="space-y-2">
                    {testCards.map((card, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => useTestCard(card)}
                        className="w-full text-left p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                            {card.full_number}
                          </span>
                          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {card.bank}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-3">
                          <span>CVV: {card.cvv}</span>
                          <span>Exp: {card.expiry}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Card Number
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="0000 0000 0000 0000"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Cardholder Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cardholder Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="JOHN DOE"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Expiry */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Expiry Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={expiryDate}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* CVV */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      CVV
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={cvv}
                        onChange={handleCvvChange}
                        placeholder="123"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-lg font-bold bg-linear-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600 text-white shadow-lg shadow-purple-500/25 rounded-xl transition-all duration-300"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Pay Rs ${bookingData.fare_amount}`
                  )}
                </Button>

                <p className="text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Payments are secure and encrypted
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
