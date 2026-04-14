import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Music, Zap, Award, Flame, Info } from "lucide-react";
import logo from "../assets/Mixmind.jpeg";

export default function ThankYou() {
  const navigate = useNavigate();
  const x = useParams().venueId;
  const [djModeEnabled, setDjModeEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [songData, setSongData] = useState({ title: "Electric Dreams", artist: "Luna Waves" });
  const [userEmail, setUserEmail] = useState("");
  const [userLevel, setUserLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch venue data to check DJ mode
  useEffect(() => {
    const fetchVenueData = async () => {
      try {
        if (x) {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/venue/public/${x}`);
          if (response.ok) {
            const venueData = await response.json();
            setDjModeEnabled(venueData.djMode || false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch venue data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenueData();
  }, [x]);

  // Fetch user requests and calculate level
  useEffect(() => {
    const fetchUserRequests = async () => {
      try {
        // Get user email from localStorage
        const email = localStorage.getItem("userEmail");
        if (!email) {
          console.log("❌ No user email found in localStorage");
          return;
        }

        console.log(`✅ Fetching data for email: ${email}`);
        setUserEmail(email);

        // Fetch all requests for this user
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/requests/user/${encodeURIComponent(email)}`
        );

        if (response.ok) {
          const requests = await response.json();
          const count = Array.isArray(requests) ? requests.length : 0;
          console.log(`📊 Total requests: ${count}`);
          console.log(`📋 Requests:`, requests);
          setTotalRequests(count);

          // Calculate level: 1 level per 2 requests
          // Resets every ~1000 requests (500 levels)
          const levelInCycle = count % 1000;
          const currentLevel = Math.floor(levelInCycle / 2) + 1;
          const progressInLevel = (levelInCycle % 2) * 50; // 0% or 50%

          console.log(`🎯 Calculation: levelInCycle=${levelInCycle}, level=${currentLevel}, progress=${progressInLevel}%`);
          setUserLevel(currentLevel);
          setLevelProgress(progressInLevel);
        } else {
          console.error("❌ Failed to fetch requests:", response.status);
        }
      } catch (err) {
        console.error("❌ Failed to fetch user requests:", err);
      }
    };

    // Fetch immediately on mount after venue data loads
    if (!loading) {
      fetchUserRequests();
      
      // Refetch every 3 seconds to catch updates
      const interval = setInterval(fetchUserRequests, 3000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Confetti effect
  useEffect(() => {
    const createConfetti = () => {
      const container = document.getElementById('confetti-container');
      if (!container) return;
      
      const confettiCount = 50;
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        const x = Math.random() * 200 - 100;
        const y = Math.random() * 300 - 150;
        
        confetti.style.setProperty('--tx', x + 'px');
        confetti.style.setProperty('--ty', y + 'px');
        confetti.style.left = '50%';
        confetti.style.top = '30%';
        confetti.style.width = Math.random() * 8 + 4 + 'px';
        confetti.style.height = confetti.style.width;
        confetti.style.borderRadius = '50%';
        confetti.style.backgroundColor = ['#A855F7', '#22E3A1', '#7C3AED'][Math.floor(Math.random() * 3)];
        confetti.style.position = 'fixed';
        confetti.style.pointerEvents = 'none';
        confetti.style.animation = 'burst 2s ease-out forwards';
        
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 2000);
      }
    };

    if (!loading) {
      // Trigger confetti after a short delay
      setTimeout(() => {
        createConfetti();
      }, 300);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07070B] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="overflow-auto w-full min-h-screen" style={{ background: '#07070B' }}>
      <style>{`
        @keyframes victory-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-20px) scale(1.05); }
          50% { transform: translateY(-40px) scale(1.1); }
          75% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes slideUpCelebration {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes entrance-stagger {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes burst {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) rotate(360deg) scale(0);
            opacity: 0;
          }
        }
        @keyframes pulse-achievement {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .victory-bounce {
          animation: victory-bounce 1.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .celebration-slide {
          animation: slideUpCelebration 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards;
          opacity: 0;
        }
        .entrance-stagger {
          animation: entrance-stagger 0.6s ease-out forwards;
        }
        .achievement-pulse {
          animation: pulse-achievement 0.6s cubic-bezier(0.34,1.56,0.64,1);
        }
        .confetti {
          position: fixed;
          pointer-events: none;
          animation: burst 2s ease-out forwards;
        }
        #confetti-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
          :root {
      --bg-deep: #07070B;
      --bg-base: #0B0B12;
      --surface: #121222;
      --border: rgba(255,255,255,0.08);
      --text-primary: #FFFFFF;
      --text-secondary: rgba(255,255,255,0.72);
      --neon-purple: #A855F7;
      --electric-violet: #7C3AED;
      --revenue-green: #22E3A1;
    }

    html, body, .app-wrapper { height: 100%; }
    body { box-sizing: border-box; background: var(--bg-deep); color: var(--text-primary); font-family: 'Outfit', sans-serif; }

    * { scrollbar-width: thin; scrollbar-color: var(--neon-purple) var(--bg-deep); }

    .font-display { font-family: 'Space Grotesk', sans-serif; }

    .glass-card {
      background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%);
      backdrop-filter: blur(24px);
      border: 1px solid var(--border);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .glow-button {
      background: linear-gradient(135deg, var(--neon-purple) 0%, var(--electric-violet) 100%);
      box-shadow: 0 8px 50px rgba(168,85,247,0.6), 0 0 80px rgba(168,85,247,0.3), 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
      position: relative;
      overflow: hidden;
    }
    .glow-button::before {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
      transition: left 0.6s;
    }
    .glow-button:hover::before { left: 100%; }
    .glow-button:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 12px 60px rgba(168,85,247,0.55), 0 0 100px rgba(168,85,247,0.3), 0 8px 30px rgba(0,0,0,0.4);
    }
    .glow-button:active { transform: translateY(-2px) scale(1.01); }

    .feature-card {
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), 0 0 1px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .feature-card:hover {
      transform: translateY(-12px) scale(1.03);
      box-shadow: 0 20px 80px rgba(168,85,247,0.45), 0 8px 40px rgba(168,85,247,0.25), 0 0 100px rgba(168,85,247,0.15), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1);
      border-color: rgba(168,85,247,0.6) !important;
    }

    .step-card {
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    .step-card:hover {
      transform: scale(1.05) translateY(-6px);
      box-shadow: 0 20px 60px rgba(168,85,247,0.35), 0 8px 30px rgba(0,0,0,0.5);
    }

    .stat-card {
      background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.62) 100%);
      border: 1px solid var(--border);
      transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow: 0 8px 40px rgba(0,0,0,0.4), 0 0 1px rgba(168,85,247,0.2);
    }
    .stat-card:hover {
      transform: translateY(-6px) scale(1.05);
      box-shadow: 0 12px 60px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.15), 0 8px 30px rgba(0,0,0,0.5);
      border-color: rgba(168,85,247,0.4) !important;
    }

    .hero-glow {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
    }

    .nav-link {
      color: var(--text-secondary);
      transition: color 0.2s;
      font-size: 0.9rem;
    }
    .nav-link:hover { color: var(--text-primary); }

    .badge-pill {
      background: rgba(168,85,247,0.12);
      border: 1px solid rgba(168,85,247,0.3);
      color: #C084FC;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 4px 14px;
      border-radius: 999px;
      display: inline-block;
      text-transform: uppercase;
    }

    .green-badge {
      background: rgba(34,227,161,0.1);
      border: 1px solid rgba(34,227,161,0.25);
      color: var(--revenue-green);
    }

    .waveform-bar {
      width: 3px;
      border-radius: 2px;
      background: var(--neon-purple);
      animation: wave 1.2s ease-in-out infinite;
    }
    @keyframes wave {
      0%, 100% { transform: scaleY(0.4); opacity: 0.5; }
      50% { transform: scaleY(1); opacity: 1; }
    }

    .gradient-text {
      background: linear-gradient(135deg, #C084FC 0%, #A855F7 40%, #22E3A1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .section-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(168,85,247,0.3), transparent);
    }

    .orbit-ring {
      border: 1px solid rgba(168,85,247,0.15);
      border-radius: 50%;
      position: absolute;
      animation: rotate-slow 20s linear infinite;
    }
    @keyframes rotate-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .floating {
      animation: float 6s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-12px); }
    }

    /* Confetti burst animation */
    @keyframes burst {
      0% {
        transform: translate(0, 0) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(var(--tx), var(--ty)) rotate(360deg) scale(0);
        opacity: 0;
      }
    }

    .confetti {
      position: fixed;
      pointer-events: none;
      animation: burst 2s ease-out forwards;
    }

    /* Pulse achievement animation */
    @keyframes pulse-achievement {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .achievement-pulse {
      animation: pulse-achievement 0.6s cubic-bezier(0.34,1.56,0.64,1);
    }

    /* Slide up celebration */
    @keyframes slideUpCelebration {
      0% {
        transform: translateY(60px);
        opacity: 0;
      }
      100% {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .celebration-slide {
      animation: slideUpCelebration 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }

    /* Victory animation */
    @keyframes victoryBounce {
      0%, 100% { transform: translateY(0) scale(1); }
      25% { transform: translateY(-20px) scale(1.05); }
      50% { transform: translateY(-40px) scale(1.1); }
      75% { transform: translateY(-20px) scale(1.05); }
    }

    .victory-bounce {
      animation: victoryBounce 1.2s cubic-bezier(0.34,1.56,0.64,1);
    }

    /* Shine effect */
    @keyframes shine {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .shine-effect {
      position: relative;
      overflow: hidden;
    }

    .shine-effect::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shine 2s;
    }

    /* Progress bar fill animation */
    @keyframes fillProgress {
      from { width: 0%; }
      to { width: var(--progress, 0%); }
    }

    .progress-fill {
      animation: fillProgress 1.5s ease-out forwards;
    }

        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(34,227,161,0.4); }
          50% { box-shadow: 0 0 40px rgba(34,227,161,0.8); }
        }

        .glow-pulse {
          animation: glowPulse 2s ease-in-out infinite;
        }

    /* Streak counter animation */
    @keyframes counterPop {
      0% { transform: scale(0.5); opacity: 0; }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }

    .counter-pop {
      animation: counterPop 0.6s cubic-bezier(0.34,1.56,0.64,1);
    }

    /* Entrance stagger */
    @keyframes entranceSlide {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .entrance-stagger {
      animation: entranceSlide 0.6s ease-out forwards;
    }

    .entrance-stagger:nth-child(1) { animation-delay: 0.1s; }
    .entrance-stagger:nth-child(2) { animation-delay: 0.2s; }
    .entrance-stagger:nth-child(3) { animation-delay: 0.3s; }
    .entrance-stagger:nth-child(4) { animation-delay: 0.4s; }

    /* Tooltip styles */
    .tooltip-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .tooltip-icon {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(34,227,161,0.08);
      border: 1px solid rgba(34,227,161,0.08);
      cursor: help;
      transition: all 0.2s;
    }

    .tooltip-icon:hover {
      background: rgba(168,85,247,0.3);
      border-color: rgba(168,85,247,0.6);
    }

    .tooltip-content {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(18,18,34,0.95);
      border: 1px solid rgba(168,85,247,0.4);
      color: #C084FC;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
      white-space: nowrap;
      margin-bottom: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      z-index: 10;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    .tooltip-wrapper:hover .tooltip-content {
      opacity: 1;
    }

    .tooltip-content::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: rgba(168,85,247,0.4);
    }

    /* Fade in animation */
    .fade-in {
      opacity: 0;
      transform: translateY(20px);
      animation: fadeInUp 0.7s ease forwards;
    }
    @keyframes fadeInUp {
      to { opacity: 1; transform: translateY(0); }
    }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }
    .delay-4 { animation-delay: 0.4s; }
    .delay-5 { animation-delay: 0.5s; }
    .delay-6 { animation-delay: 0.6s; }

    /* App screen specific */
    .step-item {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
      background: rgba(168,85,247,0.2);
      color: var(--neon-purple);
      border: 1px solid rgba(168,85,247,0.3);
    }

    .step-content h4 {
      margin: 0;
      font-weight: 600;
      font-size: 16px;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .step-content p {
      margin: 0;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .trust-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .trust-item i {
      color: var(--revenue-green);
      flex-shrink: 0;
    }

    .app-select {
      width: 100%;
      padding: 14px 16px;
      border-radius: 14px;
      background: rgba(168,85,247,0.1);
      border: 1px solid var(--border);
      color: var(--text-primary);
      font-size: 15px;
      font-family: 'Outfit', sans-serif;
      cursor: pointer;
      transition: all 0.2s;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23A855F7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 40px;
    }

    .app-select:hover {
      border-color: rgba(168,85,247,0.5);
      background-color: rgba(168,85,247,0.15);
    }

    .app-select:focus {
      outline: none;
      border-color: #A855F7;
      box-shadow: 0 0 20px rgba(168,85,247,0.3);
    }

    .app-select option {
      background: var(--bg-deep);
      color: var(--text-primary);
    }
      `}</style>

      <div id="confetti-container"></div>

      <section className="px-6 py-16">
        <div className="max-w-md mx-auto">
          {/* Victory Icon */}
                   
        <div>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 victory-bounce" style={{
            background: 'linear-gradient(135deg, rgba(34,227,161,0.3), rgba(34,227,161,0.1))',
            boxShadow: '0 0 60px rgba(34,227,161,0.5)'
          }}>
            
             <div className="inline-flex items-center justify-center  rounded-lg  glow-purple " 
                         style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
                     <img src={logo} alt="MixMind Logo" className="w-17 h-17" />
                    </div>
          </div>
             </div>

          {/* Title & Subtitle */}
          <div className="celebration-slide" style={{ animationDelay: '0s' }}>
            <h1 className="text-3xl font-bold text-center mb-2" style={{ color: '#FFFFFF', fontFamily: 'Space Grotesk, sans-serif' }}>You're in the queue 🎶</h1>
            <p className="text-center text-sm mb-8" style={{ color: 'rgba(255,255,255,0.72)' }}>Your song has been successfully requested</p>
          </div>

          {/* Bonus Badges */}
          <div className="space-y-2 mb-6" style={{ animation: 'slideUpCelebration 1s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
            <div className="entrance-stagger flex items-center gap-3 p-3 rounded-xl achievement-pulse" style={{ background: 'rgba(34,227,161,0.08)', border: '1px solid rgba(34,227,161,0.2)', animationDelay: '0.2s' }}>
              <Zap size={18} style={{ color: '#22E3A1' }} />
              <span className="text-xs font-600" style={{ color: '#22E3A1' }}>Request 1 song to unlock 1 free request 🎁</span>
            </div>
            <div className="entrance-stagger flex items-center gap-3 p-3 rounded-xl achievement-pulse" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', animationDelay: '0.3s' }}>
              <Award size={18} style={{ color: '#A855F7' }} />
              <span className="text-xs font-600" style={{ color: '#A855F7' }}>+10 XP Earned</span>
            </div>
            <div className="entrance-stagger flex items-center gap-3 p-3 rounded-xl achievement-pulse" style={{ background: 'rgba(34,227,161,0.08)', border: '1px solid rgba(34,227,161,0.2)', animationDelay: '0.4s' }}>
              <Flame size={18} style={{ color: '#22E3A1' }} />
              <span className="text-xs font-600" style={{ color: '#22E3A1' }}>You're on a roll! 🔥</span>
            </div>
          </div>

          {/* Level Progress */}
          <div className="p-4 rounded-xl mb-6 celebration-slide" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-600" style={{ color: 'rgba(255,255,255,0.5)' }}>Level Progress</p>
              <div className="flex items-center gap-2 tooltip-wrapper">
                <p className="text-xs font-bold" style={{ color: '#A855F7', fontFamily: 'Space Grotesk, sans-serif' }}>Level {userLevel}</p>
                <div className="tooltip-icon" style={{ color: '#22E3A1' }}>
                  <Info size={18} style={{ color: '#22E3A1' }} />
                </div>
                <div className="tooltip-content">
                  Free request every 2 requests!
                </div>
              </div>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: 'rgba(168,85,247,0.2)', overflow: 'hidden' }}>
              <div className="h-full" style={{ background: 'linear-gradient(90deg, #A855F7, #22E3A1)', width: `${levelProgress}%`, transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)', '--progress': `${levelProgress}%` }}></div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {2 - (totalRequests % 2)} more {totalRequests % 2 === 0 ? "request" : "requests"} to next free request
            </p>
          </div>

          {/* Song Details */}
          <div className="space-y-3 p-4 rounded-xl mb-6 celebration-slide" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', animationDelay: '0.4s', position: 'relative', overflow: 'hidden' }}>
            <div>
              <p className="text-xs font-600" style={{ color: 'rgba(255,255,255,0.5)' }}>Song Title</p>
              <p className="text-sm font-600" style={{ color: '#FFFFFF' }}>{songData.title}</p>
            </div>
            <div>
              <p className="text-xs font-600" style={{ color: 'rgba(255,255,255,0.5)' }}>Artist Name</p>
              <p className="text-sm font-600" style={{ color: '#FFFFFF' }}>{songData.artist}</p>
            </div>
          </div>

          {/* Estimated Play Time */}
          {/* Estimated Play Time */}
          <div className="mb-6 celebration-slide" style={{ animationDelay: '0.5s' }}>
            <div className="p-4 rounded-xl glow-pulse" style={{ 
              background: 'rgba(34,227,161,0.08)', 
              border: '1px solid rgba(34,227,161,0.4)',
              boxShadow: '0 0 20px rgba(34,227,161,0.3)' /* Base static glow */
            }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Estimated Play Time</p>
              <p className="font-bold text-lg" style={{ color: '#22E3A1', fontFamily: 'Space Grotesk, sans-serif' }}>5–10 minutes</p>
            </div>
          </div>

          {/* Confirmation Text */}
          <p className="text-xs text-center mb-6 px-2 celebration-slide" style={{ color: 'rgba(255,255,255,0.5)', animationDelay: '0.6s' }}>Check your email for confirmation if your song has been approved</p>

          {/* Request Another Song Button */}
          <button
            onClick={() => navigate(`/venue-request/${x}`)}
            className="w-full text-white font-bold py-3 rounded-2xl text-sm mb-3 celebration-slide transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
              boxShadow: '0 8px 50px rgba(168,85,247,0.6), 0 0 80px rgba(168,85,247,0.3), 0 4px 20px rgba(0,0,0,0.3)',
              animationDelay: '0.7s',
              fontFamily: 'Space Grotesk, sans-serif'
            }}>
            Request Another Song
          </button>

          {/* Help Section */}
          <div className="mt-6 pt-6 text-center celebration-slide" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', animationDelay: '0.8s' }}>
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>Need help?</p>
            <a
              href="mailto:hello@yourcompany.com"
              className="text-sm font-600"
              style={{ color: '#A855F7', textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.target.style.opacity = '0.8'}
              onMouseOut={(e) => e.target.style.opacity = '1'}>
              hello@yourcompany.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="px-6 py-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>© 2025 Your Company. All rights reserved.</p>
      </div>
    </div>
  );
}
