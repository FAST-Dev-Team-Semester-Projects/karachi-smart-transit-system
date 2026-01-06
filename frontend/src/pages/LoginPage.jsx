import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await response.json();
      if (data.success) {
        if (data.role && data.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/passenger");
        }
      } else {
        setError(data.message || "Login failed");
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
                Karachi Smart Transit
              </p>
              <h1 className="text-4xl xl:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                Your Gateway to <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-orange-500">
                  Karachi&apos;s Transit
                </span>
              </h1>
              <p className="mt-5 text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-xl">
                Manage your trips, track buses in real-time, and travel with
                ease across the city. Join thousands of commuters today.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-lg font-semibold text-slate-700 dark:text-white">
                K
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Powered by
                </p>
                <p className="font-semibold text-slate-900 dark:text-white text-lg">
                  Sindh Mass Transit Authority
                </p>
              </div>
            </div>
            <div className="h-px bg-linear-to-r from-transparent via-slate-300 dark:via-white/20 to-transparent" />
            <p className="text-sm text-slate-500">
              Secure · Reliable · 24/7 Support
            </p>
          </div>
        </div>

        {/* Auth column */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-purple-600 dark:text-purple-400 mb-3 font-bold">
                Welcome Back
              </p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                Sign in to your account
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
                Enter your credentials to access your dashboard.
              </p>
            </div>

            <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-purple-900/10 dark:shadow-purple-900/20 p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="identifier"
                    className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-300"
                  >
                    Username / Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </span>
                    <input
                      type="text"
                      id="identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      autoFocus
                      placeholder="username or email"
                      className="block w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest font-semibold text-slate-500 dark:text-slate-300">
                    <label htmlFor="password">Password</label>
                    <button
                      type="button"
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 dark:text-slate-500">
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="block w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-12 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
                    >
                      {showPassword ? (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-purple-500 focus:ring-purple-500/50"
                    />
                    Keep me signed in
                  </label>
                  <span className="text-xs text-slate-500">Secure session</span>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-600 dark:text-red-200">
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
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-linear-to-r from-purple-600 to-orange-500 font-semibold tracking-wide text-white shadow-lg shadow-purple-900/20 hover:-translate-y-px transition-transform focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-950 cursor-pointer"
                >
                  Sign In
                </button>
              </form>

              <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <span>New to KSTS?</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              </div>

              <button
                type="button"
                onClick={() => navigate("/register")}
                className="mt-3 w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                Create an account
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              By continuing you agree to the KSTS Terms of Service and Privacy
              Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
