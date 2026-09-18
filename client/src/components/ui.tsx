import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";
  const variants: Record<string, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/30",
    secondary: "bg-white text-brand-700 border border-brand-200 hover:bg-brand-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    accent: "bg-accent-500 text-white hover:bg-accent-600 shadow-sm shadow-accent-500/30",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card p-5 ${className}`} {...props} />;
}

export function Badge({
  children,
  color = "brand",
  className = "",
}: {
  children: ReactNode;
  color?: "brand" | "green" | "orange" | "slate" | "rose" | "gold";
  className?: string;
}) {
  const colors: Record<string, string> = {
    brand: "bg-brand-100 text-brand-700",
    green: "bg-emerald-100 text-emerald-700",
    orange: "bg-orange-100 text-orange-700",
    slate: "bg-slate-100 text-slate-600",
    rose: "bg-rose-100 text-rose-700",
    gold: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, colorClass = "bg-brand-500" }: { value: number; max: number; colorClass?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full animate-progress ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatTile({ label, value, icon, accent = "brand" }: { label: string; value: ReactNode; icon?: string; accent?: "brand" | "green" | "orange" | "rose" }) {
  const accents: Record<string, string> = {
    brand: "from-brand-500 to-brand-600",
    green: "from-emerald-500 to-emerald-600",
    orange: "from-orange-500 to-orange-600",
    rose: "from-rose-500 to-rose-600",
  };
  return (
    <Card className="flex items-center gap-4">
      <div className={`h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center text-xl text-white shadow-inner`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-ink-950 tracking-tight leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-1 leading-tight">{label}</div>
      </div>
    </Card>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin h-5 w-5 text-brand-600 ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f5fb]">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Card className="text-center py-10 flex flex-col items-center gap-3">
      <div className="text-3xl">📭</div>
      <div className="font-semibold text-slate-800">{title}</div>
      {description && <p className="text-sm text-slate-500 max-w-sm">{description}</p>}
      {action}
    </Card>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 transition ${props.className ?? ""}`}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{children}</label>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-6 animate-pop max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink-950">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  return (
    <div
      className={`px-5 py-3 rounded-xl shadow-lg text-white font-medium animate-pop ${
        type === "success" ? "bg-emerald-600" : "bg-rose-600"
      }`}
    >
      {message}
    </div>
  );
}
