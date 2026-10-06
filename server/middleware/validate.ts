import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

/**
 * Validates req.body against a zod schema and REPLACES it with the parsed
 * result. zod strips unknown keys by default, so anything not explicitly
 * declared in the schema (e.g. `owner`, `lastAtsCheck`) never reaches a
 * controller or the database.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request body",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

/**
 * For use with router.param("id", validateObjectIdParam). Rejects malformed
 * ids with a 400 before they reach Mongoose (where they would throw a
 * CastError).
 */
export function validateObjectIdParam(
  req: Request,
  res: Response,
  next: NextFunction,
  value: string
) {
  if (!OBJECT_ID.test(value)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  next();
}
