import "dotenv/config";
import { v4 as uuid } from "uuid";
import { db } from "./db";
import { runMigrations } from "./db/migrate";
import {
  societies,
  towers,
  flats,
  users,
  visitors,
  complaints,
  amenities,
  notices,
  polls,
  pollOptions,
  staff,
  bills,
} from "./db/schema";
import { hashPassword } from "./utils/password";

async function seed() {
  await runMigrations();
  console.log("Seeding Portl demo data...");

  const societyId = uuid();
  await db.insert(societies).values({ id: societyId, name: "Cedar Heights", address: "Baner, Pune" });

  const towerAId = uuid();
  await db.insert(towers).values({ id: towerAId, societyId, name: "Tower A" });

  const flatId = uuid();
  await db.insert(flats).values({ id: flatId, towerId: towerAId, number: "1005", label: "A-1005", ownerName: "Priya Menon" });

  // Demo users — same phone numbers as the mobile app's demoUsers, password "demo1234" if
  // logging in via /auth/login, or OTP "1234" via /auth/verify-otp (whichever the app uses).
  const passwordHash = await hashPassword("demo1234");
  const residentId = uuid();
  const guardId = uuid();
  const adminId = uuid();

  await db.insert(users).values([
    { id: residentId, name: "Priya Menon", phone: "9876543210", passwordHash, role: "resident", flatId, flatLabel: "A-1005", towerName: "Tower A" },
    { id: guardId, name: "Rohit Yadav", phone: "9876500000", passwordHash, role: "guard", towerName: "Main Gate" },
    { id: adminId, name: "Mrs. Sharma", phone: "9876511111", passwordHash, role: "admin", towerName: "Committee" },
  ]);

  await db.insert(visitors).values([
    {
      id: uuid(),
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
      id: uuid(),
      name: "Ramkesh Singh",
      category: "delivery",
      company: "Delhivery",
      purpose: "Amazon — kitchen set",
      flatLabel: "A-1005",
      towerName: "Tower A",
      status: "arrived",
      approvedByUserId: residentId,
      requestedAt: new Date().toISOString(),
    },
  ]);

  await db.insert(complaints).values([
    {
      id: uuid(),
      title: "Lift not working on Tower A",
      category: "Electrical",
      description: "The lift in Tower A has been stuck between floors since morning.",
      status: "in_progress",
      raisedByUserId: residentId,
      flatLabel: "A-1005",
      assignedTo: "Suresh (Electrician)",
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const amenityIds = [uuid(), uuid(), uuid(), uuid()];
  await db.insert(amenities).values([
    { id: amenityIds[0], name: "Clubhouse", icon: "home", location: "Tower A, Ground Floor", openTime: "08:00", closeTime: "22:00", slotMinutes: 60 },
    { id: amenityIds[1], name: "Gym", icon: "activity", location: "Tower B, 1st Floor", openTime: "05:00", closeTime: "22:00", slotMinutes: 60 },
    { id: amenityIds[2], name: "Swimming Pool", icon: "droplet", location: "Central Podium", openTime: "06:00", closeTime: "20:00", slotMinutes: 45 },
    { id: amenityIds[3], name: "Squash Court", icon: "square", location: "Sports Complex", openTime: "06:00", closeTime: "21:00", slotMinutes: 30 },
  ]);

  await db.insert(notices).values([
    {
      id: uuid(),
      title: "Diwali Contribution Update",
      body: "Thank you to all the residents who contributed. Diwali decorations begin this weekend.",
      category: "Event",
      createdByUserId: adminId,
      pinned: true,
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: uuid(),
      title: "Water Supply Interruption Tomorrow",
      body: "Water supply will be shut off from 10 AM to 1 PM tomorrow for tank cleaning.",
      category: "Maintenance",
      createdByUserId: adminId,
      createdAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    },
  ]);

  const pollId = uuid();
  await db.insert(polls).values({
    id: pollId,
    question: "Should we install additional CCTV cameras at the back gate?",
    createdByUserId: adminId,
    closesAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  });
  await db.insert(pollOptions).values([
    { id: uuid(), pollId, label: "Yes, approve budget" },
    { id: uuid(), pollId, label: "No, not needed" },
    { id: uuid(), pollId, label: "Need more info" },
  ]);

  await db.insert(staff).values([
    { id: uuid(), name: "Suresh Kumar", role: "Electrician", phone: "9998887771", rating: 4.6 },
    { id: uuid(), name: "Ramesh Yadav", role: "Plumber", phone: "9998887772", rating: 4.3 },
    { id: uuid(), name: "Rohit Yadav", role: "Security Guard", phone: "9998887773" },
    { id: uuid(), name: "Geeta Devi", role: "Housekeeping", phone: "9998887774", rating: 4.8 },
  ]);

  await db.insert(bills).values([
    { id: uuid(), flatLabel: "A-1005", title: "April Maintenance", amount: 3540, period: "2026-2027", dueDate: "2026-07-30", status: "unpaid" },
    { id: uuid(), flatLabel: "A-1005", title: "March Maintenance", amount: 3540, period: "2026-2027", dueDate: "2026-06-30", status: "paid" },
  ]);

  console.log("Done. Demo accounts (password: demo1234, or OTP 1234):");
  console.log("  Resident — 9876543210");
  console.log("  Guard    — 9876500000");
  console.log("  Admin    — 9876511111");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
