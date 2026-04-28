import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Music2, Zap, Award, Flame } from 'lucide-react';
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
      message: 'The venue player has accepted your request.',
    };
  }, [error, status]);

  const handleAnother = () => {
    const slug = localStorage.getItem('sdj_lastSlug');
    navigate(slug ? `/jukebox/${slug}` : '/');
  };

  return (
    <div className="overflow-auto w-full min-h-screen" style={{ background: '#07070B' }}>
      <style>{`
        @keyframes burst {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; }
          20% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(720deg) scale(0.4); opacity: 0; }
        }
        @keyframes slideUpCelebration {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes victory-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-20px) scale(1.05); }
          50% { transform: translateY(-40px) scale(1.1); }
          75% { transform: translateY(-20px) scale(1.05); }
        }
        .celebration-slide {
          animation: slideUpCelebration 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards;
          opacity: 0;
        }
        .victory-bounce {
          animation: victory-bounce 1.2s cubic-bezier(0.34,1.56,0.64,1);
        }
      `}</style>
      <div className="max-w-md mx-auto px-6 py-16 space-y-6 relative">
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

        <div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'linear-gradient(135deg, rgba(34,227,161,0.3), rgba(34,227,161,0.1))',
              boxShadow: '0 0 60px rgba(34,227,161,0.5)',
            }}
          >
            <div
              className="inline-flex items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}
            >
              <Music2 size={36} className="text-white" />
            </div>
          </div>
        </div>

        <div className="text-center mb-2 celebration-slide" style={{ animationDelay: '0s' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#FFFFFF', fontFamily: 'Space Grotesk, sans-serif' }}>
            Your song is in the queue
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            The venue player has accepted your request
          </p>
        </div>

        <div className="space-y-2 mb-6 celebration-slide" style={{ animationDelay: '0.2s' }}>
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{
              background: 'rgba(34,227,161,0.1)',
              border: '1px solid rgba(34,227,161,0.35)',
              boxShadow: '0 0 20px rgba(34,227,161,0.25)',
            }}
          >
            <Zap size={18} style={{ color: '#22E3A1' }} />
            <span className="text-xs font-600" style={{ color: '#22E3A1' }}>
              Queued successfully
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <Award size={18} style={{ color: '#A855F7' }} />
            <span className="text-xs font-600" style={{ color: '#A855F7' }}>Spotify queue accepted</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(34,227,161,0.08)', border: '1px solid rgba(34,227,161,0.2)' }}>
            <Flame size={18} style={{ color: '#22E3A1' }} />
            <span className="text-xs font-600" style={{ color: '#22E3A1' }}>You&apos;re all set</span>
          </div>
        </div>

        <div className="card glass-card p-6 space-y-5 celebration-slide" style={{ animationDelay: '0.3s' }}>
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
                  <p className="text-xs text-gray-500">Song Title</p>
                  <p className="font-semibold truncate">{trackName}</p>
                  <p className="text-xs text-gray-500 mt-1">Artist Name</p>
                  <p className="text-sm text-gray-400 truncate">{artist}</p>
                </div>
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

          <div className="pt-5 text-center border-t border-white/10 celebration-slide" style={{ animationDelay: '0.8s' }}>
            <p className="text-xs text-gray-400 mb-2">Need help?</p>
            <a href="mailto:admin@mixmind.co.uk" className="text-sm text-brand-purple hover:opacity-90">
              admin@mixmind.co.uk
            </a>
          </div>
        </div>
      </div>
      <div className="px-6 py-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>© 2025 Your Company. All rights reserved.</p>
      </div>
    </div>
  );
}
