import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, Input, Label } from "../components/ui";
import { ApiError } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-sm animate-pop">
        <Link to="/" className="inline-block mb-6">
          <img src="/gamyup-logo.svg" alt="GamyUp" className="h-12 w-auto" />
        </Link>
        <h1 className="text-xl font-bold text-ink-950 mb-1">Bem-vindo de volta</h1>
        <p className="text-sm text-slate-500 mb-6">Entre para acompanhar seu treinamento</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Não tem conta?{" "}
          <Link to="/register" className="text-brand-600 font-semibold">
            Criar conta
          </Link>
        </p>

        <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-500">Contas de demonstração:</p>
          <p>Admin: admin@demo.com / admin123</p>
          <p>Participante: carlos@demo.com / 123456</p>
        </div>
      </Card>
    </div>
  );
}
