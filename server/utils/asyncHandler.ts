import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Express 4 does not catch rejected promises from async handlers: a thrown
 * error inside one becomes an unhandled rejection, which kills the process on
 * modern Node. Wrapping a handler forwards any rejection to the central error
 * handler instead (where it becomes a clean 4xx/5xx response).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown
): RequestHandler {
  return (req, res, next) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      // fn threw synchronously, before returning a promise.
      next(err);
    }
  };
}
