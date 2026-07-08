// ============================================================
// Auth Middleware – JWT verification and role-based access control
// ============================================================

import jwt from "jsonwebtoken";

// --------------------------------------------------
// auth – Extracts JWT from the Authorization header
// ("Bearer <token>"), verifies it using JWT_SECRET,
// and attaches the decoded payload to req.user.
// Returns 401 if the token is missing or invalid.
// --------------------------------------------------
export function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ message: "Missing token" });

  try {
    req.user = jwt.verify(h.replace("Bearer ", ""), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// --------------------------------------------------
// requireRole – Middleware factory that checks the user's role.
// Usage: requireRole("TEACHER")
// Returns 403 if the role does not match.
// --------------------------------------------------
export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role
    ? next()
    : res.status(403).json({ message: "Forbidden" });
