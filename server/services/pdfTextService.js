import pdfParse from "pdf-parse";

/**
 * Extracts raw text from a PDF buffer. Works for text-based PDFs (the vast
 * majority of resumes exported from Word, Google Docs, LaTeX, etc). Returns
 * empty/near-empty text for scanned/image-based PDFs — callers should check
 * with looksLikeScannedPdf() and fall back to OCR when needed.
 */
export async function extractTextFromPdf(buffer) {
  const data = await pdfParse(buffer, { max: 6 }); // cap pages parsed, resumes are short
  return { text: data.text || "", numPages: data.numpages || 1 };
}

/**
 * Heuristic for "this PDF is probably a scanned image, not real text."
 * pdf-parse returns near-nothing for image-only PDFs (maybe a stray
 * character or two from embedded metadata), so a low total length or a low
 * density of characters per page is a reliable enough signal without doing
 * anything fancier.
 */
export function looksLikeScannedPdf(text, numPages) {
  const trimmed = (text || "").replace(/\s+/g, " ").trim();
  if (trimmed.length < 40) return true;
  const avgCharsPerPage = trimmed.length / Math.max(numPages, 1);
  return avgCharsPerPage < 30;
}
