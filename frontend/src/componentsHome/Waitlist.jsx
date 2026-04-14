import { useState } from 'react'
import { useInView } from '../hooks/useInView'

export default function Waitlist() {
  const [submitted, setSubmitted] = useState(false)
  const [ref, isInView] = useInView({ once: true })
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    venueName: '',
    email: '',
    phone: '',
    venueType: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/venue/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to submit waitlist form')
      }

      const data = await response.json()
      console.log('✅ Waitlist submission successful:', data)

      // Show success message
      setSubmitted(true)
      
      // Reset form
      setFormData({
        name: '',
        venueName: '',
        email: '',
        phone: '',
        venueType: ''
      })

      // Hide success message after 4 seconds
      setTimeout(() => {
        setSubmitted(false)
      }, 4000)
    } catch (err) {
      console.error('❌ Waitlist submission error:', err)
      alert('Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section ref={ref} id="waitlist" className="py-16 sm:py-24 relative bg-bg-deep" style={{ background: 'var(--bg-deep)' }}>
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
        
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .waitlist-badge {
          animation: ${isInView ? 'fadeInUp 0.8s ease-out' : 'none'};
        }
        
        .waitlist-title {
          animation: ${isInView ? 'fadeInUp 0.8s ease-out 0.1s both' : 'none'};
        }
        
        .waitlist-desc {
          animation: ${isInView ? 'fadeInUp 0.8s ease-out 0.2s both' : 'none'};
        }
        
        .waitlist-form {
          animation: ${isInView ? 'fadeInUp 0.8s ease-out 0.3s both' : 'none'};
        }
        
        .success-message {
          animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .input-field {
          transition: all 0.3s ease;
        }
        
        .input-field:focus {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(168, 85, 247, 0.2);
        }
      `}</style>
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-900 via-purple-600 to-purple-900 rounded-full blur-3xl opacity-20 pointer-events-none animate-pulse"></div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 text-center">
        <div className="waitlist-badge mb-4">
          <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xl sm:text-sm font-medium" 
                style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--neon-purple)' }}>
            🚀 Ready to see this in your venue?
          </span>
        </div>

        <h2 className="waitlist-title font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">Don't let your busiest nights go to waste.</h2>
        <p className="waitlist-desc text-base sm:text-xl mb-6 sm:mb-8 px-2" style={{ color: 'var(--text-secondary)' }}>
          We're currently onboarding early venues for exclusive access. Join the waitlist to secure your spot.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="waitlist-form glass-card rounded-2xl p-6 sm:p-10 glow-purple relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-purple-900/10"></div>
            <div className="relative z-10">
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <input 
                  type="text"
                  name="name"
                  placeholder="Your name" 
                  className="input-field w-full px-4 sm:px-6 py-4 sm:py-5 rounded-xl font-body text-base sm:text-lg"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input 
                  type="text"
                  name="venueName"
                  placeholder="Venue name" 
                  className="input-field w-full px-4 sm:px-6 py-4 sm:py-5 rounded-xl font-body text-base sm:text-lg"
                  value={formData.venueName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <input 
                  type="email"
                  name="email"
                  placeholder="Email address" 
                  className="input-field w-full px-4 sm:px-6 py-4 sm:py-5 rounded-xl font-body text-base sm:text-lg"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <input 
                  type="tel"
                  name="phone"
                  placeholder="Phone number" 
                  className="input-field w-full px-4 sm:px-6 py-4 sm:py-5 rounded-xl font-body text-base sm:text-lg"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
                <select 
                  name="venueType"
                  className="input-field w-full px-4 sm:px-6 py-4 sm:py-5 rounded-xl font-body text-base sm:text-lg"
                  value={formData.venueType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Venue type</option>
                  <option value="bar">Bar / Pub</option>
                  <option value="club">Nightclub</option>
                  <option value="student">Student Venue</option>
                  <option value="lounge">Lounge</option>
                  <option value="event">Event Space</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="glow-button w-full px-6 sm:px-8 py-4 sm:py-5 rounded-full font-display font-bold text-base sm:text-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Join the Early Access Waitlist →'}
              </button>
              <p className="text-xs sm:text-sm mt-3 sm:mt-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                No commitment required. We'll be in touch soon.
              </p>
            </div>
          </form>
        ) : (
          <div className="success-message glass-card rounded-2xl p-6 sm:p-8 glow-purple">
            <div className="w-12 sm:w-16 h-12 sm:h-16 mx-auto rounded-full flex items-center justify-center mb-3 sm:mb-4" 
                 style={{ background: 'rgba(34, 227, 161, 0.15)' }}>
              <svg className="w-6 sm:w-8 h-6 sm:h-8" style={{ color: 'var(--revenue-green)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-1 sm:mb-2">You're on the list!</h3>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm sm:text-base">We'll be in touch soon with early access details.</p>
          </div>
        )}
      </div>
    </section>
  )
}
