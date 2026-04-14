import { useInView } from '../hooks/useInView'

export default function VenueTypes() {
  const [ref, isInView] = useInView({ once: true })
  const venues = [
    { name: 'Bars & Pubs', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { name: 'Nightclubs', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
    { name: 'Student Venues', icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
    { name: 'Lounges', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { name: 'Event Spaces', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
  ]
  const features = [
    {
      title: 'AI Auto-Mixer',
      desc: 'Seamless transitions, no silence, professional DJ-like feel — all automated.',
      icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
    },
    {
      title: 'Fully Automated',
      desc: 'Zero approvals, zero manual control. Set it up once and let it run.',
      icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
    },
    {
      title: 'Copyright-Safe',
      desc: 'Fully licensed streaming. No Spotify, no personal accounts, no fines.',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    },
    {
      title: 'Built for Venues',
      desc: 'Designed specifically for bars, clubs, lounges, and student venues.',
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
    },
    {
  title: 'Revenue-First Design',
  desc: ' Music becomes a profit centre. Every request generates revenue.',
  // Modern Cash/Banknote Icon
  icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
}

  ]

  return (
    <section ref={ref} className=" sm:py-24 bg-bg-base" style={{ background: 'var(--bg-base)' }}>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .venue-tile-item {
          animation: slideIn 0.6s ease-out both;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .venue-tile-item:nth-child(1) { animation-delay: ${isInView ? '0.1s' : '0'}; animation-name: slideIn; }
        .venue-tile-item:nth-child(2) { animation-delay: ${isInView ? '0.2s' : '0'}; animation-name: slideInRight; }
        .venue-tile-item:nth-child(3) { animation-delay: ${isInView ? '0.3s' : '0'}; animation-name: slideIn; }
        .venue-tile-item:nth-child(4) { animation-delay: ${isInView ? '0.4s' : '0'}; animation-name: slideInRight; }
        .venue-tile-item:nth-child(5) { animation-delay: ${isInView ? '0.5s' : '0'}; animation-name: slideIn; }
        
        .venue-tile-item:hover {
          transform: translateY(-8px) scale(1.05);
          border-color: rgba(168, 85, 247, 0.6);
          box-shadow: 0 10px 50px rgba(168, 85, 247, 0.3);
        }
           @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .feature-card-item {
          opacity: 0;
        }

        .feature-card-item.animate {
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .feature-card-item:hover {
          transform: translateY(-12px) scale(1.02);
          transition: all 0.3s ease;
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          <span className="text-purple-400 font-medium text-xs sm:text-sm uppercase tracking-wider mb-3 block">Perfect For</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Built for UK nightlife venues</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={`feature-card-item glass-card rounded-2xl p-6 ${
                isInView ? 'animate' : ''
              }`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-purple-500/20">
                <svg
                  className="w-7 h-7 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={feature.icon}
                  />
                </svg>
              </div>

              <h3 className="font-display text-xl font-bold mb-3">
                {feature.title}
              </h3>

              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {feature.desc}
              </p>
            </div>
          ))}

          {/* Revenue Card */}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-5">
          {venues.map((venue, idx) => (
            <div key={idx} className="venue-tile-item venue-tile glass-card rounded-2xl p-4 sm:p-6 text-center">
              <div className="w-12 sm:w-16 h-12 sm:h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 sm:mb-4" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
                <svg className="w-5 sm:w-8 h-5 sm:h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={venue.icon} />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-sm sm:text-base">{venue.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
