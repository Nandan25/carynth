import { IUser } from "../models/User.js";

// Augments Express's Request type with the custom fields this app attaches
// during the request lifecycle: `user` (set by the `protect` middleware)
// and `usesOwnKey` (set by `aiRateLimiter`, read by AI controllers so the
// Gemini service calls use the right key). `file` is already typed by
// @types/multer's own Express.Request augmentation, so it isn't redeclared
// here.
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      usesOwnKey?: boolean;
    }
  }
}

export {};
