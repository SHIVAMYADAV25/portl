import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const id = () => text("id").primaryKey();
const now = () => text("created_at").notNull().default(sql`(current_timestamp)`);

// ---------- Society structure ----------
export const societies = sqliteTable("societies", {
  id: id(),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: now(),
});

export const towers = sqliteTable("towers", {
  id: id(),
  societyId: text("society_id").notNull(),
  name: text("name").notNull(),
});

export const flats = sqliteTable("flats", {
  id: id(),
  towerId: text("tower_id").notNull(),
  number: text("number").notNull(), // e.g. "1005"
  label: text("label").notNull(), // e.g. "A-1005"
  ownerName: text("owner_name"),
});

// ---------- Users ----------
export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash"), // nullable: demo/OTP users may not set one
  role: text("role", { enum: ["resident", "guard", "admin"] }).notNull(),
  flatId: text("flat_id"),
  flatLabel: text("flat_label"),
  towerName: text("tower_name"),
  avatarUrl: text("avatar_url"),
  languagePref: text("language_pref").default("en"),
  createdAt: now(),
});

export const pushTokens = sqliteTable("push_tokens", {
  id: id(),
  userId: text("user_id").notNull(),
  expoPushToken: text("expo_push_token").notNull(),
  createdAt: now(),
});

// In-app notification inbox — persisted alongside the fire-and-forget Expo push send, so there's
// a real list to show in the app (push notifications alone are OS-level and disappear once
// dismissed; this is what backs a "Notifications" screen). `type` + `meta` let the client deep
// link (e.g. a "visitor" notification's meta.visitorId routes straight to visitor-approval).
export const notifications = sqliteTable("notifications", {
  id: id(),
  userId: text("user_id").notNull(),
  type: text("type", { enum: ["visitor", "notice", "complaint", "poll", "general"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  meta: text("meta"), // JSON string, e.g. {"visitorId": "..."}
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
});

// ---------- Visitors ----------
export const visitors = sqliteTable("visitors", {
  id: id(),
  name: text("name").notNull(),
  category: text("category", { enum: ["guest", "delivery", "cab", "service", "other"] }).notNull(),
  company: text("company"),
  purpose: text("purpose"),
  photoUrl: text("photo_url"),
  flatId: text("flat_id"),
  flatLabel: text("flat_label").notNull(),
  towerName: text("tower_name"),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "arrived", "exited", "left_at_gate"],
  })
    .notNull()
    .default("pending"),
  registeredByGuardId: text("registered_by_guard_id"),
  approvedByUserId: text("approved_by_user_id"),
  requestedAt: text("requested_at").notNull().default(sql`(current_timestamp)`),
  entryTime: text("entry_time"),
  exitTime: text("exit_time"),
});

export const guestPasses = sqliteTable("guest_passes", {
  id: id(),
  code: text("code").notNull().unique(),
  generatedByUserId: text("generated_by_user_id").notNull(),
  guestName: text("guest_name").notNull(),
  note: text("note"),
  validFrom: text("valid_from").notNull(),
  validTo: text("valid_to").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  flatLabel: text("flat_label").notNull(),
  createdAt: now(),
});

// ---------- Complaints ----------
export const complaints = sqliteTable("complaints", {
  id: id(),
  title: text("title").notNull(),
  category: text("category", {
    enum: ["Plumbing", "Electrical", "Security", "Housekeeping", "Parking", "Other"],
  }).notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["open", "assigned", "in_progress", "resolved", "closed"],
  })
    .notNull()
    .default("open"),
  raisedByUserId: text("raised_by_user_id").notNull(),
  flatLabel: text("flat_label").notNull(),
  assignedTo: text("assigned_to"),
  createdAt: now(),
  updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
});

// ---------- Amenities & bookings ----------
export const amenities = sqliteTable("amenities", {
  id: id(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("grid"),
  location: text("location"),
  openTime: text("open_time").notNull().default("06:00"),
  closeTime: text("close_time").notNull().default("22:00"),
  slotMinutes: integer("slot_minutes").notNull().default(60),
});

export const bookings = sqliteTable("bookings", {
  id: id(),
  amenityId: text("amenity_id").notNull(),
  flatLabel: text("flat_label").notNull(),
  bookedByUserId: text("booked_by_user_id").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status", { enum: ["confirmed", "cancelled"] }).notNull().default("confirmed"),
  createdAt: now(),
});

// ---------- Notices & polls ----------
export const notices = sqliteTable("notices", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category", { enum: ["Maintenance", "Event", "Alert", "General"] })
    .notNull()
    .default("General"),
  attachmentUrl: text("attachment_url"),
  createdByUserId: text("created_by_user_id").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: now(),
});

export const polls = sqliteTable("polls", {
  id: id(),
  question: text("question").notNull(),
  createdByUserId: text("created_by_user_id").notNull(),
  closesAt: text("closes_at").notNull(),
  createdAt: now(),
});

export const pollOptions = sqliteTable("poll_options", {
  id: id(),
  pollId: text("poll_id").notNull(),
  label: text("label").notNull(),
});

export const votes = sqliteTable("votes", {
  id: id(),
  pollId: text("poll_id").notNull(),
  optionId: text("option_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: now(),
});

// ---------- Staff / service providers ----------
export const staff = sqliteTable("staff", {
  id: id(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  rating: real("rating"),
  photoUrl: text("photo_url"),
});

// ---------- Billing & payments ----------
export const bills = sqliteTable("bills", {
  id: id(),
  flatLabel: text("flat_label").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(), // paise-free INR for demo simplicity
  period: text("period"),
  dueDate: text("due_date").notNull(),
  status: text("status", { enum: ["paid", "unpaid"] }).notNull().default("unpaid"),
  createdAt: now(),
});

export const payments = sqliteTable("payments", {
  id: id(),
  billId: text("bill_id").notNull(),
  flatLabel: text("flat_label").notNull(),
  amountPaid: integer("amount_paid").notNull(),
  paymentMethod: text("payment_method").notNull().default("razorpay"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  status: text("status", { enum: ["created", "paid", "failed"] }).notNull().default("created"),
  createdAt: now(),
});
