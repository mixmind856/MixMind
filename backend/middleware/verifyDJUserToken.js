const jwt = require("jsonwebtoken");

/**
 * Middleware to verify DJ user token
 * DJ user tokens are issued when a DJ creates an account and logs in
 * This is separate from venue-based DJ mode authentication
 * 
 * Supports both:
 * 1. DJ user tokens: { djId, email, role: "dj" }
 * 2. Venue-based DJ tokens: { venueId, venueName, role: "dj" } (converted to djId for compatibility)
 */
function verifyDJUserToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No DJ token provided" });
    }

    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    
    // Support both DJ user tokens (with djId) and venue-based DJ tokens (with venueId)
    if (decoded.djId) {
      // DJ user account token - new system
      if (decoded.role !== "dj") {
        console.error("Token invalid role. Expected 'dj', got:", decoded.role);
        return res.status(403).json({ error: "Invalid token: not a DJ token. Expected role='dj'." });
      }
      req.dj = decoded;
      next();
    } else if (decoded.venueId) {
      // Venue-based DJ token - legacy system, convert to compatible format
      if (decoded.role !== "dj") {
        console.error("Token invalid role. Expected 'dj', got:", decoded.role);
        return res.status(403).json({ error: "Invalid token: not a DJ token. Expected role='dj'." });
      }
      // Convert venue-based token to compatible format for legacy endpoints
      req.dj = {
        djId: decoded.venueId, // Use venueId as djId for compatibility
        venueId: decoded.venueId,
        venueName: decoded.venueName,
        role: decoded.role,
        isVenueBased: true // Flag to indicate this is venue-based auth
      };
      next();
    } else {
      console.error("Token missing both djId and venueId fields. Token payload:", decoded);
      return res.status(403).json({ error: "Invalid token: must contain djId or venueId field." });
    }
  } catch (err) {
    console.error("DJ User Token Verification Error:", err.message);
    res.status(401).json({ error: "Invalid or expired DJ token" });
  }
}

module.exports = verifyDJUserToken;
