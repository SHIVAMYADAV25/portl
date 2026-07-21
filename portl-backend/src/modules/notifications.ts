import { db } from "../db";
import { pushTokens, notifications, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type NotificationType = "visitor" | "notice" | "complaint" | "poll" | "general";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
}

async function sendExpoPush(messages: PushMessage[]) {
  if (messages.length === 0) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.error("[push] Expo push API responded with", res.status, await res.text());
    }
  } catch (err) {
    // Sandboxed/offline environments won't have internet to exp.host — fail soft.
    console.warn("[push] Could not reach Expo push service (offline?):", (err as Error).message);
  }
}

/** Persists one row to the in-app notification inbox. Independent of push — a user with no
 *  registered push token (or push disabled) still sees this in the app's Notifications screen. */
async function persistNotification(userId: string, type: NotificationType, title: string, body: string, meta?: Record<string, unknown>) {
  await db.insert(notifications).values({
    id: uuid(),
    userId,
    type,
    title,
    body,
    meta: meta ? JSON.stringify(meta) : null,
  });
}

/** Notifies a single user: writes to their in-app inbox and best-effort sends an OS push to
 *  whatever devices they've registered. Used for per-user events (a visitor request, a
 *  complaint status change). */
export async function notifyUser(userId: string, title: string, body: string, type: NotificationType = "general", meta?: Record<string, unknown>) {
  await persistNotification(userId, type, title, body, meta);
  const tokens = await db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
  await sendExpoPush(tokens.map((t: any) => ({ to: t.expoPushToken, title, body, data: meta, channelId: "default" })));
}

/** Notifies every user in the society: writes an in-app inbox row for each one (regardless of
 *  whether they have a push token registered) and best-effort pushes to whoever does. Used for
 *  society-wide events (a new notice). */
export async function notifyAllUsers(title: string, body: string, type: NotificationType = "general", meta?: Record<string, unknown>) {
  const allUsers = await db.select().from(users);
  for (const u of allUsers as any[]) {
    await persistNotification(u.id, type, title, body, meta);
  }
  const tokens = await db.select().from(pushTokens);
  await sendExpoPush((tokens as any[]).map((t) => ({ to: t.expoPushToken, title, body, data: meta, channelId: "default" })));
}

/** Raw token-list push with no in-app inbox write — kept for anything that only has push tokens
 *  on hand, not user IDs. Prefer notifyUser/notifyAllUsers where possible so the in-app inbox
 *  stays complete. */
export async function notifyTokens(tokens: string[], title: string, body: string, data?: Record<string, unknown>) {
  await sendExpoPush(tokens.map((to) => ({ to, title, body, data, channelId: "default" })));
}
