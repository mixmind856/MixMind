import { motion } from "framer-motion";
import { QrCode, Users, Smartphone, Menu, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Dj from "../assets/Dj.png";

export default function Home() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div
      id="home"
      className="relative min-h-screen text-white"
    >
      {/* ================= HEADER ================= */}
      <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="flex items-center justify-between px-6 md:px-10 py-4">

          {/* Logo */}
          <h1 className="text-2xl font-bold text-purple-400">
            MixMind
          </h1>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-8 text-sm text-gray-300">
            <a href="#home" className="hover:text-white transition">Home</a>
            <a href="#about" className="hover:text-white transition">How it Works</a>
            <a href="#request" className="hover:text-white transition">Request</a>
            <a href="#dashboard" className="hover:text-white transition">Dashboard</a>
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="text-yellow-400 hover:text-yellow-300 transition font-medium"
            >
              Admin
            </button>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <PrimaryButton>Get Started</PrimaryButton>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-gray-300"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {open && (
          <div className="md:hidden bg-black/90 border-t border-white/10 px-6 py-6 space-y-4 text-gray-300">
            <a href="#home" onClick={() => setOpen(false)} className="block hover:text-white">Home</a>
            <a href="#about" onClick={() => setOpen(false)} className="block hover:text-white">How it Works</a>
            <a href="#features" onClick={() => setOpen(false)} className="block hover:text-white">Features</a>
            <a href="#request" onClick={() => setOpen(false)} className="block hover:text-white">Request</a>
            <button
              onClick={() => {
                navigate("/admin/dashboard");
                setOpen(false);
              }}
              className="block text-yellow-400 hover:text-yellow-300 font-medium w-full text-left"
            >
              Admin Dashboard
            </button>

            <PrimaryButton className="w-full mt-4">
              Get Started
            </PrimaryButton>
          </div>
        )}
      </header>

      {/* ================= HERO ================= */}
      <section className="relative grid md:grid-cols-2 gap-12 px-6 md:px-10 pt-32 pb-20 items-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-6xl font-extrabold leading-tight">
            Revolutionize Your <br /> Music Experience
          </h2>

          <p className="mt-6 text-gray-300 max-w-lg">
            Empower your guests to request songs instantly using QR codes.
          </p>

          <div className="mt-10 flex gap-4 flex-wrap">
            <PrimaryButton className="px-10 py-4 text-lg">
              Get Started
            </PrimaryButton>
            <SecondaryButton 
              className="px-10 py-4 text-lg"
              onClick={() => navigate("/browse-venues")}
            >
              Browse Venues
            </SecondaryButton>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-purple-600/20 blur-3xl rounded-full" />
          <img
            src={Dj}
            alt="DJ"
            className="relative rounded-2xl shadow-2xl"
          />
        </motion.div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="grid md:grid-cols-3 gap-8 px-6 md:px-10 pb-24">
        <Feature
          icon={<QrCode size={30} />}
          title="Interactive Experience"
          desc="Connect guests to the music with QR codes."
        />
        <Feature
          icon={<Users size={30} />}
          title="Boost Engagement"
          desc="Let the crowd control the vibe."
        />
        <Feature
          icon={<Smartphone size={30} />}
          title="Real-Time Control"
          desc="Approve or reject requests instantly."
        />
      </section>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function PrimaryButton({ children, className = "" }) {
  return (
    <button
      className={`bg-purple-600 hover:bg-purple-700 transition rounded-full px-6 py-2 font-medium ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-transparent border border-purple-500 text-purple-300 hover:bg-purple-600/20 hover:text-purple-200 transition rounded-full px-6 py-2 font-medium ${className}`}
    >
      {children}
    </button>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="
      bg-white/5 
      border border-white/10 
      backdrop-blur-lg 
      rounded-2xl 
      p-8 
      text-center
      transition-all
      hover:-translate-y-1
      hover:border-purple-400/40
      hover:bg-purple-500/10
      hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]
      cursor-pointer
    ">
      <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-purple-600/20 text-purple-400">
        {icon}
      </div>

      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}
