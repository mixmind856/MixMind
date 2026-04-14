const requests = [
  { name: "Ella", song: "Blinding Lights", artist: "The Weeknd" },
  { name: "James", song: "Levels", artist: "Avicii" },
  { name: "Lily", song: "One Kiss", artist: "Dua Lipa" },
];

export default function RequestList() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-lg">
      <div className="flex justify-between mb-6">
        <h3 className="font-semibold">Active QR Requests</h3>
        <span className="text-gray-400 text-sm">‹ 800K ›</span>
      </div>

      <div className="space-y-4">
        {requests.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-black/30 rounded-xl p-4"
          >
            <div>
              <p className="font-medium">{r.name} requested</p>
              <p className="text-sm text-gray-400">
                {r.song} • {r.artist}
              </p>
            </div>

            <button className="px-5 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 transition">
              APPROVE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
