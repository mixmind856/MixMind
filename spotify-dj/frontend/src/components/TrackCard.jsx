import React from 'react';
import { Music, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function TrackCard({ track, onSelect, selected }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(track)}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
        ${selected
          ? 'bg-brand-purple/20 border border-brand-purple/50'
          : 'hover:bg-brand-card/70'
        }`}
    >
      {/* Album art */}
      <div className="relative flex-shrink-0">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.album}
            className="w-14 h-14 rounded-lg object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-brand-card/70 flex items-center justify-center">
            <Music size={20} className="text-gray-500" />
          </div>
        )}
        {selected && (
          <div className="absolute inset-0 rounded-lg bg-brand-purple/25 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-brand-purple animate-pulse" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate ${selected ? 'text-brand-purple' : 'text-white'}`}>
          {track.name}
        </p>
        <p className="text-sm text-gray-400 truncate">{track.artists}</p>
        <p className="text-xs text-gray-500 truncate">{track.album}</p>
      </div>

      {/* Duration */}
      {track.durationMs > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
          <Clock size={12} />
          <span>{formatDuration(track.durationMs)}</span>
        </div>
      )}
    </motion.div>
  );
}
