import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music2, LogIn } from 'lucide-react';
import { loginVenue } from '../services/api';

export default function VenueLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ slug: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await loginVenue(form);
      localStorage.setItem('sdj_token', data.token);
      localStorage.setItem('sdj_venueId', data.venueId);
      localStorage.setItem('sdj_venueSlug', data.slug);
      navigate('/venue-setup');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card glass-card w-full max-w-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-brand-purple to-brand-violet flex items-center justify-center shadow-[0_0_18px_rgba(168,85,247,0.45)]">
            <Music2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Spotify DJ</h1>
            <p className="text-xs text-gray-500 mt-0.5">Venue login</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Venue slug</label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. fabric-london"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1.5">Password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            <LogIn size={16} />
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center">
          New venue?{' '}
          <a href="/venue-setup" className="text-brand-purple hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
