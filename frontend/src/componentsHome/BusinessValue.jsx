import { useInView } from '../hooks/useInView'

export default function BusinessValue() {
  const [ref, isInView] = useInView({ once: true })
  const benefits = [
    {
      title: 'Earn £3+ per song, every night',
      desc: 'Direct revenue from music requests'
    },
    {
      title: 'Customers stay longer',
      desc: 'More time means more bar spend'
    },
    {
      title: 'No DJ costs on quieter nights',
      desc: 'Consistent quality without the overhead'
    },
    {
      title: 'Zero operational effort',
      desc: 'Set it up once and forget about it'
    }
  ]

  return (
    <section ref={ref} className="py-16 sm:py-24 relative bg-bg-deep" style={{ background: 'var(--bg-deep)' }}>
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
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .stat-item {
          animation: ${isInView ? 'scaleIn 0.6s ease-out both' : 'none'};
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .stat-item:nth-child(1) { animation-delay: ${isInView ? '0.2s' : '0'}; }
        .stat-item:nth-child(2) { animation-delay: ${isInView ? '0.3s' : '0'}; }
        .stat-item:nth-child(3) { animation-delay: ${isInView ? '0.4s' : '0'}; }
        
        .stat-item:hover {
          transform: scale(1.08) translateY(-8px);
        }
        
        .benefit-item {
          animation: ${isInView ? 'fadeInUp 0.6s ease-out both' : 'none'};
        }
        
        .benefit-item:nth-child(1) { animation-delay: ${isInView ? '0.1s' : '0'}; }
        .benefit-item:nth-child(2) { animation-delay: ${isInView ? '0.2s' : '0'}; }
        .benefit-item:nth-child(3) { animation-delay: ${isInView ? '0.3s' : '0'}; }
        .benefit-item:nth-child(4) { animation-delay: ${isInView ? '0.4s' : '0'}; }
        
        .revenue-banner {
          animation: ${isInView ? 'fadeInUp 0.8s ease-out 0.6s both' : 'none'};
        }
      `}</style>
      
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-900 via-purple-600 to-purple-900 rounded-full blur-3xl opacity-20 pointer-events-none animate-pulse"></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 sm:mb-16" style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          {/* <span className="text-purple-400 font-medium text-xs sm:text-sm uppercase tracking-wider mb-3 block">The Bottom Line</span> */}
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold">Real results for your venue</h2>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="stat-item stat-card glass-card rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-5xl md:text-6xl font-display font-bold revenue-text mb-1 sm:mb-2">
              £3+
            </div>
            <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>per request</p>
          </div>
          <div className="stat-item stat-card glass-card rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-5xl md:text-6xl font-display font-bold gradient-text mb-1 sm:mb-2">
              0
            </div>
            <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>staff effort</p>
          </div>
          <div className="stat-item stat-card glass-card rounded-2xl p-6 sm:p-8 text-center">
            <div className="text-4xl sm:text-5xl md:text-6xl font-display font-bold gradient-text mb-1 sm:mb-2">
              5-10
            </div>
            <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>min auto-play</p>
          </div>
        </div>

        {/* Benefits List */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 mb-8 sm:mb-12" style={{ animation: 'fadeInUp 0.8s ease-out 0.3s both' }}>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="benefit-item flex items-start gap-3 sm:gap-4">
                <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg flex items-center justify-center shrink-0" 
                     style={{ background: 'rgba(34, 227, 161, 0.15)' }}>
                  <svg className="w-4 sm:w-5 h-4 sm:h-5" style={{ color: 'var(--revenue-green)' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-display font-semibold mb-0.5 sm:mb-1 text-md sm:text-xl">{benefit.title}</h4>
                  <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Example Banner */}
        <div className="revenue-banner glass-card rounded-2xl p-6 sm:p-10 text-center glow-purple relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-purple-600/20 to-purple-900/20 animate-pulse"></div>
          <p className="font-display text-xl sm:text-2xl md:text-4xl font-bold relative z-10 px-2">
            Just 50 song requests per night = <span className="revenue-text text-3xl sm:text-5xl block mt-2">£150 extra revenue</span>
          </p>
        </div>
      </div>
    </section>
  )
}
