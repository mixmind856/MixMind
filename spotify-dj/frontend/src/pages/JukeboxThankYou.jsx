import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Music2, Zap } from 'lucide-react';
import { getRequestStatus } from '../services/api';

const SAFE_ALBUM =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="%23121222"/><circle cx="150" cy="150" r="56" fill="%23A855F7" fill-opacity="0.35"/></svg>';

export default function JukeboxThankYou() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError('Missing request ID.');
      setLoading(false);
      return;
    }

    let mounted = true;
    getRequestStatus(requestId)
      .then(({ data }) => {
        if (!mounted) return;
        setStatusData(data?.request || data);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Unable to load your request status right now.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [requestId]);

  useEffect(() => {
    if (!loading && !error) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 1800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading, error]);

  const status = statusData?.status || 'queued';
  const trackName = statusData?.trackName || 'Song requested';
  const artist = statusData?.artistName || 'Unknown';
  const albumArt = statusData?.albumArtUrl || SAFE_ALBUM;
  const queuePosition = statusData?.queuePosition;

  const statusUi = useMemo(() => {
    if (error) {
      return {
        icon: <XCircle size={24} className="text-red-300" />,
        chipClass: 'bg-red-950/40 border-red-900/50 text-red-300',
        title: 'Something went wrong',
        message: error,
      };
    }

    if (status === 'genre_rejected') {
      return {
        icon: <AlertTriangle size={24} className="text-red-300" />,
        chipClass: 'bg-red-950/40 border-red-900/50 text-red-300',
        title: 'Request not queued',
        message: 'This track did not match venue genre rules. Your payment has been refunded automatically.',
      };
    }

    if (status === 'failed') {
      return {
        icon: <XCircle size={24} className="text-red-300" />,
        chipClass: 'bg-red-950/40 border-red-900/50 text-red-300',
        title: 'Request failed',
        message: 'We could not process this request. Any hold is released automatically.',
      };
    }

    return {
      icon: <CheckCircle2 size={24} className="text-brand-mint" />,
      chipClass: 'bg-brand-mint/10 border-brand-mint/25 text-brand-mint',
      title: 'Your song is in the queue',
      message: 'Your request is in the queue and will play soon.',
    };
  }, [error, status]);

  const handleAnother = () => {
    const slug = localStorage.getItem('sdj_lastSlug');
    navigate(slug ? `/jukebox/${slug}` : '/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-black via-brand-dark to-brand-dark px-4 py-10">
      <div className="max-w-lg mx-auto space-y-6 relative">
        {confetti && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(28)].map((_, i) => (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full animate-ping"
                style={{
                  left: `${5 + (i * 13) % 90}%`,
                  top: `${5 + (i * 9) % 70}%`,
                  background: i % 2 ? '#A855F7' : '#22E3A1',
                  animationDuration: `${0.8 + (i % 4) * 0.25}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="card glass-card p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-brand-purple/15 blur-3xl" />
          <div className="flex items-start justify-between gap-4 relative">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">MixMind Jukebox</p>
              <h1 className="text-3xl font-bold mt-1">You&apos;re in the queue</h1>
              <p className="text-sm text-gray-400 mt-1">Your song has been successfully requested</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-gradient-to-r from-brand-purple to-brand-violet flex items-center justify-center shadow-[0_0_18px_rgba(168,85,247,0.45)]">
              <Music2 size={18} className="text-white" />
            </div>
          </div>
        </div>

        <div className="card glass-card p-6 space-y-5">
          {loading ? (
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
              <span>Checking your request status…</span>
            </div>
          ) : (
            <>
              <div className={`inline-flex items-center gap-2 border rounded-full px-3 py-1 text-xs ${statusUi.chipClass}`}>
                {statusUi.icon}
                <span className="uppercase tracking-wide">{status.replace('_', ' ')}</span>
              </div>

              <div>
                <h2 className="text-2xl font-bold">{statusUi.title}</h2>
                <p className="text-sm text-gray-400 mt-1">{statusUi.message}</p>
              </div>

              <div className="rounded-xl border border-brand-mint/30 bg-brand-mint/10 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-brand-mint uppercase tracking-wide">Queue position</p>
                  <p className="text-lg font-bold text-brand-mint">
                    {queuePosition ? `#${queuePosition}` : 'Pending update'}
                  </p>
                </div>
                <Zap size={18} className="text-brand-mint" />
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-brand-border bg-brand-black/40 p-3">
                <img
                  src={albumArt}
                  alt={trackName}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = SAFE_ALBUM;
                  }}
                  className="w-16 h-16 rounded-xl object-cover bg-brand-card/60"
                />
                <div className="min-w-0">
                  <p className="font-semibold truncate">{trackName}</p>
                  <p className="text-sm text-gray-400 truncate">{artist}</p>
                </div>
              </div>

              <div className="rounded-xl border border-brand-purple/25 bg-brand-purple/10 p-3">
                <p className="text-xs text-brand-purple uppercase tracking-wide mb-2">Spotify status</p>
                <select className="input py-2 text-sm" value={status} readOnly>
                  <option value={status}>{status.replace('_', ' ')}</option>
                </select>
              </div>

              <div className="flex items-end gap-1 h-8">
                {[8, 14, 22, 11, 18, 9, 16, 12, 20, 10].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-brand-purple/70 animate-pulse"
                    style={{ height: `${h}px`, animationDelay: `${i * 0.08}s` }}
                  />
                ))}
              </div>
            </>
          )}

          <button type="button" onClick={handleAnother} className="btn-primary w-full">
            Request another song
          </button>
        </div>
      </div>
    </div>
  );
}
