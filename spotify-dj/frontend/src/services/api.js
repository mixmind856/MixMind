import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:4001";
const API_PREFIX = "/api/jukebox";

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sdj_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Public jukebox ──────────────────────────────────────────

export const getVenueInfo = (slug) => api.get(`${API_PREFIX}/venue/${slug}`);

export const searchTracks = (q, venueSlug) =>
  api.get(`${API_PREFIX}/search`, { params: { q, venueSlug } });

export const createPayment = (body) => api.post(`${API_PREFIX}/create-payment`, body);

export const confirmPayment = (body) => api.post(`${API_PREFIX}/confirm`, body);

export const getRequestStatus = (requestId) => api.get(`${API_PREFIX}/status/${requestId}`);

// ── Venue management ────────────────────────────────────────

export const registerVenue = (body) => api.post(`${API_PREFIX}/venue/register`, body);

export const loginVenue = (body) => api.post(`${API_PREFIX}/venue/login`, body);

export const updateGenres = (allowedGenres) =>
  api.put(`${API_PREFIX}/venue/genres`, { allowedGenres });

export const spotifyLoginUrl = (venueId) =>
  `${BASE}${API_PREFIX}/spotify/login?venueId=${venueId}`;