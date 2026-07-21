import type {
  Amenity,
  AppNotification,
  Bill,
  Booking,
  Complaint,
  Flat,
  Notice,
  Poll,
  StaffMember,
  User,
  Visitor,
} from "@/types";

export const demoUsers: Record<string, User> = {
  resident: {
    id: "u1",
    name: "Priya Menon",
    phone: "9876543210",
    role: "resident",
    flatId: "f1",
    flatLabel: "A-1005",
    towerName: "Tower A",
  },
  guard: {
    id: "u2",
    name: "Rohit Yadav",
    phone: "9876500000",
    role: "guard",
    towerName: "Main Gate",
  },
  admin: {
    id: "u3",
    name: "Mrs. Sharma",
    phone: "9876511111",
    role: "admin",
    towerName: "Committee",
  },
};

export const visitors: Visitor[] = [
  {
    id: "v1",
    name: "Yuva",
    category: "delivery",
    company: "Flipkart",
    purpose: "Package delivery",
    flatLabel: "A-1005",
    towerName: "Tower A",
    status: "pending",
    requestedAt: new Date().toISOString(),
  },
  {
    id: "v2",
    name: "Vasant Kumar",
    category: "delivery",
    company: "Swiggy Genie",
    flatLabel: "A-1005",
    towerName: "Tower A",
    status: "approved",
    requestedAt: new Date().toISOString(),
    validTill: new Date(Date.now() + 3600_000).toISOString(),
    approvedBy: "You",
  },
  {
    id: "v3",
    name: "Ramkesh Singh",
    category: "delivery",
    company: "Delhivery",
    purpose: "Amazon — kitchen set",
    flatLabel: "A-1005",
    towerName: "Tower A",
    status: "arrived",
    requestedAt: new Date().toISOString(),
    approvedBy: "You",
  },
  {
    id: "v4",
    name: "Keshav Gulati",
    category: "delivery",
    company: "Zomato",
    purpose: "Food items",
    flatLabel: "A-1005",
    towerName: "Tower A",
    status: "exited",
    requestedAt: new Date(Date.now() - 86_400_000).toISOString(),
    approvedBy: "Asmit Patel",
  },
  {
    id: "v5",
    name: "Ankit Verma",
    category: "guest",
    purpose: "Visiting friend",
    flatLabel: "A-1005",
    towerName: "Tower A",
    status: "pending",
    requestedAt: new Date().toISOString(),
  },
];

export const complaints: Complaint[] = [
  {
    id: "c1",
    title: "Lift not working on Tower A",
    category: "Electrical",
    description: "The lift in Tower A has been stuck between floors since morning.",
    status: "in_progress",
    raisedBy: "Priya Menon",
    flatLabel: "A-1005",
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    assignedTo: "Suresh (Electrician)",
  },
  {
    id: "c2",
    title: "Water leakage in parking",
    category: "Plumbing",
    description: "Water is leaking near B-block parking, slippery floor.",
    status: "open",
    raisedBy: "Ankit Rao",
    flatLabel: "B-302",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: "c3",
    title: "Streetlight near clubhouse not working",
    category: "Electrical",
    description: "Dark path near the clubhouse entrance at night.",
    status: "resolved",
    raisedBy: "Mrs. Sharma",
    flatLabel: "C-101",
    createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    assignedTo: "Facility Team",
  },
];

export const amenities: Amenity[] = [
  { id: "a1", name: "Clubhouse", icon: "home", location: "Tower A, Ground Floor", openTime: "08:00", closeTime: "22:00", slotMinutes: 60 },
  { id: "a2", name: "Gym", icon: "activity", location: "Tower B, 1st Floor", openTime: "05:00", closeTime: "22:00", slotMinutes: 60 },
  { id: "a3", name: "Swimming Pool", icon: "droplet", location: "Central Podium", openTime: "06:00", closeTime: "20:00", slotMinutes: 45 },
  { id: "a4", name: "Squash Court", icon: "square", location: "Sports Complex", openTime: "06:00", closeTime: "21:00", slotMinutes: 30 },
];

export const bookings: Booking[] = [
  { id: "b1", amenityId: "a2", amenityName: "Gym", flatLabel: "A-1005", date: new Date().toISOString().slice(0, 10), startTime: "18:00", endTime: "19:00", status: "confirmed" },
];

export const notices: Notice[] = [
  {
    id: "n1",
    title: "Diwali Contribution Update",
    body: "Thank you to all the residents who contributed. Diwali decorations begin this weekend.",
    category: "Event",
    createdBy: "Society Admin",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    pinned: true,
  },
  {
    id: "n2",
    title: "Water Supply Interruption Tomorrow",
    body: "Water supply will be shut off from 10 AM to 1 PM tomorrow for tank cleaning.",
    category: "Maintenance",
    createdBy: "Facility Team",
    createdAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
  },
  {
    id: "n3",
    title: "World Cup Final Screening",
    body: "Join us at the amphitheater! Snacks and drinks planned for everyone.",
    category: "Event",
    createdBy: "Community Team",
    createdAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
  },
];

export const polls: Poll[] = [
  {
    id: "p1",
    question: "Should we install additional CCTV cameras at the back gate?",
    options: [
      { id: "o1", label: "Yes, approve budget", votes: 142 },
      { id: "o2", label: "No, not needed", votes: 18 },
      { id: "o3", label: "Need more info", votes: 34 },
    ],
    totalVotes: 194,
    closesAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  },
];

export const bills: Bill[] = [
  { id: "bl1", title: "April Maintenance", amount: 3540, dueDate: "2026-07-30", period: "2026-2027", status: "unpaid", isNew: true },
  { id: "bl2", title: "March Maintenance", amount: 3540, dueDate: "2026-06-30", period: "2026-2027", status: "paid" },
];

export const flats: Flat[] = [
  { id: "f1", towerId: "t1", number: "1005", label: "A-1005", ownerName: "Priya Menon" },
  { id: "f2", towerId: "t1", number: "302", label: "A-302", ownerName: "Ankit Rao" },
  { id: "f3", towerId: "t2", number: "101", label: "B-101", ownerName: "Mrs. Sharma" },
  { id: "f4", towerId: "t2", number: "504", label: "B-504" },
];

export const notifications: AppNotification[] = [
  {
    id: "n1",
    userId: "u1",
    type: "visitor",
    title: "Amazon Delivery is waiting at the gate",
    body: "Package drop-off",
    meta: { visitorId: "v1" },
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    userId: "u1",
    type: "notice",
    title: "Water supply maintenance",
    body: "Water will be shut off tomorrow 10am–2pm for tank cleaning.",
    meta: { noticeId: "no1" },
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    userId: "u1",
    type: "general",
    title: "Welcome to Portl",
    body: "This is demo mode — connect a backend to see real notifications.",
    meta: null,
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const staffDirectory: StaffMember[] = [
  { id: "s1", name: "Suresh Kumar", role: "Electrician", phone: "9998887771", rating: 4.6 },
  { id: "s2", name: "Ramesh Yadav", role: "Plumber", phone: "9998887772", rating: 4.3 },
  { id: "s3", name: "Rohit Yadav", role: "Security Guard", phone: "9998887773" },
  { id: "s4", name: "Geeta Devi", role: "Housekeeping", phone: "9998887774", rating: 4.8 },
];
