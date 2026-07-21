import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import { runMigrations } from "./db/migrate";
import { dbDriver } from "./db";
import { initSocket } from "./socket";
import { UPLOADS_DIR } from "./constants";

import authRoutes from "./modules/auth/routes";
import userRoutes from "./modules/users/routes";
import visitorRoutes from "./modules/visitors/routes";
import complaintRoutes from "./modules/complaints/routes";
import amenityRoutes from "./modules/amenities/routes";
import bookingRoutes from "./modules/bookings/routes";
import noticeRoutes from "./modules/notices/routes";
import pollRoutes from "./modules/polls/routes";
import staffRoutes from "./modules/staff/routes";
import billRoutes from "./modules/bills/routes";
import uploadRoutes from "./modules/uploads/routes";
import societyRoutes from "./modules/society/routes";
import notificationRoutes from "./modules/notifications-api/routes";

async function main() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  await runMigrations();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use("/uploads", express.static(UPLOADS_DIR));

  app.get("/health", (_req, res) =>
    res.json({ ok: true, service: "portl-backend", driver: dbDriver, time: new Date().toISOString() })
  );

  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/visitors", visitorRoutes);
  app.use("/complaints", complaintRoutes);
  app.use("/amenities", amenityRoutes);
  app.use("/bookings", bookingRoutes);
  app.use("/notices", noticeRoutes);
  app.use("/polls", pollRoutes);
  app.use("/staff", staffRoutes);
  app.use("/bills", billRoutes);
  app.use("/uploads-api", uploadRoutes); // POST here to upload; GET /uploads/:file to fetch
  app.use("/", societyRoutes); // exposes /towers and /flats directly
  app.use("/notifications", notificationRoutes);

  // 404 + error handling
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  const PORT = Number(process.env.PORT) || 4000;
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Portl backend listening on http://localhost:${PORT} (DB_DRIVER=${dbDriver})`);
    console.log(`Socket.IO ready on the same port`);
  });
}

main().catch((err) => {
  console.error("Failed to start Portl backend:", err);
  process.exit(1);
});
