import { useInView } from '../hooks/useInView'

export default function Features() {
  const [ref, isInView] = useInView({ once: true })

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
    }
  ]

  return (
    <section
      ref={ref}
      className="py-10 sm:py-24 bg-bg-base"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Animations */}
      <style>{`
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
        
        {/* Heading */}
        <div
          className="text-center mb-12 sm:mb-16"
          style={{ animation: 'fadeInUp 0.8s ease-out' }}
        >
          <span className="text-purple-400 font-medium text-2xl sm:text-sm uppercase tracking-wider mb-3 block">
            Why MixMind?
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">
            What makes us different
          </h2>
        </div>

        {/* DJ Mode Section */}
        <div className="py-24 relative overflow-hidden">
          <div
            className="hero-glow animate-pulse-glow"
            style={{
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              opacity: 0.25
            }}
          ></div>

          <div className="max-w-5xl mx-auto px-6 relative z-10 -mt-25 sm:mt-0">
            <div className="text-center mb-16">
              <span
                className="text-4xl revenue-text font-semibold tracking-wider uppercase"
                style={{ color: 'var(--revenue-green)' }}
              >
                Introducing
              </span>

              <h2 className="font-display font-bold text-3xl md:text-5xl mt-3">
                DJ Mode —{' '}
                <span style={{ color: 'var(--neon-purple)' }}>
                  Your DJ Stays In Full Control, Zero Disruption
                </span>
              </h2>

              <p
                className="mt-4 text-lg max-w-2xl mx-auto font-bold"
              >
               Empowering DJs to earn more.
              </p>
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-12 -mt-10">
              {[
                {
                  title: 'Full DJ Control',
                  desc: 'All song requests go to the DJ dashboard. DJs can accept or decline requests.',
                   icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                },
                {
                  title: 'No Interruptions',
                  desc: 'No random songs. No broken flow. The DJ stays in control of the vibe.',
                   icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
                },
                {
                  title: 'More Engagement',
                  desc: 'Crowd engagement goes up and DJ controls the experience.',
                   icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-8 border glow-purple"
                  style={{ borderColor: 'var(--border)' }}
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
                    d={item.icon}
                  />
                </svg>
              </div>
                  <h3 className="font-display font-bold text-xl mb-3">
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom Box */}
            <div
              className="glass-card rounded-2xl p-10 text-center border "
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="revenue-text font-bold text-3xl sm:text-4xl block ">Everyone Wins</span>
              <p
                className="text-lg text-white max-w-2xl mx-auto mt-2 font-bold"
              >
                Customers feel involved. DJs stay in control.
                <br />
                <span style={{ color: 'var(--neon-purple)' }}>
                 And the Best Part? - Venues and DJs maximise profits on the night.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        
        <div className="revenue-banner glass-card rounded-2xl p-6  text-center glow-purple relative overflow-hidden -mt-18">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-purple-600/20 to-purple-900/20 animate-pulse"></div>
          <p className="font-display text-xl sm:text-2xl md:text-4xl font-bold relative z-10 px-2">
            £9 Per song in DJ mode and just 45 songs requests per night = <span className="revenue-text text-3xl sm:text-5xl block mt-2">£405 extra revenue</span>
          </p>
        </div>
      </div>
    </section>
  )
}