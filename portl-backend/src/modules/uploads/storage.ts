import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";

export type StorageDriver = "local" | "s3" | "cloudinary";

export function getStorageDriver(): StorageDriver {
  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  if (driver === "s3" || driver === "cloudinary") return driver;
  return "local";
}

const FILE_FILTER: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ok = /image\/(jpeg|png|webp|gif)/.test(file.mimetype) || file.mimetype === "application/pdf";
  if (ok) return cb(null, true);
  cb(new Error("Only images and PDFs are allowed"));
};

const LIMITS = { fileSize: 8 * 1024 * 1024 }; // 8MB

// ---------- Local disk (default, zero-setup demo path) ----------
function buildLocalUpload(uploadsDir: string) {
  const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuid()}${ext}`);
    },
  });
  return {
    upload: multer({ storage, limits: LIMITS, fileFilter: FILE_FILTER }),
    // Local files are served statically from /uploads by index.ts.
    getUrl: (req: any) => `/uploads/${req.file.filename}`,
  };
}

// ---------- S3 ----------
function buildS3Upload() {
  // Lazy-require so the S3 SDK / multer-s3 are only touched when actually selected — keeps the
  // "local" default path free of any AWS-specific startup requirements (no credentials needed
  // unless STORAGE_DRIVER=s3 is explicitly set).
  const { S3Client } = require("@aws-sdk/client-s3");
  const multerS3 = require("multer-s3");

  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  if (!bucket || !region) {
    throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET and S3_REGION to be set");
  }

  const s3 = new S3Client({
    region,
    // Falls back to the default AWS credential chain (env vars, shared config, instance role,
    // etc.) if S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY aren't set explicitly.
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });

  const storage = multerS3({
    s3,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req: any, file: Express.Multer.File, cb: (err: any, key?: string) => void) => {
      const ext = path.extname(file.originalname);
      cb(null, `uploads/${uuid()}${ext}`);
    },
  });

  return {
    upload: multer({ storage, limits: LIMITS, fileFilter: FILE_FILTER }),
    getUrl: (req: any) => {
      // multer-s3 attaches `location` (the public object URL) to req.file when the bucket/object
      // is publicly readable. If the bucket is private, swap this for a signed GetObject URL.
      const publicBase = process.env.S3_PUBLIC_BASE_URL;
      if (publicBase) return `${publicBase.replace(/\/$/, "")}/${req.file.key}`;
      return req.file.location;
    },
  };
}

// ---------- Cloudinary ----------
function buildCloudinaryUpload() {
  const { v2: cloudinary } = require("cloudinary");

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET"
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  // Small custom multer storage engine that streams the upload straight to Cloudinary.
  // Avoids `multer-storage-cloudinary`, whose latest release only supports cloudinary v1
  // (peer dep conflict with the v2 SDK used here).
  class CloudinaryStorageEngine implements multer.StorageEngine {
    _handleFile(_req: any, file: Express.Multer.File, cb: (error?: any, info?: Partial<Express.Multer.File>) => void) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "portl-uploads", public_id: uuid(), resource_type: "auto" },
        (err: any, result: any) => {
          if (err) return cb(err);
          cb(null, { path: result.secure_url, filename: result.public_id, size: result.bytes });
        }
      );
      file.stream.pipe(uploadStream);
    }
    _removeFile(_req: any, _file: Express.Multer.File, cb: (error: Error | null) => void) {
      cb(null);
    }
  }

  const storage = new CloudinaryStorageEngine();

  return {
    upload: multer({ storage, limits: LIMITS, fileFilter: FILE_FILTER }),
    getUrl: (req: any) => req.file.path, // secure delivery URL set by _handleFile above
  };
}

/**
 * Returns { upload, getUrl } for whichever STORAGE_DRIVER is configured.
 * `uploadsDir` is only used by the local driver.
 */
export function buildUploader(uploadsDir: string) {
  const driver = getStorageDriver();
  switch (driver) {
    case "s3":
      return buildS3Upload();
    case "cloudinary":
      return buildCloudinaryUpload();
    default:
      return buildLocalUpload(uploadsDir);
  }
}
