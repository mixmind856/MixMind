import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App.jsx";
import Request from "./pages/Request.jsx";
import RequestForm from "./componentsRequest/RequestForm";
import Success from "./componentsRequest/Success";
import StripeSuccess from "./pages/StripeSuccess.jsx";
import AdminDashboard from "./componentsRequest/AdminDashboard";
import VenueSignup from "./pages/VenueSignup.jsx";
import VenueSignin from "./pages/VenueSignin.jsx";
import VenueDashboard from "./pages/VenueDashboard.jsx";
import VenuePublicRequest from "./pages/VenuePublicRequest.jsx";
import BrowseVenues from "./pages/BrowseVenues.jsx";
import AdminRequestApproval from "./pages/AdminRequestApproval.jsx";
import AdminDashboardPage from "./pages/AdminDashboard.jsx";
import ThankYou from "./pages/ThankYou.jsx";
import DJ from "./pages/DJ.jsx";
import DJAuth from "./pages/DJAuth.jsx";
import DJVenueSelection from "./pages/DJVenueSelection.jsx";
import DJWaitingApproval from "./pages/DJWaitingApproval.jsx";
import DJApprovedDashboard from "./pages/DJApprovedDashboard.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        {/* DJ ROUTES */}
        <Route path="/dj/auth" element={<DJAuth />} />
        <Route path="/dj/select-venue" element={<DJVenueSelection />} />
        <Route path="/dj/waiting-approval/:venueId" element={<DJWaitingApproval />} />
        <Route path="/dj/dashboard/:venueId" element={<DJApprovedDashboard />} />

        {/* VENUE ROUTES */}
        <Route path="/venue/signup" element={<VenueSignup />} />
        <Route path="/venue/signin" element={<VenueSignin />} />
        <Route path="/venue/dashboard" element={<VenueDashboard />} />
        <Route path="/venue/dj/:venueId" element={<DJ />} />
        <Route path="/browse-venues" element={<BrowseVenues />} />
        <Route path="/venue-request/:venueId" element={<VenuePublicRequest />} />

        {/* ADMIN ROUTES */}
        <Route path="/admin/approve" element={<AdminRequestApproval />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

        {/* THANK YOU PAGE */}
        <Route path="/thank-you/:venueId" element={<ThankYou />} />

        {/* STRIPE REDIRECT */}
        <Route path="/success" element={<StripeSuccess />} />

        {/* MARKETING SITE */}
        <Route path="/" element={<App />} />

        {/* REQUEST FLOW */}
        <Route path="/request" element={<Request />}>
          <Route index element={<RequestForm />} />
          <Route path="success" element={<Success />} />
          <Route path="admin" element={<AdminDashboard />} />
        </Route>

      </Routes>
    </BrowserRouter>
  </StrictMode>
);

