import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Badge, Card, FullPageLoader, Input } from "../../components/ui";

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_color: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      api.get<UserRow[]>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(setUsers);
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">👥 Participantes</h1>
        <p className="text-slate-500 text-sm mt-1">Todos os usuários cadastrados na plataforma</p>
      </div>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="max-w-sm" />

      {!users ? (
        <FullPageLoader />
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul>
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: u.avatar_color }}>
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </div>
                <Badge color={u.role === "admin" ? "brand" : "slate"}>{u.role === "admin" ? "Facilitador" : "Participante"}</Badge>
              </li>
            ))}
            {users.length === 0 && <p className="text-sm text-slate-400 p-6">Nenhum usuário encontrado.</p>}
          </ul>
        </Card>
      )}
    </div>
  );
}
