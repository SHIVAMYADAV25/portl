import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { polls, pollOptions, votes } from "../../db/schema";
import { isAuthenticated, checkRole } from "../../middleware/auth";
import { socketEvents } from "../../socket";

const router = Router();

router.get("/", isAuthenticated, async (req, res) => {
  const allPolls = await db.select().from(polls);
  const allOptions = await db.select().from(pollOptions);
  const allVotes = await db.select().from(votes);

  const result = allPolls.map((p) => {
    const options = allOptions
      .filter((o) => o.pollId === p.id)
      .map((o) => ({ id: o.id, label: o.label, votes: allVotes.filter((v) => v.optionId === o.id).length }));
    const myVote = allVotes.find((v) => v.pollId === p.id && v.userId === req.user!.sub)?.optionId;
    return {
      ...p,
      options,
      totalVotes: allVotes.filter((v) => v.pollId === p.id).length,
      myVote,
    };
  });

  res.json({ polls: result });
});

const createSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  closesAt: z.string(),
});

router.post("/", isAuthenticated, checkRole("admin"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const pollId = uuid();
  await db.insert(polls).values({ id: pollId, question: parsed.data.question, closesAt: parsed.data.closesAt, createdByUserId: req.user!.sub });
  const options = parsed.data.options.map((label) => ({ id: uuid(), pollId, label }));
  await db.insert(pollOptions).values(options);

  const poll = { id: pollId, question: parsed.data.question, closesAt: parsed.data.closesAt, status: "open" as const, options: options.map((o) => ({ ...o, votes: 0 })), totalVotes: 0 };
  socketEvents.newPoll(poll);
  res.status(201).json({ poll });
});

const voteSchema = z.object({ optionId: z.string() });

router.post("/:id/vote", isAuthenticated, checkRole("resident"), async (req, res) => {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await db.select().from(votes).where(eq(votes.pollId, req.params.id));
  if (existing.some((v) => v.userId === req.user!.sub)) {
    return res.status(409).json({ error: "You already voted on this poll" });
  }

  await db.insert(votes).values({ id: uuid(), pollId: req.params.id, optionId: parsed.data.optionId, userId: req.user!.sub });
  res.status(201).json({ ok: true });
});

// ---------- Admin closes a poll early (voting stops immediately, results remain visible) ----------
router.post("/:id/close", isAuthenticated, checkRole("admin"), async (req, res) => {
  const [poll] = await db.select().from(polls).where(eq(polls.id, req.params.id));
  if (!poll) return res.status(404).json({ error: "Poll not found" });
  await db.update(polls).set({ status: "closed" }).where(eq(polls.id, req.params.id));
  const [updated] = await db.select().from(polls).where(eq(polls.id, req.params.id));
  socketEvents.newPoll(updated); // reuse the poll-changed broadcast so open clients refresh
  res.json({ poll: updated });
});

router.get("/:id/results", isAuthenticated, async (req, res) => {
  const options = await db.select().from(pollOptions).where(eq(pollOptions.pollId, req.params.id));
  const allVotes = await db.select().from(votes).where(eq(votes.pollId, req.params.id));
  res.json({
    results: options.map((o) => ({ id: o.id, label: o.label, votes: allVotes.filter((v) => v.optionId === o.id).length })),
    totalVotes: allVotes.length,
  });
});

export default router;