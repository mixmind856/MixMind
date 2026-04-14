import { motion } from "framer-motion";
import { Search } from "lucide-react";
import RandomQR from "../components/RandomQr";

const songs = [
  { title: "Stay", artist: "The Kid LAROI" },
  { title: "Lean On", artist: "Major Lazer & DJ Snake" },
  { title: "Party Rock Anthem", artist: "LMFAO" },
  { title: "Don't You Worry", artist: "Swedish House Mafia" },
];

export default function RequestSongSection() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden text-white px-6">

      {/* 🌌 Ambient club background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.35),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(236,72,153,0.25),_transparent_60%)]" />

      <div className="relative grid md:grid-cols-2 gap-66 max-w-6xl items-center">

        {/* 📱 PHONE UI */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="mx-auto w-[320px] rounded-[38px] bg-[#12081f] border border-white/10
                     shadow-[0_0_90px_rgba(168,85,247,0.45)] overflow-hidden"
        >
          {/* Header */}
          <div className="py-4 text-center font-semibold border-b border-white/10">
            Request a Song
          </div>

          {/* Search bar */}
          <div className="p-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 text-gray-400">
              <Search size={16} />
              <input
                placeholder="Search for songs..."
                className="bg-transparent outline-none text-sm flex-1"
              />
            </div>
          </div>

          {/* Song list */}
          <div className="px-4 space-y-3">
            {songs.map((song, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white/5 rounded-xl p-3"
              >
                <div>
                  <p className="text-sm font-medium">{song.title}</p>
                  <p className="text-xs text-gray-400">{song.artist}</p>
                </div>

                <button className="bg-purple-600 hover:bg-purple-700 transition text-xs px-4 py-1 rounded-full">
                  Request
                </button>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="p-4">
            <button className="w-full bg-purple-600 hover:bg-purple-700 transition py-3 rounded-xl font-semibold">
              REQUEST
            </button>
          </div>
        </motion.div>

        {/* 📟 QR STAND */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="hidden md:flex flex-col items-center text-center
                     bg-white/5 backdrop-blur-lg border border-white/10
                     rounded-2xl p-6
                     shadow-[0_0_70px_rgba(168,85,247,0.35)]"
        >
          <h3 className="text-xl font-bold mb-4 tracking-wide">
            REQUEST A SONG
          </h3>

          {/* QR placeholder */}
          <RandomQR />


          <p className="text-sm text-gray-300">
            Scan to request music
          </p>
        </motion.div>

      </div>
    </div>
  );
}
