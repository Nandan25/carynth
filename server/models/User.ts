import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  avatarUrl?: string;
  geminiApiKeyEncrypted?: string;
  useOwnKey: boolean;
  adminUser: boolean;
  aiUsage: {
    count: number;
    resetAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      // not required: Google OAuth users have no local password
      type: String,
      select: false,
    },
    googleId: { type: String, index: true, sparse: true },
    avatarUrl: { type: String },

    // Bring-your-own-Gemini-key
    geminiApiKeyEncrypted: { type: String, select: false },
    useOwnKey: { type: Boolean, default: false },
    adminUser: { type: Boolean, default: false },

    // Usage tracking for the shared/default key
    aiUsage: {
      count: { type: Number, default: 0 },
      resetAt: { type: Date, default: () => new Date() },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Never leak sensitive fields even if select() is misused
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.geminiApiKeyEncrypted;
    return ret;
  },
});

export default mongoose.model<IUser>("User", userSchema);
