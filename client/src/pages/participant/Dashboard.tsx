import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Badge, Card, FullPageLoader, ProgressBar, StatTile } from "../../components/ui";

interface DashboardData {
  totalPoints: number;
  level: { name: string; min_points: number };
  nextLevel?: { name: string; min_points: number };
  rankingPosition: number | null;
  participationPercent: number;
  sessionsAttended: number;
  totalSessionsInPrograms: number;
  activitiesCompleted: number;
  nextSession: any;
  achievementsUnlocked: Array<{ code: string; name: string; icon: string }>;
  classes: Array<{ id: number; name: string; training_name: string }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/api/me/dashboard").then(setData);
  }, []);

  if (!data) return <FullPageLoader />;

  const levelSpan = (data.nextLevel?.min_points ?? data.level.min_points + 500) - data.level.min_points;
  const levelProgress = data.totalPoints - data.level.min_points;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Olá, {user?.name?.split(" ")[0]}! 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Seu progresso no treinamento</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Pontuação total" value={data.totalPoints.toLocaleString("pt-BR")} icon="⭐" accent="brand" />
        <StatTile label="Posição no ranking" value={data.rankingPosition ? `${data.rankingPosition}º` : "-"} icon="🏆" accent="orange" />
        <StatTile label="Participação" value={`${data.participationPercent}%`} icon="📈" accent="green" />
        <StatTile label="Atividades concluídas" value={data.activitiesCompleted} icon="✅" accent="rose" />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nível atual</div>
            <div className="text-lg font-extrabold text-ink-950">{data.level.name}</div>
          </div>
          {data.nextLevel && (
            <div className="text-right text-xs text-slate-400">
              Próximo nível: <span className="font-bold text-slate-600">{data.nextLevel.name}</span>
            </div>
          )}
        </div>
        {data.nextLevel ? (
          <>
            <ProgressBar value={levelProgress} max={levelSpan} />
            <p className="text-xs text-slate-400 mt-2">
              {data.totalPoints} / {data.nextLevel.min_points} pontos para o próximo nível
            </p>
          </>
        ) : (
          <p className="text-xs text-emerald-600 font-semibold mt-2">Nível máximo alcançado! 🎉</p>
        )}
      </Card>

      {data.nextSession && (
        <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <Badge color="slate" className="!bg-white/15 !text-white mb-2">
                Próximo treinamento
              </Badge>
              <div className="text-lg font-bold">{data.nextSession.name}</div>
              <div className="text-sm text-white/70">
                {data.nextSession.training_name} · {data.nextSession.class_name}
              </div>
              <div className="text-sm text-white/70 mt-1">
                📅 {new Date(data.nextSession.date + "T00:00:00").toLocaleDateString("pt-BR")} às {data.nextSession.start_time}
                {data.nextSession.location ? ` · 📍 ${data.nextSession.location}` : ""}
              </div>
            </div>
            <Link to="/app/scan" className="bg-white text-brand-700 font-bold px-5 py-2.5 rounded-xl hover:bg-white/90 transition">
              Fazer check-in →
            </Link>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <div className="font-bold text-ink-950 mb-3">🎖️ Conquistas recentes</div>
          {data.achievementsUnlocked.length === 0 ? (
            <p className="text-sm text-slate-400">Ainda sem conquistas. Participe das atividades para desbloquear!</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.achievementsUnlocked.slice(0, 6).map((a) => (
                <div key={a.code} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-sm">
                  <span className="text-lg">{a.icon}</span>
                  <span className="font-semibold text-amber-800">{a.name}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/app/achievements" className="text-xs font-semibold text-brand-600 mt-3 inline-block">
            Ver todas as conquistas →
          </Link>
        </Card>

        <Card>
          <div className="font-bold text-ink-950 mb-3">📚 Meus treinamentos</div>
          {data.classes.length === 0 ? (
            <p className="text-sm text-slate-400">Você ainda não está matriculado em nenhuma turma.</p>
          ) : (
            <ul className="space-y-2">
              {data.classes.map((c) => (
                <li key={c.id} className="text-sm flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                  <div>
                    <div className="font-semibold text-slate-800">{c.training_name}</div>
                    <div className="text-slate-400 text-xs">{c.name}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
