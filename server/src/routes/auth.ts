import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db";
import { signToken, authMiddleware } from "../auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
  const { name, email, password } = parsed.data;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

  const colors = ["#6366f1", "#22c55e", "#f97316", "#ec4899", "#06b6d4", "#eab308"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role, avatar_color) VALUES (?, ?, ?, 'participant', ?)")
    .run(name, email, hash, color);

  const user = {
    id: result.lastInsertRowid as number,
    name,
    email,
    role: "participant" as const,
  };
  const token = signToken(user);
  res.status(201).json({ token, user });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Dados inválidos" });
  const { email, password } = parsed.data;

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | { id: number; name: string; email: string; password_hash: string; role: "admin" | "participant" }
    | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "E-mail ou senha inválidos" });
  }

  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = signToken(user);
  res.json({ token, user });
});

authRouter.get("/me", authMiddleware, (req, res) => {
  const row = db.prepare("SELECT id, name, email, role, avatar_color FROM users WHERE id = ?").get(req.user!.id);
  res.json({ user: row });
});
