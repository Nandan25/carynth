import multer from "multer";

const storage = multer.memoryStorage();

function fileFilter(_req, file, cb) {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are supported"), false);
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
export function uploadResumePdf(req, res, next) {
  multerUpload.single("resume")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    next();
  });
}
