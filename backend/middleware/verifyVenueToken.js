const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT token for venues
 */
function verifyVenueToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret_key");
    req.venue = decoded;
    next();
  } catch (err) {
    console.error("Token Verification Error:", err.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = verifyVenueToken;
