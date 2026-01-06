import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from "../utils/auth";
import greenLineImg from "../assets/green-line-brt.jpg";
import orangeLineImg from "../assets/orange-line-brt.jpg";
import redLineImg from "../assets/red-line-brt.jpg";
import yellowLineImg from "../assets/yellow-line-brt.jpg";
import blueLineImg from "../assets/blue-line-brt.jpg";
import brownLineImg from "../assets/brown-line-brt.jpg";
import redBusImg from "../assets/karachi-red-bus.jpg";
import evBusImg from "../assets/karachi-ev-bus.jpg";
import pinkBusImg from "../assets/karachi-pink-bus.jpg";

const PassengerPage = () => {
  const navigate = useNavigate();

  // Animation State
  const [revealed, setRevealed] = useState([true, false]); // Header is always revealed
  const sectionRefs = [useRef(null), useRef(null)];
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    if (window.sessionStorage.getItem("passengerFadeDone")) {
      setRevealed([true, true]);
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
                if (next.every(Boolean)) {
                  window.sessionStorage.setItem("passengerFadeDone", "1");
                  setFirstLoad(false);
                }
                return next;
              });
            }
          }
        });
      },
      { threshold: 0.1 },
    );
    sectionRefs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });
    return () => observer.disconnect();
  }, []);

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate("/login");
    }
  };

  const brtServices = [
    {
      id: "green",
      name: "Green Line",
      image: greenLineImg,
      description: "Numaish to Abdullah Chowk",
      gradient: "from-emerald-400 to-emerald-600",
      route: "/GreenLine",
    },
    {
      id: "orange",
      name: "Orange Line",
      image: orangeLineImg,
      description: "Orangi to Board Office",
      gradient: "from-orange-400 to-orange-600",
      route: "/OrangeLine",
    },
    {
      id: "redline",
      name: "Red Line",
      image: redLineImg,
      description: "Numaish to Malir Halt",
      gradient: "from-red-500 to-red-700",
      route: "/RedLine",
    },
    {
      id: "yellow",
      name: "Yellow Line",
      image: yellowLineImg,
      description: "Numaish to Dawood Chowrangi",
      gradient: "from-yellow-400 to-yellow-600",
      route: "/YellowLine",
    },
    {
      id: "blue",
      name: "Blue Line",
      image: blueLineImg,
      description: "Al-Asif Square to Tower",
      gradient: "from-blue-400 to-blue-600",
      route: "/BlueLine",
    },
    {
      id: "brown",
      name: "Brown Line",
      image: brownLineImg,
      description: "Korangi to Nagan Chowrangi",
      gradient: "from-amber-700 to-amber-900",
      route: "/BrownLine",
    },
  ];

  const busServices = [
    {
      id: "redbus",
      name: "Peoples Bus Service",
      image: redBusImg,
      description: "City-wide bus network",
      gradient: "from-red-600 to-red-800",
      route: "/RedBus",
    },
    {
      id: "ev",
      name: "EV Bus Service",
      image: evBusImg,
      description: "Eco-friendly electric buses",
      gradient: "from-teal-400 to-teal-600",
      route: "/EVBus",
    },
    {
      id: "pink",
      name: "Pink Bus Service",
      image: pinkBusImg,
      description: "Women-only bus service",
      gradient: "from-pink-400 to-pink-600",
      route: "/PinkBus",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 relative overflow-hidden font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15),transparent_55%),radial-gradient(circle_at_bottom,rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-b from-purple-600/10 to-orange-600/10 blur-3xl pointer-events-none" />

      <div className="absolute top-8 right-6 z-50">
        <Button
          onClick={handleLogout}
          className="text-md hover:scale-105 transition-transform bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-lg"
        >
          <LogOut className="stroke-3 w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="text-center mb-16 mt-8 animate-fade-in-up">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            Select Your{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-orange-500">
              Transit Service
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xl max-w-2xl mx-auto">
            Choose a line to view routes, schedules, and book tickets.
          </p>
        </div>

        {/* BRT Section */}
        <section
          ref={sectionRefs[0]}
          className={`max-w-7xl mx-auto w-full mb-20 transition-opacity duration-1000 ${revealed[0] ? "opacity-100" : firstLoad ? "opacity-0" : "opacity-100"}`}
        >
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-purple-600 rounded-full"></span>
            BRT Corridors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {brtServices.map((service) => (
              <div
                key={service.id}
                onClick={() => navigate(service.route)}
                className="group relative rounded-3xl overflow-hidden cursor-pointer bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1 bg-linear-to-r ${service.gradient}`}
                />
                <div className="h-56 overflow-hidden relative">
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-linear-to-r ${service.gradient} shadow-lg`}
                    >
                      BRT Service
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bus Services Section */}
        <section
          ref={sectionRefs[1]}
          className={`max-w-7xl mx-auto w-full mb-12 transition-opacity duration-1000 ${revealed[1] ? "opacity-100" : firstLoad ? "opacity-0" : "opacity-100"}`}
        >
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-3">
            <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
            Bus Services
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {busServices.map((service) => (
              <div
                key={service.id}
                onClick={() => navigate(service.route)}
                className="group relative rounded-3xl overflow-hidden cursor-pointer bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div
                  className={`absolute top-0 left-0 w-full h-1 bg-linear-to-r ${service.gradient}`}
                />
                <div className="h-56 overflow-hidden relative">
                  <div className="absolute inset-0 bg-linear-to-t from-slate-900/60 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-4 left-4 z-20">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-linear-to-r ${service.gradient} shadow-lg`}
                    >
                      Public Transport
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PassengerPage;
