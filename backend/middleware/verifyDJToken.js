const jwt = require("jsonwebtoken");

/**
 * Middleware to verify DJ token
 * DJ tokens are issued after DJ logs in with correct password
 */
function verifyDJToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No DJ token provided" });
    }

    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    
    // Verify it's a DJ token
    if (decoded.role !== "dj") {
      return res.status(403).json({ error: "Invalid token: not a DJ token" });
    }

    req.dj = decoded;
    next();
  } catch (err) {
    console.error("DJ Token Verification Error:", err.message);
    res.status(401).json({ error: "Invalid or expired DJ token" });
  }
}

module.exports = verifyDJToken;
