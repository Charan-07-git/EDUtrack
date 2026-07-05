import jwt from "jsonwebtoken";

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

export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role
    ? next()
    : res.status(403).json({ message: "Forbidden" });
