const songs = ["Stay", "Lean On", "Party Rock Anthem", "Don't You Worry Child"];

export default function PopularSongs() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-lg">
      <h3 className="font-semibold mb-4">Popular Songs</h3>

      <ul className="space-y-3 text-sm">
        {songs.map((song, i) => (
          <li
            key={i}
            className="flex justify-between items-center text-gray-300"
          >
            🎵 {song}
            <span className="text-purple-400">›</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
