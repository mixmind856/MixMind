import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api/jukebox';

const api = axios.create({ baseURL: BASE });

// Attach venue JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sdj_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Public jukebox ──────────────────────────────────────────

export const getVenueInfo = (slug) => api.get(`/venue/${slug}`);

export const searchTracks = (q, venueSlug) =>
  api.get('/search', { params: { q, venueSlug } });

export const createPayment = (body) => api.post('/create-payment', body);

export const confirmPayment = (body) => api.post('/confirm', body);

export const getRequestStatus = (requestId) => api.get(`/status/${requestId}`);

// ── Venue management ────────────────────────────────────────

export const registerVenue = (body) => api.post('/venue/register', body);

export const loginVenue = (body) => api.post('/venue/login', body);

export const updateGenres = (allowedGenres) =>
  api.put('/venue/genres', { allowedGenres });

export const spotifyLoginUrl = (venueId) =>
  `${BASE}/spotify/login?venueId=${venueId}`;
