import { useInView } from '../hooks/useInView'

export default function Problems() {
  const [ref, isInView] = useInView({ once: true })
  const problems = [
    {
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      title: 'Music costs money but generates no revenue',
      desc: 'Licensing, equipment, and playlists are pure overhead and generate £0 revenue.'
    },
    {
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      title: 'DJs are expensive and not always available',
      desc: 'You\'re paying Djs £200-£400 a night...with no direct return.'
    },
    {
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      title: 'Copyright fines from personal accounts',
      desc: 'Using Spotify or YouTube in commercial venues risks serious penalties.'
    },
    {
      icon: 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z',
      title: 'Dead air and inconsistent vibe',
      desc: 'Awkward silences and jarring transitions kill the atmosphere.'
    },
    {
      icon: 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6',
      title: 'Rising UK venue costs',
      desc: 'Every margin is shrinking while overheads keep climbing.'
    },
    {
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      title: 'Unmanageable song requests',
      desc: 'Staff can\'t handle customer requests while serving.'
    }
  ]

  return (
    <section ref={ref} className="py-16 sm:py-24 bg-bg-base" style={{ background: 'var(--bg-base)' }}>
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
        
        .problem-card {
          animation: ${isInView ? 'fadeInUp 0.6s ease-out both' : 'none'};
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .problem-card:nth-child(1) { animation-delay: ${isInView ? '0.1s' : '0'}; }
        .problem-card:nth-child(2) { animation-delay: ${isInView ? '0.2s' : '0'}; }
        .problem-card:nth-child(3) { animation-delay: ${isInView ? '0.3s' : '0'}; }
        .problem-card:nth-child(4) { animation-delay: ${isInView ? '0.4s' : '0'}; }
        .problem-card:nth-child(5) { animation-delay: ${isInView ? '0.5s' : '0'}; }
        .problem-card:nth-child(6) { animation-delay: ${isInView ? '0.6s' : '0'}; }
        
        .problem-card:hover {
          transform: translateY(-12px) scale(1.02);
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          <span className="text-purple-400 font-medium text-xs sm:text-sm uppercase tracking-wider mb-3 block">The Nightlife Reality</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">The challenges you face every night</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {problems.map((problem, idx) => (
            <div key={idx} className="problem-card glass-card feature-card rounded-2xl p-5 sm:p-6 hologram-effect">
              <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center mb-3 sm:mb-4" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                <svg className="w-5 sm:w-6 h-5 sm:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={problem.icon} />
                </svg>
              </div>
              <h3 className="font-display font-semibold text-base sm:text-lg mb-1 sm:mb-2">{problem.title}</h3>
              <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>{problem.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
