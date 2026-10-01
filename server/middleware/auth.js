import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // geminiApiKeyEncrypted has `select: false` on the schema (so it never
    // leaks in normal API responses) — but every AI service call needs it
    // off req.user to actually use a BYO key instead of silently falling
    // back to the shared one. Explicitly select it here.
    const user = await User.findById(decoded.id).select("+geminiApiKeyEncrypted");
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
}
