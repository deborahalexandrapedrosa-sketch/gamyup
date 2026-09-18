import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const navItems = [
  { to: "/admin", label: "Programas", icon: "📚", end: true },
  { to: "/admin/users", label: "Participantes", icon: "👥" },
  { to: "/admin/settings", label: "Pontuação", icon: "⚙️" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f4f5fb] md:flex">
      <aside className="md:w-60 shrink-0 bg-ink-950 text-white md:min-h-screen">
        <div className="px-5 py-5 flex items-center gap-2 font-extrabold text-lg">
          <img src="/gamyup-icon.svg" alt="GamyUp" className="h-7 w-7" />
          GamyUp <span className="text-xs font-normal text-white/40">admin</span>
        </div>
        <nav className="px-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3.5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                  isActive ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`
              }
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-5 py-4 hidden md:block absolute bottom-0 w-60">
          <div className="text-xs text-white/40 mb-2 truncate">{user?.name}</div>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="text-xs font-semibold text-white/60 hover:text-white"
          >
            Sair da conta
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
