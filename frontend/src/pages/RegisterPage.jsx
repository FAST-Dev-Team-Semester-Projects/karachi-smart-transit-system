import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, AlertCircle } from "lucide-react";

function RegisterPage() {
  const [userName, setUserName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: userName,
          name,
          email,
          password,
          phone_number: phoneNumber,
          role: "passenger",
        }),
      });
      const data = await response.json();
      if (data.success) {
        navigate("/login");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("Network error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)]" />
      <div className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-b from-purple-600/10 to-orange-600/10 blur-3xl" />
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Brand / Story */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-slate-200 dark:border-white/5 px-16 py-14">
          <div className="space-y-10">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors group"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 dark:border-white/20 group-hover:border-slate-500 dark:group-hover:border-white/40">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </span>
              <span className="font-medium tracking-wide">ksts.pk</span>
            </button>

            <div>
              <p className="uppercase tracking-[0.3em] text-xs text-purple-600 dark:text-purple-400 mb-4 font-bold">
                Join the Network
              </p>
              <h1 className="text-4xl xl:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                Start your journey with <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-orange-500">
                  Smart Transit
                </span>
              </h1>
              <p className="mt-5 text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-xl">
                Create an account to book tickets, save your favorite routes,
                and get personalized travel updates.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-lg font-semibold text-slate-700 dark:text-white">
                <Rocket className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Join thousands of
                </p>
                <p className="font-semibold text-slate-900 dark:text-white text-lg">
                  Happy Commuters
                </p>
              </div>
            </div>
            <div className="h-px bg-linear-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent" />
            <p className="text-sm text-slate-500">
              Free Account · Instant Access · Secure Data
            </p>
          </div>
        </div>

        {/* Auth column */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-600 dark:text-purple-400 mb-3 font-bold">
                Get Started
              </p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                Create your account
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
                Enter your details to register as a new passenger.
              </p>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-purple-900/10 dark:shadow-purple-900/20 p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="userName"
                      className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-300"
                    >
                      Username
                    </label>
                    <input
                      type="text"
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      autoFocus
                      placeholder="johndoe"
                      className="block w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent transition"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-300"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="John Doe"
                      className="block w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-300"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="john@example.com"
                    className="block w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent transition"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="phoneNumber"
                    className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-300"
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    placeholder="+92 300 1234567"
                    className="block w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent transition"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="block w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-200">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 to-orange-500 font-semibold tracking-wide text-white shadow-lg shadow-purple-900/20 hover:-translate-y-px transition-transform focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-950 cursor-pointer"
                >
                  Create Account
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span>Already have an account?</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-3 w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Sign in instead
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              By registering you agree to the KSTS Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
