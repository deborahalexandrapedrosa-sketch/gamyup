import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-hero text-white flex flex-col">
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center bg-white rounded-xl px-3 py-2 shadow-sm shrink-0">
          <img src="/gamyup-logo.svg" alt="GamyUp" className="h-7 sm:h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-white/80 hover:text-white">
            Entrar
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-white text-ink-950 px-4 py-2 rounded-xl hover:bg-white/90 transition"
          >
            Criar conta
          </Link>
        </div>
      </header>

      <section className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide uppercase mb-5">
            Gamificação para treinamentos corporativos
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Transforme treinamentos em <span className="text-brand-300">experiências.</span>
          </h1>
          <p className="mt-5 text-lg text-white/70 max-w-md">
            Engaje, interaja, pontue e acompanhe a evolução dos participantes em tempo real — em cursos, workshops,
            palestras e programas de desenvolvimento.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login" className="px-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold transition shadow-lg shadow-brand-500/30">
              Entrar
            </Link>
            <Link to="/register" className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition border border-white/10">
              Criar conta
            </Link>
            <Link to="/app/scan" className="px-6 py-3.5 rounded-xl border border-white/20 hover:bg-white/10 font-bold transition">
              Acessar treinamento →
            </Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm text-white/50">
            <div>
              <div className="text-2xl font-extrabold text-white">+30</div>
              comportamentos pontuáveis
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">100%</div>
              tempo real
            </div>
            <div>
              <div className="text-2xl font-extrabold text-white">5</div>
              níveis de evolução
            </div>
          </div>
        </div>

        <div className="animate-pop">
          <div className="card bg-white/95 text-ink-950 p-6 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">🏆 Ranking ao vivo</div>
              <span className="text-xs text-slate-400">Encontro 1</span>
            </div>
            {[
              ["Beatriz Souza", 1850, "#ec4899"],
              ["Carlos Silva", 1720, "#6366f1"],
              ["Diego Santos", 1640, "#22c55e"],
              ["Você", 1280, "#f97316"],
            ].map(([name, pts, color], i) => (
              <div key={name as string} className={`flex items-center gap-3 py-2.5 ${i === 3 ? "bg-brand-50 -mx-2 px-2 rounded-xl" : ""}`}>
                <div className="w-5 text-sm font-bold text-slate-400">{i + 1}º</div>
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: color as string }}>
                  {(name as string)[0]}
                </div>
                <div className="flex-1 text-sm font-semibold">{name}</div>
                <div className="text-sm font-bold text-brand-600">{pts} pts</div>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Nível: Engajado</span>
              <span>1.280 / 1.500 pontos</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto w-full px-6 py-6 text-xs text-white/30">
        © 2026 GamyUp — plataforma de gamificação para treinamentos.
      </footer>
    </div>
  );
}
