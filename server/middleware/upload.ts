import multer, { FileFilterCallback } from "multer";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are supported"));
  }
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

/**
 * Wraps multer's single-file upload (field name "resume") so upload errors
 * (wrong file type, too large, missing file) return a clean 400 instead of
 * bubbling up to the generic 500 error handler.
 */
export function uploadResumePdf(req: Request, res: Response, next: NextFunction) {
  multerUpload.single("resume")(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "File upload failed";
      return res.status(400).json({ message });
    }
    next();
  });
}
