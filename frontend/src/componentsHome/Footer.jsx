import logo from "../assets/Mixmind.jpeg";

export default function Footer() {
  return (
    <footer className="py-6 sm:py-12 bg-bg-base border-t" style={{ background: 'var(--bg-base)', borderTopColor: 'var(--border)' }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.4));
          }
          50% {
            filter: drop-shadow(0 0 16px rgba(168, 85, 247, 0.8));
          }
        }
        
        @keyframes hover-lift {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
          100% {
            transform: translateY(0);
          }
        }
        
        .footer-container {
          animation: fadeInUp 0.8s ease-out;
        }
        
        .footer-logo {
          animation: fadeInUp 0.8s ease-out 0.1s both, glow-pulse 4s ease-in-out infinite;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .footer-logo:hover {
          transform: scale(1.1) rotate(5deg);
          filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.8));
        }
        
        .footer-text {
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }
        
        .footer-email {
          position: relative;
          display: inline-block;
          animation: fadeInUp 0.8s ease-out 0.3s both;
        }
        
        .footer-email::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--neon-purple), var(--electric-violet));
          transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        }
        
        .footer-email:hover::after {
          width: 100%;
        }
        
        .footer-email:hover {
          transform: translateX(4px);
          text-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
        }
        
        .footer-info {
          animation: fadeInUp 0.8s ease-out 0.4s both;
        }
        
        .footer-brand {
          animation: fadeInUp 0.8s ease-out 0.2s both;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s ease;
        }
        
        .footer-brand:hover {
          transform: scale(1.05);
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 footer-container ">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="footer-brand">
            <img src={logo} alt="MixMind Logo" className="footer-logo w-8 sm:w-10 h-8 sm:h-10 rounded-lg" />
            <span className="font-display font-bold text-lg sm:text-xl">MixMind</span>
          </div>

          <div className="footer-text text-center md:text-right">
            <a href="mailto:admin@mixmind.co.uk" className="footer-email text-purple-400 hover:text-purple-300 transition-colors text-sm sm:text-base">
              admin@mixmind.co.uk
            </a>
            <p className="footer-info text-xs sm:text-sm mt-1 sm:mt-2" style={{ color: 'var(--text-secondary)' }}>
              © Harmony Technologies Ltd. All rights reserved.
            </p>
            <p className="text-xs mt-0.5 sm:mt-1" style={{ color: 'var(--text-secondary)' }}>
              UK-based company
            </p>
             <button onClick={() => window.location.href ="https://docs.google.com/forms/d/e/1FAIpQLSfc7wQEONAs0n6PlzU10OxFul9Xpx-U0djknWBWNL2yHrAOjg/viewform"} className="footer-email text-purple-400 hover:text-purple-300 transition-colors text-sm sm:text-base">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
