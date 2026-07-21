import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-ink100 p-5 ${className}`}>{children}</div>;
}

const statusStyle: Record<string, string> = {
  pending: "bg-gold-50 text-gold-500",
  approved: "bg-moss-50 text-moss-600",
  rejected: "bg-rust-50 text-rust-500",
  arrived: "bg-teal-50 text-teal-500",
  exited: "bg-ink-100 text-ink-500",
  left_at_gate: "bg-ink-100 text-ink-500",
  open: "bg-rust-50 text-rust-500",
  assigned: "bg-gold-50 text-gold-500",
  in_progress: "bg-teal-50 text-teal-500",
  resolved: "bg-moss-50 text-moss-600",
  closed: "bg-ink-100 text-ink-500",
  paid: "bg-moss-50 text-moss-600",
  unpaid: "bg-rust-50 text-rust-500",
};

export function Badge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusStyle[status] ?? "bg-ink-100 text-ink-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-ember-500 hover:bg-ember-600 text-white",
    outline: "border border-ink-200 hover:bg-ink-50 text-ink-700",
    ghost: "hover:bg-ink-50 text-ink-600",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h1>
        {subtitle && <p className="text-ink-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center py-16 text-ink-400">
      <p className="font-medium text-ink-600">{title}</p>
      {subtitle && <p className="text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
