import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

export function generateToken(userId: Types.ObjectId | string): string {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] || "7d",
  });
}
