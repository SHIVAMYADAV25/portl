import { Router } from "express";
import { isAuthenticated } from "../../middleware/auth";
import { buildUploader, getStorageDriver } from "./storage";
import { UPLOADS_DIR } from "../../constants";

const router = Router();

// --- Storage strategy ---
// Driver is chosen via STORAGE_DRIVER env var: "local" (default, zero-setup demo — writes to
// disk under /uploads, served statically by index.ts), "s3", or "cloudinary". Whichever driver
// is active, this route always returns the same { url } shape — no other module needs to change,
// they all just store whatever URL this endpoint returns. See storage.ts and README.md
// "File storage" for the env vars each driver needs.
const { upload, getUrl } = buildUploader(UPLOADS_DIR);

router.post("/", isAuthenticated, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded (field name must be 'file')" });
  const url = getUrl(req);
  res.status(201).json({ url, driver: getStorageDriver() });
});

export default router;
