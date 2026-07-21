import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Overview from "@/pages/Overview";
import Complaints from "@/pages/Complaints";
import Visitors from "@/pages/Visitors";
import Notices from "@/pages/Notices";
import Polls from "@/pages/Polls";
import Residents from "@/pages/Residents";
import Towers from "@/pages/Towers";
import Amenities from "@/pages/Amenities";
import Staff from "@/pages/Staff";
import Billing from "@/pages/Billing";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  if (!hasHydrated) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hasHydrated) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Overview />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="visitors" element={<Visitors />} />
            <Route path="notices" element={<Notices />} />
            <Route path="polls" element={<Polls />} />
            <Route path="residents" element={<Residents />} />
            <Route path="towers" element={<Towers />} />
            <Route path="amenities" element={<Amenities />} />
            <Route path="staff" element={<Staff />} />
            <Route path="billing" element={<Billing />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
