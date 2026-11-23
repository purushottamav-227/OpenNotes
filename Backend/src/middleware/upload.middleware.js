import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import env from "../config/env.js";

const MAX_FILE_SIZE = env.MAX_PDF_SIZE_MB * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: env.MAX_PDF_PARTS,
    fields: 20,
    parts: env.MAX_PDF_PARTS + 20
  },

  fileFilter(req, file, callback) {
    if (file.mimetype !== "application/pdf") {
      const error = new Error("Only PDF files are accepted.");
      error.statusCode = 400;
      return callback(error);
    }

    callback(null, true);
  }
});

export const uploadPdfFiles = upload.array(
  "files",
  env.MAX_PDF_PARTS
);

export async function validatePdfFiles(req, res, next) {
  try {
    const files = req.files;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one PDF file is required."
      });
    }

    if (files.length > env.MAX_PDF_PARTS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${env.MAX_PDF_PARTS} PDF parts are allowed.`
      });
    }

    for (const file of files) {
      const detected = await fileTypeFromBuffer(file.buffer);

      if (
        !detected ||
        detected.ext !== "pdf" ||
        detected.mime !== "application/pdf"
      ) {
        return res.status(400).json({
          success: false,
          message: `${file.originalname} is not a valid PDF file.`
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `Each PDF must be smaller than ${env.MAX_PDF_SIZE_MB} MB.`
        : error.code === "LIMIT_FILE_COUNT"
          ? `Maximum ${env.MAX_PDF_PARTS} PDF parts are allowed.`
          : "Invalid file upload.";

    return res.status(400).json({
      success: false,
      message
    });
  }

  if (error.statusCode === 400) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
}