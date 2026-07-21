import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [phone, setPhone] = useState("9876511111");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(phone, password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error ?? "Something went wrong");
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-ember-500 flex items-center justify-center text-white font-bold" style={{ fontFamily: "var(--font-display)" }}>
            P
          </div>
          <div>
            <div className="font-semibold text-ink-900" style={{ fontFamily: "var(--font-display)" }}>Portl</div>
            <div className="text-xs text-ink-400">Society Admin dashboard</div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-ink-100 p-6">
          <h1 className="text-lg font-semibold text-ink-900 mb-1">Sign in</h1>
          <p className="text-sm text-ink-400 mb-6">Committee & management access only.</p>

          <label className="block text-sm font-medium text-ink-500 mb-1.5">Mobile number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-ink-100 rounded-xl px-3.5 py-2.5 mb-4 text-ink-800 outline-none focus:border-ember-400"
            placeholder="9876511111"
          />

          <label className="block text-sm font-medium text-ink-500 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-ink-100 rounded-xl px-3.5 py-2.5 mb-2 text-ink-800 outline-none focus:border-ember-400"
            placeholder="••••••••"
          />
          <p className="text-xs text-ink-300 mb-4">Demo admin: 9876511111 / demo1234 (seeded by the backend).</p>

          {error && <p className="text-sm text-rust-500 font-medium mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ember-500 hover:bg-ember-600 text-white font-semibold rounded-xl py-2.5 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
