import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function LoginModal({ isOpen, onClose, type }) {

  const navigate = useNavigate()

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/venue/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Signin failed")
        return
      }

      localStorage.setItem("venueToken", data.token)
      localStorage.setItem("venueId", data.venue.id)

      setSubmitted(true)

      setTimeout(() => {
        onClose()
        navigate("/venue/dashboard")
      }, 1500)

    } catch (err) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const isCustomer = type === "customer"

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">

      <div className="glass-card rounded-3xl p-6 sm:p-10 max-w-md w-full glow-purple relative">

        <button onClick={onClose} className="absolute top-6 right-6">
          ✕
        </button>

        {!submitted ? (
          <>
            <h3 className="text-2xl font-bold mb-6 text-center">
              {isCustomer ? "Customer Login" : "Venue Login"}
            </h3>

            {error && (
              <p className="text-red-400 text-center mb-3">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              <input
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                className="input-field w-full px-4 py-3 rounded-xl"
                required
              />

              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="input-field w-full px-4 py-3 rounded-xl"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="glow-button w-full py-3 rounded-xl font-bold"
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold mb-2">Login Successful!</h3>
            <p>Welcome back to MixMind</p>
          </div>
        )}

      </div>
    </div>
  )
}