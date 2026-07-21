import express, { Router } from "express";

/** Mounts `router` at `mountPath` on a bare express app with the same json parsing + error
 *  handling as the real server, so route tests don't need to spin up the whole app/socket stack. */
export function buildTestApp(mountPath: string, router: Router) {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: err.message || "Internal server error" });
  });
  return app;
}
