export interface User {
  id: string;
  name: string;
  phone: string;
  role: "resident" | "guard" | "admin";
  flatLabel?: string;
  towerName?: string;
}

export type VisitorStatus = "pending" | "approved" | "rejected" | "arrived" | "exited" | "left_at_gate";
export interface Visitor {
  id: string;
  name: string;
  category: "guest" | "delivery" | "cab" | "service" | "other";
  company?: string;
  purpose?: string;
  flatLabel: string;
  towerName?: string;
  status: VisitorStatus;
  requestedAt: string;
  entryTime?: string;
  exitTime?: string;
}

export type ComplaintStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed";
export interface Complaint {
  id: string;
  title: string;
  category: string;
  description?: string;
  status: ComplaintStatus;
  raisedByUserId: string;
  flatLabel: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  location?: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  category: "Maintenance" | "Event" | "Alert" | "General";
  createdAt: string;
  pinned?: boolean;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  closesAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  rating?: number;
}

export interface Bill {
  id: string;
  flatLabel: string;
  title: string;
  amount: number;
  dueDate: string;
  period?: string;
  status: "paid" | "unpaid";
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
  label: string;
  ownerName?: string;
}
