# Merging Spotify DJ into MixMind

This feature is fully isolated. To add it to MixMind you touch **exactly 2 lines**
in existing files and copy a folder. To remove it you undo those same 2 lines.

---

## How to merge (add)

### Step 1 — Copy backend feature files

```bash
# From repo root
cp -r spotify-dj/backend/features/jukebox   mixmind/backend/features/jukebox
cp -r spotify-dj/backend/services/*         mixmind/backend/services/
cp    spotify-dj/backend/models/JukeboxRequest.js  mixmind/backend/models/
cp    spotify-dj/backend/models/VenueConfig.js     mixmind/backend/models/
cp    spotify-dj/backend/data/genreMap.json        mixmind/backend/data/
cp    spotify-dj/backend/middleware/venueAuth.js   mixmind/backend/middleware/
```

> **Note:** `spotify.service.js`, `stripe.service.js`, `lastfm.service.js`,
> `genreCheck.service.js` are all standalone — they do not import from any
> MixMind service. The `venueAuth.js` middleware only references jsonwebtoken
> (already a MixMind dep).

### Step 2 — Add ONE line to `backend/server.js`

Find where MixMind mounts its routes and add this immediately after the last
`app.use('/api/...')` call:

```js
// ── Spotify DJ Jukebox (isolated feature) ──────────────────
if (process.env.JUKEBOX_ENABLED === 'true') {
  const jukeboxRoutes = require('./features/jukebox/jukebox.routes');
  app.use('/api/jukebox', jukeboxRoutes);
  console.log('[Server] Jukebox feature: ENABLED');
}
```

The `JUKEBOX_ENABLED` env-var flag means it is **opt-in** — the feature is
dormant in production until you set the flag.

### Step 3 — Copy frontend page

```bash
cp -r spotify-dj/frontend/src/pages/Jukebox.jsx       mixmind/frontend/src/pages/
cp -r spotify-dj/frontend/src/components/SearchBar.jsx    mixmind/frontend/src/components/
cp -r spotify-dj/frontend/src/components/TrackCard.jsx    mixmind/frontend/src/components/
cp -r spotify-dj/frontend/src/components/PaymentModal.jsx mixmind/frontend/src/components/
cp -r spotify-dj/frontend/src/components/StatusModal.jsx  mixmind/frontend/src/components/
cp     spotify-dj/frontend/src/services/api.js            mixmind/frontend/src/services/jukeboxApi.js
```

### Step 4 — Add ONE line to `frontend/src/main.jsx`

Find the `<Routes>` block and add:

```jsx
{/* Spotify DJ Jukebox – remove this line to disable */}
<Route path="/jukebox/:venueSlug" element={<Jukebox />} />
```

Also add the import at the top:

```jsx
import Jukebox from './pages/Jukebox';
```

### Step 5 — Add env vars

Append to `backend/.env`:

```
# ── Spotify DJ Jukebox ──────────────────────────────────────
JUKEBOX_ENABLED=true
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://yourapi.com/api/jukebox/spotify/callback
LASTFM_API_KEY=your_lastfm_api_key
# STRIPE_SECRET_KEY already exists in MixMind — no need to add again
```

Append to `frontend/.env`:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...   # already exists in MixMind — check name
```

---

## How to remove (eject)

1. Delete the copied directories/files:

```bash
rm -rf mixmind/backend/features/jukebox
rm     mixmind/backend/models/JukeboxRequest.js
rm     mixmind/backend/models/VenueConfig.js
rm     mixmind/backend/services/spotify.service.js
rm     mixmind/backend/services/stripe.service.js   # only if you added it; MixMind may have its own
rm     mixmind/backend/services/lastfm.service.js
rm     mixmind/backend/services/genreCheck.service.js
rm     mixmind/backend/middleware/venueAuth.js       # only if MixMind doesn't have one
rm     mixmind/backend/data/genreMap.json
rm     mixmind/frontend/src/pages/Jukebox.jsx
rm     mixmind/frontend/src/components/SearchBar.jsx
rm     mixmind/frontend/src/components/TrackCard.jsx
rm     mixmind/frontend/src/components/PaymentModal.jsx
rm     mixmind/frontend/src/components/StatusModal.jsx
rm     mixmind/frontend/src/services/jukeboxApi.js
```

2. Remove the **2 lines** from existing files:

In `backend/server.js` — remove the `if (process.env.JUKEBOX_ENABLED)` block (4 lines).

In `frontend/src/main.jsx` — remove the `<Route path="/jukebox/...">` line and its import.

3. Remove the env vars added in Step 5 from both `.env` files.

That's it. No other MixMind code is affected.

---

## Dependency check

Before merging, verify MixMind already has these in `backend/package.json`
(all are common — very likely already present):

| Package | Used by |
|---|---|
| `stripe` | stripe.service.js |
| `axios` | spotify.service.js, lastfm.service.js |
| `jsonwebtoken` | venueAuth.js middleware |
| `bcryptjs` | VenueConfig model |
| `mongoose` | all models |

And in `frontend/package.json`:

| Package | Used by |
|---|---|
| `@stripe/react-stripe-js` | PaymentModal |
| `@stripe/stripe-js` | PaymentModal |
| `framer-motion` | TrackCard, StatusModal, PaymentModal |
| `lucide-react` | all components |

If any are missing, run `npm install <package>` in the relevant directory.
