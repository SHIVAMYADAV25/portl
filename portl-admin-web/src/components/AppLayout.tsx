import type { ReactElement } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const nav = [
  { to: "/", label: "Overview", icon: "grid", end: true },
  { to: "/complaints", label: "Tickets", icon: "life-buoy" },
  { to: "/visitors", label: "Visitors", icon: "user-check" },
  { to: "/notices", label: "Notices", icon: "bell" },
  { to: "/polls", label: "Polls", icon: "bar-chart-2" },
  { to: "/residents", label: "Residents", icon: "users" },
  { to: "/towers", label: "Towers & Flats", icon: "home" },
  { to: "/amenities", label: "Amenities", icon: "calendar" },
  { to: "/staff", label: "Staff & Vendors", icon: "briefcase" },
  { to: "/billing", label: "Billing", icon: "credit-card" },
];

// Minimal inline icon set so the dashboard doesn't need an icon library dependency.
function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, ReactElement> = {
    grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    "life-buoy": <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /></>,
    "user-check": <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m17 11 2 2 4-4" /></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
    "bar-chart-2": <><path d="M18 20V10M12 20V4M6 20v-6" /></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>,
    "credit-card": <><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></>,
    "log-out": <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-cream">
      <aside className="w-64 shrink-0 bg-ink900 text-white flex flex-col">
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-ember500 flex items-center justify-center font-bold" style={{ fontFamily: "var(--font-display)" }}>
            P
          </div>
          <div>
            <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>Portl</div>
            <div className="text-xs text-ink300">Admin dashboard</div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? "bg-ember500 text-white" : "text-ink200 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon name={item.icon} className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-1">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-ink300">{user?.towerName ?? "Society Admin"}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink200 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Icon name="log-out" className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export { Icon };
