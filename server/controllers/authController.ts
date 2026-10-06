import { OAuth2Client } from "google-auth-library";
import type { Request, Response } from "express";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    const user = await User.create({ name, email, password });
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email },
      token: generateToken(user._id),
    });
  } catch (err: any) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({
      user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      token: generateToken(user._id),
    });
  } catch (err: any) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
}

export async function googleLogin(req: Request, res: Response) {
  try {
    if (!googleClient) {
      return res.status(501).json({ message: "Google OAuth is not configured on this server" });
    }
    const { credential } = req.body; // ID token from Google Identity Services on the client
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential" });
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: "Google sign-in failed: no payload in token" });
    }

    // Only trust an email address Google itself has verified.
    if (!payload.email || !payload.email_verified) {
      return res.status(401).json({ message: "Your Google account's email address isn't verified." });
    }
    const email = payload.email.toLowerCase();

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      const existing = await User.findOne({ email }).select("+password");
      if (existing) {
        // Never silently attach a Google identity to an account that already
        // has a password. Registration doesn't verify email ownership, so that
        // account may have been created by someone else using the victim's
        // address ("account pre-hijacking"): linking would hand them a
        // permanent way back in. Make the person sign in with their password.
        if (existing.password) {
          return res.status(409).json({
            message:
              "An account with this email already exists. Sign in with your email and password instead.",
          });
        }
        existing.googleId = payload.sub;
        existing.avatarUrl = existing.avatarUrl || payload.picture;
        await existing.save();
        user = existing;
      } else {
        user = await User.create({
          name: payload.name || email,
          email,
          googleId: payload.sub,
          avatarUrl: payload.picture,
        });
      }
    }

    res.json({
      user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      token: generateToken(user._id),
    });
  } catch (err: any) {
    res.status(401).json({ message: "Google sign-in failed", error: err.message });
  }
}

export async function getMe(req: Request, res: Response) {
  const user = req.user!;
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    useOwnKey: user.useOwnKey,
    hasOwnKey: !!user.geminiApiKeyEncrypted,
  });
}
