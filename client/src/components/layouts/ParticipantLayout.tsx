import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const navItems = [
  { to: "/app", label: "Início", icon: "🏠", end: true },
  { to: "/app/scan", label: "Escanear", icon: "📷" },
  { to: "/app/ranking", label: "Ranking", icon: "🏆" },
  { to: "/app/achievements", label: "Conquistas", icon: "🎖️" },
  { to: "/app/history", label: "Histórico", icon: "📜" },
];

export default function ParticipantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f4f5fb] pb-20 md:pb-0">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-brand-700">
            <img src="/gamyup-icon.svg" alt="GamyUp" className="h-8 w-8" />
            <span className="hidden sm:inline">GamyUp</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                    isActive ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100"
                  }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ background: user?.avatar_color || "#6366f1" }}
              title={user?.name}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 hidden sm:block"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100 flex md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                isActive ? "text-brand-600" : "text-slate-400"
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
