require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB } = require('./db');
const jukeboxRoutes = require('./features/jukebox/jukebox.routes');

const app = express();
const PORT = process.env.PORT || 4001;

// Stripe webhooks need raw body – mount before bodyParser
app.use('/api/jukebox/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5174',
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(bodyParser.json());

app.use('/api/jukebox', jukeboxRoutes);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'spotify-dj' }));

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Spotify-DJ API running on port ${PORT}`);
    console.log(`[Server] SPOTIFY_CLIENT_ID set: ${!!process.env.SPOTIFY_CLIENT_ID}`);
    console.log(`[Server] STRIPE_SECRET_KEY set:  ${!!process.env.STRIPE_SECRET_KEY}`);
    console.log(`[Server] LASTFM_API_KEY set:     ${!!process.env.LASTFM_API_KEY}`);
  });
});
