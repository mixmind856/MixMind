import { useInView } from '../hooks/useInView'

export default function Hero() {
  const [ref, isInView] = useInView({ once: true })
  
  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-10">
      <style>{`
        .cyber-grid {
          background-image: 
            linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          position: absolute;
          inset: 0;
          opacity: 0.4;
          animation: gridScroll 20s linear infinite;
        }
        
        @keyframes gridScroll {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        
        .waveform-bg {
          position: absolute;
          width: 100%;
          height: 100%;
          opacity: 0.1;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 1200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 100 Q50 20 100 100 T200 100 T300 100 T400 100 T500 100 T600 100 T700 100 T800 100 T900 100 T1000 100 T1100 100 T1200 100' stroke='%23A855F7' stroke-width='2' fill='none'/%3E%3C/svg%3E") repeat-x;
          animation: wave 20s linear infinite;
        }
        
        @keyframes wave {
          0% { background-position-x: 0; }
          100% { background-position-x: 1200px; }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(60px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .hero-title {
          animation: ${isInView ? 'fadeInDown 1s ease-out' : 'none'};
        }
        
        .hero-subtitle {
          animation: ${isInView ? 'fadeInDown 1s ease-out 0.2s both' : 'none'};
        }
        
        .hero-buttons {
          animation: ${isInView ? 'fadeInDown 1s ease-out 0.4s both' : 'none'};
        }
        
        .hero-chips {
          animation: ${isInView ? 'fadeInDown 1s ease-out 0.6s both' : 'none'};
        }
        
        .trust-chip {
          animation: ${isInView ? 'slideInRight 0.8s ease-out both' : 'none'};
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .trust-chip:nth-child(1) { animation-delay: ${isInView ? '0.7s' : '0'}; }
        .trust-chip:nth-child(2) { animation-delay: ${isInView ? '0.8s' : '0'}; }
        .trust-chip:nth-child(3) { animation-delay: ${isInView ? '0.9s' : '0'}; }
        
        .trust-chip:hover {
          transform: translateY(-4px) scale(1.05);
          border-color: var(--neon-purple);
          box-shadow: 0 8px 20px rgba(168, 85, 247, 0.3);
        }
      `}</style>

      <div className="cyber-grid"></div>
      <div className="waveform-bg"></div>

      <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-to-r from-purple-900 via-purple-600 to-purple-900 rounded-full blur-3xl opacity-20 pointer-events-none animate-pulse"></div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center py-12 sm:py-20">
        <h1 className="hero-title font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6 neon-flicker">
          Turn music from a cost<br className="hidden sm:block" />
          into a <span className="gradient-text">revenue stream</span>.
        </h1>

        <p className="hero-subtitle text-lg sm:text-xl md:text-2xl mb-6 sm:mb-10 max-w-3xl mx-auto px-2" style={{ color: 'var(--text-secondary)' }}>
          Earn £100-£300 extra per night from customer song requests - Fully automated, zero staff, plug in and forget.
        </p>

        <div className="hero-buttons flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-10 px-2">
          <a href="#waitlist" className="glow-button px-6 sm:px-12 py-3 sm:py-6 rounded-full font-display font-bold text-lg sm:text-2xl tracking-wide w-full sm:w-auto" style={{ boxShadow: '0 8px 50px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.25), 0 4px 20px rgba(0, 0, 0, 0.3)' }}>
            <span className="flex items-center justify-center gap-2">
              Maximise My Venue's Profits
              <svg className="w-5 sm:w-6 h-5 sm:h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </a>
          <a href="#how-it-works" className="px-6 sm:px-8 py-3 sm:py-4 rounded-full font-display font-medium text-base sm:text-lg border-2 border-white/30 hover:border-purple-400/60 hover:bg-white/5 transition-all duration-300 hover:scale-105 w-full sm:w-auto">
            See How It Works
          </a>
        </div>

        <div className="hero-chips flex flex-wrap gap-2 sm:gap-3 justify-center px-2">
          <div className="trust-chip px-3 sm:px-4 py-2 rounded-full flex items-center gap-2 text-xs sm:text-sm">
            <svg className="w-3 sm:w-4 h-3 sm:h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Works With or Without DJ
          </div>
          <div className="trust-chip px-3 sm:px-4 py-2 rounded-full flex items-center gap-2 text-xs sm:text-sm">
            <svg className="w-3 sm:w-4 h-3 sm:h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Fully automated
          </div>
          <div className="trust-chip px-3 sm:px-4 py-2 rounded-full flex items-center gap-2 text-xs sm:text-sm">
            <svg className="w-3 sm:w-4 h-3 sm:h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Copyright-safe music
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 float-animation">
        <svg className="w-5 sm:w-6 h-5 sm:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  )
}
