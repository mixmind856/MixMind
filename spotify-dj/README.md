# Spotify DJ – Venue Jukebox

A standalone venue jukebox where guests search Spotify, select a song, and pay
via a Stripe **pre-authorisation hold**. The song is genre-checked using
**Last.fm** and an internal genre map before the card is ever charged.

- Genre **matches** → payment captured → song added to Spotify queue.
- Genre **doesn't match** → hold voided automatically → **no charge**.

> **Completely isolated from MixMind.** See [`MERGE_INTO_MIXMIND.md`](./MERGE_INTO_MIXMIND.md)
> for a 2-line merge guide and a 2-line removal guide.

---

## Project structure

```
spotify-dj/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   ├── .env.example
│   ├── features/
│   │   └── jukebox/
│   │       ├── jukebox.routes.js       ← all API routes
│   │       └── jukebox.controller.js   ← route handlers
│   ├── services/
│   │   ├── spotify.service.js          ← OAuth + search + queue
│   │   ├── stripe.service.js           ← pre-auth, capture, cancel
│   │   ├── lastfm.service.js           ← tag lookup
│   │   └── genreCheck.service.js       ← genre matching logic
│   ├── models/
│   │   ├── JukeboxRequest.js
│   │   └── VenueConfig.js
│   ├── middleware/
│   │   └── venueAuth.js
│   └── data/
│       └── genreMap.json               ← synonym/alias map
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    └── src/
        ├── main.jsx                    ← routes
        ├── styles/index.css
        ├── services/api.js
        ├── pages/
        │   ├── Jukebox.jsx             ← public guest-facing page
        │   ├── VenueLogin.jsx
        │   └── VenueSetup.jsx          ← Spotify connect + genre picker
        └── components/
            ├── SearchBar.jsx
            ├── TrackCard.jsx
            ├── PaymentModal.jsx        ← Stripe Elements
            └── StatusModal.jsx         ← success / genre rejection
```

---

## Payment flow

```
Guest selects track
       ↓
POST /api/jukebox/create-payment
  → Stripe PaymentIntent (capture_method: manual)  ← hold placed, NOT charged
       ↓
Guest enters card details (Stripe Elements)
       ↓
stripe.confirmPayment() → status: requires_capture
       ↓
POST /api/jukebox/confirm
  → Fetch Last.fm tags for track + artist
  → Normalise via genreMap.json → canonical genres
  → Compare with venue.allowedGenres
       ↓
  MATCH?
  ├── YES → stripe.capture() → add to Spotify queue → 200 { approved: true }
  └── NO  → stripe.cancel()  → 422 { approved: false, reason, detectedGenres }
```

---

## Quick start

### 1. Prerequisites

- Node 20+
- MongoDB running locally (`mongod`) or a MongoDB Atlas URI
- A [Spotify Developer App](https://developer.spotify.com/dashboard) with redirect URI set
- A [Stripe account](https://dashboard.stripe.com) (test mode is fine)
- A [Last.fm API account](https://www.last.fm/api/account/create) (free)

### 2. Backend

```bash
cd spotify-dj/backend
npm install
cp .env.example .env
# Fill in .env values
npm run dev
# API running on http://localhost:4001
```

### 3. Frontend

```bash
cd spotify-dj/frontend
npm install
cp .env.example .env
# Set VITE_STRIPE_PUBLISHABLE_KEY
npm run dev
# App running on http://localhost:5174
```

### 4. Register a venue

Hit `POST http://localhost:4001/api/jukebox/venue/register`:

```json
{
  "name": "Test Venue",
  "slug": "test-venue",
  "password": "secret",
  "allowedGenres": ["pop", "hip-hop", "electronic"]
}
```

Or use the UI at `http://localhost:5174/venue-setup`.

### 5. Connect Spotify

Log into `http://localhost:5174/venue-login`, then go to Venue Setup and click
**Connect Spotify**. This runs the OAuth flow and stores tokens against your venue.

### 6. Share jukebox URL

`http://localhost:5174/jukebox/test-venue`

---

## API reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/jukebox/spotify/login?venueId=` | — | Redirect to Spotify OAuth |
| GET | `/api/jukebox/spotify/callback` | — | OAuth callback (Spotify redirects here) |
| GET | `/api/jukebox/search?q=&venueSlug=` | — | Search Spotify tracks |
| GET | `/api/jukebox/venue/:slug` | — | Get public venue info |
| POST | `/api/jukebox/create-payment` | — | Create Stripe pre-auth PaymentIntent |
| POST | `/api/jukebox/confirm` | — | Genre check + capture or cancel |
| GET | `/api/jukebox/status/:requestId` | — | Poll request status |
| POST | `/api/jukebox/venue/register` | — | Register new venue |
| POST | `/api/jukebox/venue/login` | — | Venue login → JWT |
| PUT | `/api/jukebox/venue/genres` | JWT | Update allowed genres |

---

## Env vars

### Backend (`backend/.env`)

| Var | Required | Description |
|-----|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `SPOTIFY_CLIENT_ID` | ✅ | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | ✅ | Spotify app client secret |
| `SPOTIFY_REDIRECT_URI` | ✅ | Must match Spotify dashboard setting |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (sk_test_... or sk_live_...) |
| `LASTFM_API_KEY` | ✅ | Last.fm API key |
| `FRONTEND_URL` | ✅ | Used for OAuth redirects (e.g. http://localhost:5174) |
| `JWT_SECRET` | ✅ | Secret for venue JWT signing |
| `PORT` | — | Default: 4001 |

### Frontend (`frontend/.env`)

| Var | Required | Description |
|-----|----------|-------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key (pk_test_... or pk_live_...) |
| `VITE_API_URL` | — | API base URL; leave empty in dev (Vite proxy handles it) |

---

## Merging into / removing from MixMind

See **[MERGE_INTO_MIXMIND.md](./MERGE_INTO_MIXMIND.md)**.
