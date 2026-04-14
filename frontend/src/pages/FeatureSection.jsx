import { Brain, BarChart3, Settings } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section className="relative bg-linear-to-b from-[#1a0b2e] via-[#140821] to-black text-white py-24 px-6">
      
      {/* Glow background */}
      <div className="absolute inset-0 bg-purple-700/20 blur-3xl opacity-30" />

      <div className="relative max-w-6xl mx-auto text-center">
        {/* Heading */}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Beat-Synced Playlists That Keep Crowds Moving.
        </h2>
        <p className="text-gray-300 max-w-2xl mx-auto mb-16">
          MixMind adjusts the music based on crowd mood and your sales data.
        </p>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-10 mb-20">
          <FeatureCard
            icon={<Brain size={34} />}
            title="AI Music Automation"
            desc="Reads the room and adjusts music in real-time to match the vibe and drive spending."
          />
          <FeatureCard
            icon={<BarChart3 size={34} />}
            title="Revenue Analytics"
            desc="Track sales peaks and playlist performance, find out what works best."
          />
          <FeatureCard
            icon={<Settings size={34} />}
            title="Easy Setup & Control"
            desc="Integrates seamlessly with your sound system. Control via app or dashboard."
          />
        </div>

        {/* CTA */}
        <div className="border-t border-white/10 pt-14">
          <h3 className="text-2xl font-semibold mb-3">
            Join the Waitlist for Early Access
          </h3>
          <p className="text-gray-400 mb-8">
            Be the first to experience MixMind’s AI-driven music automation before the full public launch.
          </p>

          <PrimaryButton>
            Get Early Access
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Feature Card ---------------- */

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-lg hover:bg-white/10 transition">
      <div className="mb-4 flex justify-center text-purple-400">
        {icon}
      </div>
      <h4 className="text-lg font-semibold mb-2">{title}</h4>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  );
}
function PrimaryButton({ children, className = "" }) {
  return (
    <button
      className={`bg-purple-600 hover:bg-purple-700 p-2 transition rounded-3xl cursor-pointer font-medium ${className}`}
    >
      {children}
    </button>
  );
}
