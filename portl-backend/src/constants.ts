import path from "path";

// Backend root (one level above src/), independent of how deeply the importing file is nested —
// avoids the classic bug of two different files computing "../uploads" at different relative
// depths and quietly writing/serving from two different folders.
export const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
