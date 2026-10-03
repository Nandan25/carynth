import type { Request, Response } from "express";
import User from "../models/User.js";
import { encrypt } from "../services/encryption.js";

/** Save/replace the user's own Gemini API key (stored encrypted, never returned). */
export async function setGeminiKey(req: Request, res: Response) {
  try {
    const { apiKey, useOwnKey } = req.body;
    const user = await User.findById(req.user!._id).select("+geminiApiKeyEncrypted");
    if (!user) return res.status(401).json({ message: "Not authorized, user not found" });

    if (apiKey) {
      user.geminiApiKeyEncrypted = encrypt(apiKey);
    }
    if (typeof useOwnKey === "boolean") {
      if (useOwnKey && !user.geminiApiKeyEncrypted) {
        return res.status(400).json({ message: "Add a Gemini key before enabling 'use my key'" });
      }
      user.useOwnKey = useOwnKey;
    }
    await user.save();

    res.json({
      hasOwnKey: !!user.geminiApiKeyEncrypted,
      useOwnKey: user.useOwnKey,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update Gemini key", error: err.message });
  }
}

export async function removeGeminiKey(req: Request, res: Response) {
  try {
    const user = await User.findById(req.user!._id).select("+geminiApiKeyEncrypted");
    if (!user) return res.status(401).json({ message: "Not authorized, user not found" });
    user.geminiApiKeyEncrypted = undefined;
    user.useOwnKey = false;
    await user.save();
    res.json({ hasOwnKey: false, useOwnKey: false });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to remove Gemini key", error: err.message });
  }
}

export async function getUsage(req: Request, res: Response) {
  const user = await User.findById(req.user!._id);
  if (!user) return res.status(401).json({ message: "Not authorized, user not found" });
  res.json({
    useOwnKey: user.useOwnKey,
    hasOwnKey: !!user.geminiApiKeyEncrypted,
    dailyLimit: Number(process.env.FREE_TIER_DAILY_AI_LIMIT || 10),
    usedToday: user.aiUsage?.count || 0,
  });
}
