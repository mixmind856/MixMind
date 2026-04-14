import { useState } from "react";
import logo from "../assets/Mixmind.jpeg";
import { useNavigate } from "react-router-dom"

export default function Navigation({ onLoginClick }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <img src={logo} alt="MixMind Logo" className="w-8 sm:w-10 h-8 sm:h-10" />
          <span className="font-display font-bold text-lg sm:text-xl">
            MixMind
          </span>
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/browse-venues")}
            className="glow-button  px-5 py-2.5 rounded-full font-medium text-sm border-2 transition-all hover:scale-105 text-gray-300 cursor-pointer"
            style={{ borderColor: "rgba(168, 85, 247, 0.5)" }}
          >
            Request a Song
          </button>

          <button
            onClick={() => navigate("/dj/auth")}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 transition-all hover:scale-105 text-gray-300 cursor-pointer"
            style={{ borderColor: "rgba(168, 85, 247, 0.5)" }}
          >
            DJ Login
          </button>

          <button
            onClick={() => onLoginClick("venue")}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 transition-all hover:scale-105 text-gray-300 cursor-pointer"
            style={{ borderColor: "rgba(168, 85, 247, 0.5)" }}
          >
            Venue Login
          </button>

          {/* <button
             onClick={() => navigate("/admin/dashboard")}
            className="px-5 py-2.5 rounded-full font-medium text-sm border-2 transition-all hover:scale-105 text-gray-300 cursor-pointer"
            style={{ borderColor: "rgba(168, 85, 247, 0.5)" }}
          >
           Admin
          </button> */}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3">
          <button
            onClick={() => navigate("/browse-venues")}
            className="w-full px-4 py-2 glow-button text-gray-300 rounded-2xl"
          >
            Request a Song
          </button>

          <button
            onClick={() => navigate("/dj/auth")}
            className="w-full px-4 py-2 border text-gray-300 rounded-2xl"
          >
            DJ Login
          </button>

          <button
            onClick={() => onLoginClick("venue")}
            className="w-full px-4 py-2 border text-gray-300 rounded-2xl"
          >
            Venue Login
          </button>

          {/* <button
            onClick={() => navigate("/admin/dashboard")}
            className="w-full text-center  px-4 py-2 rounded-lg border  text-white"
          >
            Admin
          </button> */}
        </div>
      )}
    </nav>
  );
}
