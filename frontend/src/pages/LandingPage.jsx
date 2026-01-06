import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Map,
  Bus,
  CreditCard,
  Navigation,
  Shield,
  ChevronRight,
} from "lucide-react";

function LandingPage() {
  const navigate = useNavigate();
  // Track which sections have been revealed (by index)
  const [revealed, setRevealed] = useState([true, false, false]);
  const sectionRefs = [useRef(null), useRef(null), useRef(null)];
  // Only animate on first load
  const [firstLoad, setFirstLoad] = useState(true);
  // Track scroll position for navbar background
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    // Handle scroll for navbar background
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    // If user has already scrolled, don't animate again
    if (window.sessionStorage.getItem("landingFadeDone")) {
      setRevealed([true, true, true]);
      setFirstLoad(false);
      return;
    }
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sectionRefs.findIndex(
              (ref) => ref.current === entry.target,
            );
            if (idx !== -1 && !revealed[idx]) {
              setRevealed((prev) => {
                const next = [...prev];
                next[idx] = true;
                // If all revealed, mark as done
                if (next.every(Boolean)) {
                  window.sessionStorage.setItem("landingFadeDone", "1");
                  setFirstLoad(false);
                }
                return next;
              });
            }
          }
        });
      },
      { threshold: 0.2 },
    );
    sectionRefs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* Background Gradients - Matching Login Page */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-b from-purple-600/10 to-orange-600/10 blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav
        className={`fixed top-5 left-5 right-5 z-50 flex justify-between items-center px-6 py-6 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[30px] shadow-lg border-b border-slate-200/50 dark:border-slate-800/50"
            : "bg-transparent"
        }`}
      >
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/")}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800">
            <img
              src="/ksts_favicon.png"
              className="w-6 h-6 object-contain"
              alt="KSTS Logo"
            />
          </div>
          <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
            KSTS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/login")}
            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold px-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Login
          </Button>
          <Button
            onClick={() => navigate("/register")}
            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-semibold px-6 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Register
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 w-full pt-24">
        {/* Hero Section */}
        <section
          ref={sectionRefs[0]}
          className={`container mx-auto px-4 pt-20 pb-32 flex flex-col items-center text-center transition-opacity duration-1000 ${revealed[0] ? "opacity-100" : firstLoad ? "opacity-0" : "opacity-100"}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 backdrop-blur-sm shadow-sm mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Live Transit Updates Enabled
            </span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-8 leading-tight max-w-5xl">
            Smart Transit for a <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-orange-500">
              Smarter City
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Experience seamless travel across Karachi with our integrated BRT
            network. Book tickets, track buses, and travel with comfort.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
            <Button
              size="lg"
              onClick={() => navigate("/passenger")}
              className="w-full h-14 text-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-xl"
            >
              Start Your Journey
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section
          ref={sectionRefs[1]}
          className={`container mx-auto px-4 py-20 transition-opacity duration-1000 ${revealed[1] ? "opacity-100" : firstLoad ? "opacity-0" : "opacity-100"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: <CreditCard className="w-8 h-8 text-purple-600" />,
                title: "Smart Ticketing",
                desc: "Digital booking system with QR code integration for hassle-free entry.",
              },
              {
                icon: <Navigation className="w-8 h-8 text-orange-500" />,
                title: "Live Tracking",
                desc: "Real-time bus location updates and estimated arrival times.",
              },
              {
                icon: <Shield className="w-8 h-8 text-blue-500" />,
                title: "Secure Payments",
                desc: "Fast and secure payment options for all your transit needs.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group p-8 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 w-fit group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Explore Section */}
        <section
          ref={sectionRefs[2]}
          className={`container mx-auto px-4 py-20 transition-opacity duration-1000 ${revealed[2] ? "opacity-100" : firstLoad ? "opacity-0" : "opacity-100"}`}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-12 text-center">
              Explore the Network
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* View Map Card */}
              <div
                onClick={() => navigate("/routes-map")}
                className="group relative overflow-hidden rounded-3xl bg-slate-900 text-white p-10 cursor-pointer shadow-2xl hover:shadow-purple-500/20 transition-all duration-500"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/30 transition-colors"></div>
                <div className="relative z-10">
                  <Map className="w-12 h-12 mb-6 text-purple-400" />
                  <h3 className="text-3xl font-bold mb-4">Interactive Map</h3>
                  <p className="text-slate-300 mb-8 text-lg">
                    Explore the entire BRT network visually. Find stations,
                    interchanges, and plan your route.
                  </p>
                  <div className="flex items-center gap-2 text-purple-400 font-bold group-hover:translate-x-2 transition-transform">
                    View Map <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* View Routes Card */}
              <div
                onClick={() => navigate("/public-routes")}
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-800 p-10 cursor-pointer shadow-2xl border border-slate-200 dark:border-slate-700 hover:border-orange-500/50 transition-all duration-500"
              >
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -ml-16 -mb-16 group-hover:bg-orange-500/20 transition-colors"></div>
                <div className="relative z-10">
                  <Bus className="w-12 h-12 mb-6 text-orange-500" />
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    Routes & Schedules
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">
                    Check detailed timings, stops, and fare information for all
                    bus lines.
                  </p>
                  <div className="flex items-center gap-2 text-orange-500 font-bold group-hover:translate-x-2 transition-transform">
                    View Schedules <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 max-w-6xl mx-auto">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/ksts_favicon.png" className="w-8 h-8" alt="KSTS" />
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  KSTS
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                Revolutionizing urban mobility in Karachi with a
                state-of-the-art Bus Rapid Transit system.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">
                Quick Links
              </h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400">
                <li>
                  <button
                    onClick={() => navigate("/login")}
                    className="hover:text-purple-600 transition-colors"
                  >
                    Login
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/register")}
                    className="hover:text-purple-600 transition-colors"
                  >
                    Register
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/passenger")}
                    className="hover:text-purple-600 transition-colors"
                  >
                    Book Tickets
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">
                Support
              </h4>
              <ul className="space-y-4 text-slate-600 dark:text-slate-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-purple-600 transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-purple-600 transition-colors"
                  >
                    Contact Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-purple-600 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center">
            <p className="text-slate-500 dark:text-slate-500 mb-4">
              © 2025 Karachi Smart Transit System. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-400">
              <span>Created by:</span>
              <span className="text-slate-600 dark:text-slate-300">
                Mujtaba Kamran
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-600 dark:text-slate-300">
                Haider Murtaza
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-600 dark:text-slate-300">
                Muhammad Rayyan
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
