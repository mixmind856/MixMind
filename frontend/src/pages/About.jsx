export default function About() {
  return (
    <div className="relative min-h-screen text-white">

      {/* HERO */}
      <section className="px-10 py-24 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl font-extrabold leading-tight mb-6">
          Turn music from a <span className="text-purple-400">cost</span> into a{" "}
          <span className="text-purple-400">revenue stream</span>.
        </h1>

        <p className="text-gray-300 text-lg max-w-3xl mx-auto mb-10">
          MixMind is an AI-powered song request system that lets customers pay to
          request songs — fully automated, plug-and-forget.
        </p>

        <button className="bg-purple-600 hover:bg-purple-700 transition px-10 py-4 rounded-full text-lg font-semibold">
          Maximise My Venue’s Profits
        </button>
      </section>

      {/* SOLUTION */}
      <section className="relative px-10 py-24">
        <div className="absolute top-0 left-0 w-full h-28 
          bg-gradient-to-b from-[#0a0712] to-transparent" />

        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            The MixMind Solution
          </h2>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <Step number="1" title="Scan the QR" desc="Customers scan a QR code." />
            <Step number="2" title="Request & Pay" desc="They choose a song and pay." />
            <Step number="3" title="AI Plays It" desc="Automatically mixed & played." />
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="relative px-10 py-24">
        <div className="absolute top-0 left-0 w-full h-28 
          bg-gradient-to-b from-black to-transparent" />

        <h2 className="text-3xl font-bold text-center mb-12">
          Built for venues like yours
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto text-center">
          <Tile label="Bars & Pubs" />
          <Tile label="Nightclubs" />
          <Tile label="Student Venues" />
          <Tile label="Lounges" />
          <Tile label="Event Spaces" />
        </div>
      </section>
    </div>
  );
}

/* ---------- COMPONENTS ---------- */

function Step({ number, title, desc }) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-8
      hover:border-purple-400/40
      hover:bg-purple-500/10
      hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]
      transition cursor-pointer">
      <div className="text-purple-400 text-3xl font-bold mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-6
      hover:-translate-y-1 hover:border-purple-400/40 hover:bg-purple-500/10
      hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]
      transition cursor-pointer">
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}

function Tile({ label }) {
  return (
    <div className="bg-black/40 border border-white/10 rounded-xl py-6 font-medium
      hover:-translate-y-1 hover:border-purple-400/40 hover:bg-purple-500/10
      hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]
      transition cursor-pointer">
      {label}
    </div>
  );
}
