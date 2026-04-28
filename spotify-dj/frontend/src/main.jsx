import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/index.css';

import Jukebox from './pages/Jukebox';
import JukeboxThankYou from './pages/JukeboxThankYou';
import VenueSetup from './pages/VenueSetup';
import VenueLogin from './pages/VenueLogin';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public jukebox – requires venueSlug in URL */}
        <Route path="/jukebox/:venueSlug" element={<Jukebox />} />
        <Route path="/jukebox-thank-you/:requestId" element={<JukeboxThankYou />} />

        {/* Venue admin flows */}
        <Route path="/venue-setup" element={<VenueSetup />} />
        <Route path="/venue-login" element={<VenueLogin />} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/venue-login" replace />} />
        <Route path="*" element={<Navigate to="/venue-login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
