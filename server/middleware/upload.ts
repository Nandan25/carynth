import multer, { FileFilterCallback } from "multer";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

// A PDF's header may be preceded by a little junk, so look at the first KB.
function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");
}

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
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "That file is too large (the limit is 8 MB)." });
      }
      const message = err instanceof Error ? err.message : "File upload failed";
      return res.status(400).json({ message });
    }
    // The MIME type comes from the client and is trivially spoofed; check the
    // file really starts like a PDF before spending parsing/OCR/AI on it.
    if (req.file && !looksLikePdf(req.file.buffer)) {
      return res.status(400).json({ message: "That file doesn't look like a valid PDF." });
    }
    next();
  });
}
