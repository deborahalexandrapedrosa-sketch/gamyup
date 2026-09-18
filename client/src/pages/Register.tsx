import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Card, Input, Label } from "../components/ui";
import { ApiError } from "../lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar conta");
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
        <h1 className="text-xl font-bold text-ink-950 mb-1">Criar sua conta</h1>
        <p className="text-sm text-slate-500 mb-6">Participe dos treinamentos e comece a pontuar</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome completo</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 6 caracteres" />
          </div>
          {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Já tem conta?{" "}
          <Link to="/login" className="text-brand-600 font-semibold">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
