import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Card, FullPageLoader } from "../../components/ui";

interface RankRow {
  position: number;
  id: number;
  name: string;
  avatar_color: string;
  total: number;
}

const medals = ["🥇", "🥈", "🥉"];

export default function Ranking() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RankRow[] | null>(null);

  useEffect(() => {
    api.get<RankRow[]>("/api/ranking").then(setRows);
  }, []);

  if (!rows) return <FullPageLoader />;

  const me = rows.find((r) => r.id === user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">🏆 Ranking de Participação</h1>
        <p className="text-slate-500 text-sm mt-1">Classificação geral de todos os treinamentos</p>
      </div>

      {me && (
        <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-between">
          <div>
            <div className="text-xs text-white/70 uppercase font-semibold tracking-wide">Você está em</div>
            <div className="text-2xl font-extrabold">{me.position}º lugar</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/70 uppercase font-semibold tracking-wide">Pontos</div>
            <div className="text-2xl font-extrabold">{me.total}</div>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400 p-6">Ainda não há pontuações registradas.</p>
        ) : (
          <ul>
            {rows.map((r) => (
              <li
                key={r.id}
                className={`flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0 ${
                  r.id === user?.id ? "bg-brand-50" : ""
                }`}
              >
                <div className="w-7 text-center text-sm font-bold text-slate-400">
                  {medals[r.position - 1] || `${r.position}º`}
                </div>
                <div className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: r.avatar_color }}>
                  {r.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {r.name} {r.id === user?.id && <span className="text-brand-600 text-xs">(você)</span>}
                  </div>
                </div>
                <div className="text-sm font-extrabold text-brand-600">{r.total} pts</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
