import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Music, Mail, Lock, User, Phone } from "lucide-react";
import logo from "../assets/Mixmind.jpeg";

export default function DJAuth() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    stripeId: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validation
      if (!formData.email || !formData.password) {
        setError("Email and password are required");
        setLoading(false);
        return;
      }

      if (isSignup) {
        if (!formData.name) {
          setError("Name is required");
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
      }

      const endpoint = isSignup ? "/signup" : "/user-login";
      const payload = isSignup
        ? {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            stripeId: formData.stripeId
          }
        : {
            email: formData.email,
            password: formData.password
          };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/dj${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Authentication failed");
        setLoading(false);
        return;
      }

      // Save token and dj info
      localStorage.setItem("djToken", data.djToken);
      localStorage.setItem("djId", data.djId);
      localStorage.setItem("djEmail", data.email);
      localStorage.setItem("djName", data.name);

      // Redirect to venue selection
      navigate("/dj/select-venue/");
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center px-4">
      <style>{`
        :root {
          --bg-deep: #07070B;
          --surface: #121222;
          --border: rgba(255,255,255,0.08);
          --text-primary: #FFFFFF;
          --text-secondary: rgba(255,255,255,0.72);
          --neon-purple: #A855F7;
          --electric-violet: #7C3AED;
          --revenue-green: #22E3A1;
        }

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

        .glow-button:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 60px rgba(168,85,247,0.55), 0 0 100px rgba(168,85,247,0.3), 0 8px 30px rgba(0,0,0,0.4);
        }

        .input-field {
          background: rgba(168,85,247,0.1);
          border: 1px solid var(--border);
          color: var(--text-primary);
          transition: all 0.2s;
        }

        .input-field:focus {
          outline: none;
          border-color: var(--neon-purple);
          box-shadow: 0 0 20px rgba(168,85,247,0.3);
          background: rgba(168,85,247,0.15);
        }
      `}</style>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-lg mb-4 glow-purple" 
               style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
           <img src={logo} alt="MixMind Logo" className="w-17 h-17" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MixMind DJ</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
            {isSignup ? "Create your DJ account" : "Login to your DJ account"}
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 mb-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <p className="text-sm" style={{ color: "#FCA5A5" }}>{error}</p>
            </div>
          )}

          {/* Name Field (Signup Only) */}
          {isSignup && (
            <div className="mb-4">
              <label className="block text-sm font-600 mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Full Name
              </label>
              <div className="flex items-center">
                <User size={16} className="mr-2" style={{ color: "#A855F7" }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="input-field flex-1 px-4 py-3 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div className="mb-4">
            <label className="block text-sm font-600 mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              Email Address
            </label>
            <div className="flex items-center">
              <Mail size={16} className="mr-2" style={{ color: "#A855F7" }} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="input-field flex-1 px-4 py-3 rounded-lg"
              />
            </div>
          </div>

          {/* Phone Field (Signup Only) */}
          {isSignup && (
            <div className="mb-4">
              <label className="block text-sm font-600 mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Phone Number
              </label>
              <div className="flex items-center">
                <Phone size={16} className="mr-2" style={{ color: "#A855F7" }} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className="input-field flex-1 px-4 py-3 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Stripe ID Field (Signup Only) */}
          {isSignup && (
            <div className="mb-4">
              <label className="block text-sm font-600 mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Stripe Customer ID (Optional)
              </label>
              <input
                type="text"
                name="stripeId"
                value={formData.stripeId}
                onChange={handleChange}
                placeholder="cus_xxxxxx"
                className="input-field w-full px-4 py-3 rounded-lg"
              />
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Leave empty if you don't have one yet</p>
            </div>
          )}

          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-600 mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
              Password
            </label>
            <div className="flex items-center">
              <Lock size={16} className="mr-2" style={{ color: "#A855F7" }} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="input-field flex-1 px-4 py-3 rounded-lg"
              />
            </div>
          </div>

          {/* Confirm Password Field (Signup Only) */}
          {isSignup && (
            <div className="mb-6">
              <label className="block text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                Confirm Password
              </label>
              <div className="flex items-center">
                <Lock size={16} className="mr-2" style={{ color: "#A855F7" }} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="input-field flex-1 px-4 py-3 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="glow-button w-full text-white font-bold py-3 rounded-lg mb-4 transition-all"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Please wait..." : isSignup ? "Create DJ Account" : "Login"}
          </button>
        </form>

        {/* Toggle Between Login and Signup */}
        <div className="text-center">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
            {isSignup ? "Already have an account?" : "Don't have an account?"}
            {" "}
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setFormData({
                  name: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  phone: "",
                  stripeId: ""
                });
              }}
              className="font-bold hover:opacity-80 transition-opacity"
              style={{ color: "#A855F7" }}
            >
              {isSignup ? "Login here" : "Sign up here"}
            </button>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-xs hover:opacity-80 transition-opacity"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
