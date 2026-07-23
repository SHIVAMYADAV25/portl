export type Role = "resident" | "guard" | "admin";
export type UserStatus = "pending_invitation" | "active" | "disabled";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status?: UserStatus;
  societyId?: string;
  societyName?: string;
  avatarUrl?: string;
  flatId?: string;
  flatLabel?: string;
  towerName?: string;
  ownerOrTenant?: "owner" | "tenant";
  gate?: string;
  shift?: string;
}

export type VisitorCategory = "guest" | "delivery" | "cab" | "service" | "other";
export type VisitorStatus = "pending" | "approved" | "rejected" | "arrived" | "exited" | "left_at_gate";

export interface Visitor {
  id: string;
  name: string;
  category: VisitorCategory;
  company?: string; // e.g. "Flipkart", "Zomato", "Ola"
  purpose?: string;
  phone?: string;
  vehicleNumber?: string;
  photoUrl?: string;
  flatLabel: string;
  towerName?: string;
  status: VisitorStatus;
  requestedAt: string; // ISO
  validTill?: string;
  approvedBy?: string;
  entryTime?: string;
  exitTime?: string;
}

export type ComplaintStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed";

export interface Complaint {
  id: string;
  title: string;
  category: "Plumbing" | "Electrical" | "Security" | "Housekeeping" | "Parking" | "Other";
  description?: string;
  status: ComplaintStatus;
  raisedBy: string;
  flatLabel: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  location: string;
  imageUrl?: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
}

export interface Booking {
  id: string;
  amenityId: string;
  amenityName?: string;
  flatLabel: string;
  date: string; // yyyy-mm-dd
  startTime: string;
  endTime: string;
  status: "confirmed" | "cancelled";
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  category: "Maintenance" | "Event" | "Alert" | "General";
  createdBy: string;
  createdAt: string;
  pinned?: boolean;
}

export interface Poll {
  id: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
  totalVotes: number;
  closesAt: string;
  status?: "open" | "closed";
  myVote?: string;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  period: string;
  status: "paid" | "unpaid";
  isNew?: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string; // "Electrician", "Security Guard", "Plumber"
  phone: string;
  rating?: number;
  photoUrl?: string;
}

export interface Tower {
  id: string;
  societyId: string;
  name: string;
}

export interface Flat {
  id: string;
  towerId: string;
  number: string;
  label: string; // e.g. "A-1005" — matches the flatLabel string used elsewhere
  ownerName?: string;
}

// Named AppNotification (not Notification) to avoid colliding with the DOM/RN global
// `Notification` type that some ambient lib.dom typings bring into scope.
export interface AppNotification {
  id: string;
  userId: string;
  type: "visitor" | "notice" | "complaint" | "poll" | "general";
  title: string;
  body: string;
  meta: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}