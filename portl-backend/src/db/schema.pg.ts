import { pgTable, text, integer, real, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

// IDs are app-generated UUID strings (see `uuid` npm package usage throughout the modules), so
// plain TEXT primary keys are used here rather than Postgres's native `uuid` type — this keeps
// the exact same insert/query code working unchanged against either database.

const roleEnum = pgEnum("role", ["resident", "guard", "admin"]);
const visitorCategoryEnum = pgEnum("visitor_category", ["guest", "delivery", "cab", "service", "other"]);
const visitorStatusEnum = pgEnum("visitor_status", ["pending", "approved", "rejected", "arrived", "exited", "left_at_gate"]);
const complaintCategoryEnum = pgEnum("complaint_category", ["Plumbing", "Electrical", "Security", "Housekeeping", "Parking", "Other"]);
const notificationTypeEnum = pgEnum("notification_type", ["visitor", "notice", "complaint", "poll", "general"]);
const complaintStatusEnum = pgEnum("complaint_status", ["open", "assigned", "in_progress", "resolved", "closed"]);
const bookingStatusEnum = pgEnum("booking_status", ["confirmed", "cancelled"]);
const noticeCategoryEnum = pgEnum("notice_category", ["Maintenance", "Event", "Alert", "General"]);
const billStatusEnum = pgEnum("bill_status", ["paid", "unpaid"]);
const paymentStatusEnum = pgEnum("payment_status", ["created", "paid", "failed"]);
const userStatusEnum = pgEnum("user_status", ["pending_invitation", "active", "disabled"]);
const ownerTenantEnum = pgEnum("owner_tenant", ["owner", "tenant"]);

const id = () => text("id").primaryKey();
const now = () => timestamp("created_at", { mode: "string" }).notNull().defaultNow();

export const societies = pgTable("societies", {
  id: id(),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: now(),
});

export const towers = pgTable("towers", {
  id: id(),
  societyId: text("society_id").notNull(),
  name: text("name").notNull(),
});

export const flats = pgTable("flats", {
  id: id(),
  towerId: text("tower_id").notNull(),
  number: text("number").notNull(),
  label: text("label").notNull(),
  ownerName: text("owner_name"),
});

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  passwordHash: text("password_hash"),
  role: roleEnum("role").notNull(),
  status: userStatusEnum("status").notNull().default("active"),
  societyId: text("society_id").notNull(),
  invitedByUserId: text("invited_by_user_id"),
  flatId: text("flat_id"),
  flatLabel: text("flat_label"),
  towerName: text("tower_name"),
  ownerOrTenant: ownerTenantEnum("owner_or_tenant"),
  gate: text("gate"),
  shift: text("shift"),
  avatarUrl: text("avatar_url"),
  languagePref: text("language_pref").default("en"),
  createdAt: now(),
});

export const invitations = pgTable("invitations", {
  id: id(),
  userId: text("user_id").notNull(),
  societyId: text("society_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
  usedAt: timestamp("used_at", { mode: "string" }),
  createdAt: now(),
});

export const pushTokens = pgTable("push_tokens", {
  id: id(),
  userId: text("user_id").notNull(),
  expoPushToken: text("expo_push_token").notNull(),
  createdAt: now(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  meta: text("meta"),
  read: boolean("read").notNull().default(false),
  createdAt: now(),
});

export const visitors = pgTable("visitors", {
  id: id(),
  name: text("name").notNull(),
  category: visitorCategoryEnum("category").notNull(),
  company: text("company"),
  purpose: text("purpose"),
  photoUrl: text("photo_url"),
  flatId: text("flat_id"),
  flatLabel: text("flat_label").notNull(),
  towerName: text("tower_name"),
  status: visitorStatusEnum("status").notNull().default("pending"),
  registeredByGuardId: text("registered_by_guard_id"),
  approvedByUserId: text("approved_by_user_id"),
  requestedAt: timestamp("requested_at", { mode: "string" }).notNull().defaultNow(),
  entryTime: timestamp("entry_time", { mode: "string" }),
  exitTime: timestamp("exit_time", { mode: "string" }),
});

export const guestPasses = pgTable("guest_passes", {
  id: id(),
  code: text("code").notNull().unique(),
  generatedByUserId: text("generated_by_user_id").notNull(),
  guestName: text("guest_name").notNull(),
  note: text("note"),
  validFrom: timestamp("valid_from", { mode: "string" }).notNull(),
  validTo: timestamp("valid_to", { mode: "string" }).notNull(),
  used: boolean("used").notNull().default(false),
  flatLabel: text("flat_label").notNull(),
  createdAt: now(),
});

export const complaints = pgTable("complaints", {
  id: id(),
  title: text("title").notNull(),
  category: complaintCategoryEnum("category").notNull(),
  description: text("description"),
  status: complaintStatusEnum("status").notNull().default("open"),
  raisedByUserId: text("raised_by_user_id").notNull(),
  flatLabel: text("flat_label").notNull(),
  assignedTo: text("assigned_to"),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const amenities = pgTable("amenities", {
  id: id(),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("grid"),
  location: text("location"),
  openTime: text("open_time").notNull().default("06:00"),
  closeTime: text("close_time").notNull().default("22:00"),
  slotMinutes: integer("slot_minutes").notNull().default(60),
});

export const bookings = pgTable("bookings", {
  id: id(),
  amenityId: text("amenity_id").notNull(),
  flatLabel: text("flat_label").notNull(),
  bookedByUserId: text("booked_by_user_id").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: bookingStatusEnum("status").notNull().default("confirmed"),
  createdAt: now(),
});

export const notices = pgTable("notices", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: noticeCategoryEnum("category").notNull().default("General"),
  attachmentUrl: text("attachment_url"),
  createdByUserId: text("created_by_user_id").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: now(),
});

export const polls = pgTable("polls", {
  id: id(),
  question: text("question").notNull(),
  createdByUserId: text("created_by_user_id").notNull(),
  closesAt: timestamp("closes_at", { mode: "string" }).notNull(),
  createdAt: now(),
});

export const pollOptions = pgTable("poll_options", {
  id: id(),
  pollId: text("poll_id").notNull(),
  label: text("label").notNull(),
});

export const votes = pgTable("votes", {
  id: id(),
  pollId: text("poll_id").notNull(),
  optionId: text("option_id").notNull(),
  userId: text("user_id").notNull(),
  createdAt: now(),
});

export const staff = pgTable("staff", {
  id: id(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  rating: real("rating"),
  photoUrl: text("photo_url"),
});

export const bills = pgTable("bills", {
  id: id(),
  flatLabel: text("flat_label").notNull(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  period: text("period"),
  dueDate: text("due_date").notNull(),
  status: billStatusEnum("status").notNull().default("unpaid"),
  createdAt: now(),
});

export const payments = pgTable("payments", {
  id: id(),
  billId: text("bill_id").notNull(),
  flatLabel: text("flat_label").notNull(),
  amountPaid: integer("amount_paid").notNull(),
  paymentMethod: text("payment_method").notNull().default("razorpay"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  status: paymentStatusEnum("status").notNull().default("created"),
  createdAt: now(),
});
