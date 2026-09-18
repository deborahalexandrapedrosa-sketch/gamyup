import { Router } from "express";
import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { db } from "../db";
import { authMiddleware, requireRole } from "../auth";
import { getIO, sessionRoom, activityRoom } from "../io";
import { getRanking, getSettings } from "../scoring";

export const adminRouter = Router();
adminRouter.use(authMiddleware, requireRole("admin"));

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ---------- Programs ----------
adminRouter.get("/programs", (_req, res) => {
  res.json(db.prepare("SELECT * FROM programs ORDER BY id DESC").all());
});
adminRouter.post("/programs", (req, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "Nome obrigatório" });
  const r = db.prepare("INSERT INTO programs (name, description) VALUES (?, ?)").run(name, description);
  res.status(201).json({ id: r.lastInsertRowid });
});
adminRouter.put("/programs/:id", (req, res) => {
  const { name, description } = req.body;
  db.prepare("UPDATE programs SET name = ?, description = ? WHERE id = ?").run(name, description, req.params.id);
  res.json({ ok: true });
});
adminRouter.delete("/programs/:id", (req, res) => {
  db.prepare("DELETE FROM programs WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- Trainings ----------
adminRouter.get("/trainings", (req, res) => {
  const { program_id } = req.query;
  if (program_id) {
    res.json(db.prepare("SELECT * FROM trainings WHERE program_id = ? ORDER BY id DESC").all(program_id));
  } else {
    res.json(db.prepare("SELECT * FROM trainings ORDER BY id DESC").all());
  }
});
adminRouter.post("/trainings", (req, res) => {
  const { program_id = null, name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "Nome obrigatório" });
  const r = db.prepare("INSERT INTO trainings (program_id, name, description) VALUES (?, ?, ?)").run(program_id, name, description);
  res.status(201).json({ id: r.lastInsertRowid });
});
adminRouter.put("/trainings/:id", (req, res) => {
  const { name, description, program_id } = req.body;
  db.prepare("UPDATE trainings SET name = ?, description = ?, program_id = ? WHERE id = ?").run(
    name,
    description,
    program_id ?? null,
    req.params.id
  );
  res.json({ ok: true });
});
adminRouter.delete("/trainings/:id", (req, res) => {
  db.prepare("DELETE FROM trainings WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- Classes ----------
adminRouter.get("/classes", (req, res) => {
  const { training_id } = req.query;
  if (training_id) {
    res.json(db.prepare("SELECT * FROM classes WHERE training_id = ? ORDER BY id DESC").all(training_id));
  } else {
    res.json(db.prepare("SELECT * FROM classes ORDER BY id DESC").all());
  }
});
adminRouter.post("/classes", (req, res) => {
  const { training_id, name, ranking_visibility = "public" } = req.body;
  if (!training_id || !name) return res.status(400).json({ error: "Dados obrigatórios ausentes" });
  const r = db
    .prepare("INSERT INTO classes (training_id, name, ranking_visibility) VALUES (?, ?, ?)")
    .run(training_id, name, ranking_visibility);
  res.status(201).json({ id: r.lastInsertRowid });
});
adminRouter.put("/classes/:id", (req, res) => {
  const { name, ranking_visibility } = req.body;
  db.prepare("UPDATE classes SET name = ?, ranking_visibility = ? WHERE id = ?").run(name, ranking_visibility, req.params.id);
  res.json({ ok: true });
});
adminRouter.delete("/classes/:id", (req, res) => {
  db.prepare("DELETE FROM classes WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

adminRouter.get("/classes/:id/participants", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.avatar_color, e.enrolled_at
       FROM enrollments e JOIN users u ON u.id = e.user_id
       WHERE e.class_id = ? ORDER BY u.name`
    )
    .all(req.params.id);
  res.json(rows);
});

adminRouter.post("/classes/:id/enroll", (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
  if (!user) return res.status(404).json({ error: "Participante não encontrado com esse e-mail" });
  try {
    db.prepare("INSERT INTO enrollments (class_id, user_id) VALUES (?, ?)").run(req.params.id, user.id);
    res.status(201).json({ ok: true });
  } catch {
    res.status(409).json({ error: "Participante já matriculado" });
  }
});

adminRouter.delete("/classes/:id/enroll/:userId", (req, res) => {
  db.prepare("DELETE FROM enrollments WHERE class_id = ? AND user_id = ?").run(req.params.id, req.params.userId);
  res.json({ ok: true });
});

// ---------- Sessions (encontros) ----------
adminRouter.get("/sessions", (req, res) => {
  const { class_id } = req.query;
  if (class_id) {
    res.json(db.prepare("SELECT * FROM sessions WHERE class_id = ? ORDER BY order_index, date").all(class_id));
  } else {
    res.json(db.prepare("SELECT * FROM sessions ORDER BY date DESC").all());
  }
});
adminRouter.get("/sessions/:id", (req, res) => {
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "Encontro não encontrado" });
  const activities = db
    .prepare("SELECT * FROM activities WHERE session_id = ? ORDER BY order_index")
    .all(req.params.id);
  res.json({ ...session, activities });
});
adminRouter.post("/sessions", (req, res) => {
  const { class_id, name, date, start_time, end_time = null, location = "", checkin_tolerance_minutes = 10 } = req.body;
  if (!class_id || !name || !date || !start_time) return res.status(400).json({ error: "Dados obrigatórios ausentes" });

  const countRow = db.prepare("SELECT COUNT(*) as c FROM sessions WHERE class_id = ?").get(class_id) as { c: number };
  const r = db
    .prepare(
      `INSERT INTO sessions (class_id, name, date, start_time, end_time, location, checkin_tolerance_minutes, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(class_id, name, date, start_time, end_time, location, checkin_tolerance_minutes, countRow.c);
  const sessionId = r.lastInsertRowid as number;

  const insertActivity = db.prepare(
    `INSERT INTO activities (session_id, type, name, description, status, qr_token, points_config, config, order_index, required)
     VALUES (?, ?, ?, ?, 'open', ?, ?, '{}', ?, 1)`
  );
  insertActivity.run(sessionId, "checkin", "Check-in do Encontro", "Confirme sua presença", nanoid(10), JSON.stringify({ early: 20, on_time: 15, late: 5 }), 0);
  insertActivity.run(sessionId, "checkout", "Check-out do Encontro", "Finalize sua participação", nanoid(10), JSON.stringify({ points: 10 }), 90);

  res.status(201).json({ id: sessionId });
});
adminRouter.put("/sessions/:id", (req, res) => {
  const { name, date, start_time, end_time, location, checkin_tolerance_minutes } = req.body;
  db.prepare(
    `UPDATE sessions SET name = ?, date = ?, start_time = ?, end_time = ?, location = ?, checkin_tolerance_minutes = ? WHERE id = ?`
  ).run(name, date, start_time, end_time, location, checkin_tolerance_minutes, req.params.id);
  res.json({ ok: true });
});
adminRouter.post("/sessions/:id/open", (req, res) => {
  db.prepare("UPDATE sessions SET status = 'open' WHERE id = ?").run(req.params.id);
  getIO().to(sessionRoom(Number(req.params.id))).emit("session:status", { sessionId: Number(req.params.id), status: "open" });
  res.json({ ok: true });
});
adminRouter.post("/sessions/:id/close", (req, res) => {
  db.prepare("UPDATE sessions SET status = 'closed' WHERE id = ?").run(req.params.id);
  getIO().to(sessionRoom(Number(req.params.id))).emit("session:status", { sessionId: Number(req.params.id), status: "closed" });
  res.json({ ok: true });
});
adminRouter.delete("/sessions/:id", (req, res) => {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- Activities ----------
adminRouter.post("/sessions/:id/activities", (req, res) => {
  const { type, name, description = "", points_config = {}, config = {}, required = false } = req.body;
  const countRow = db.prepare("SELECT COUNT(*) as c FROM activities WHERE session_id = ?").get(req.params.id) as {
    c: number;
  };
  const r = db
    .prepare(
      `INSERT INTO activities (session_id, type, name, description, status, qr_token, points_config, config, order_index, required)
       VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`
    )
    .run(req.params.id, type, name, description, nanoid(10), JSON.stringify(points_config), JSON.stringify(config), countRow.c, required ? 1 : 0);
  res.status(201).json({ id: r.lastInsertRowid });
});

adminRouter.get("/activities/:id", (req, res) => {
  const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(req.params.id) as any;
  if (!activity) return res.status(404).json({ error: "Atividade não encontrada" });
  if (activity.type === "quiz") {
    activity.questions = db
      .prepare("SELECT * FROM quiz_questions WHERE activity_id = ? ORDER BY order_index")
      .all(req.params.id);
  }
  if (activity.type === "survey") {
    activity.questions = db
      .prepare("SELECT * FROM survey_questions WHERE activity_id = ? ORDER BY order_index")
      .all(req.params.id);
  }
  res.json(activity);
});

adminRouter.put("/activities/:id", (req, res) => {
  const { name, description, points_config, config, required } = req.body;
  db.prepare(
    `UPDATE activities SET name = ?, description = ?, points_config = ?, config = ?, required = ? WHERE id = ?`
  ).run(name, description, JSON.stringify(points_config ?? {}), JSON.stringify(config ?? {}), required ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

adminRouter.delete("/activities/:id", (req, res) => {
  db.prepare("DELETE FROM activities WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

adminRouter.post("/activities/:id/open", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE activities SET status = 'open' WHERE id = ?").run(id);
  const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as any;
  getIO().to(sessionRoom(activity.session_id)).emit("activity:status", { activityId: id, status: "open", type: activity.type, name: activity.name });
  res.json({ ok: true });
});

adminRouter.post("/activities/:id/close", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("UPDATE activities SET status = 'closed' WHERE id = ?").run(id);
  const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as any;
  getIO().to(sessionRoom(activity.session_id)).emit("activity:status", { activityId: id, status: "closed", type: activity.type, name: activity.name });
  getIO().to(activityRoom(id)).emit("activity:status", { activityId: id, status: "closed" });
  res.json({ ok: true });
});

adminRouter.get("/activities/:id/qrcode", async (req, res) => {
  const activity = db.prepare("SELECT qr_token FROM activities WHERE id = ?").get(req.params.id) as
    | { qr_token: string }
    | undefined;
  if (!activity) return res.status(404).json({ error: "Atividade não encontrada" });
  const url = `${CLIENT_URL}/a/${activity.qr_token}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 1 });
  res.json({ url, dataUrl, token: activity.qr_token });
});

// ---------- Quiz questions ----------
adminRouter.post("/activities/:id/questions", (req, res) => {
  const { question, type = "multiple_choice", options = [], correct_index = 0, time_limit_seconds = 20, points = 100, speed_bonus_max = 20 } = req.body;
  const countRow = db.prepare("SELECT COUNT(*) as c FROM quiz_questions WHERE activity_id = ?").get(req.params.id) as {
    c: number;
  };
  const r = db
    .prepare(
      `INSERT INTO quiz_questions (activity_id, question, type, options, correct_index, time_limit_seconds, points, speed_bonus_max, order_index)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.id, question, type, JSON.stringify(options), correct_index, time_limit_seconds, points, speed_bonus_max, countRow.c);
  res.status(201).json({ id: r.lastInsertRowid });
});
adminRouter.put("/questions/:id", (req, res) => {
  const { question, type, options, correct_index, time_limit_seconds, points, speed_bonus_max } = req.body;
  db.prepare(
    `UPDATE quiz_questions SET question = ?, type = ?, options = ?, correct_index = ?, time_limit_seconds = ?, points = ?, speed_bonus_max = ? WHERE id = ?`
  ).run(question, type, JSON.stringify(options), correct_index, time_limit_seconds, points, speed_bonus_max, req.params.id);
  res.json({ ok: true });
});
adminRouter.delete("/questions/:id", (req, res) => {
  db.prepare("DELETE FROM quiz_questions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Launch a quiz question live (push to participants in the activity room)
adminRouter.post("/questions/:id/launch", (req, res) => {
  const question = db.prepare("SELECT * FROM quiz_questions WHERE id = ?").get(req.params.id) as any;
  if (!question) return res.status(404).json({ error: "Pergunta não encontrada" });
  const startedAt = Date.now();
  getIO()
    .to(activityRoom(question.activity_id))
    .emit("quiz:question:start", {
      questionId: question.id,
      question: question.question,
      type: question.type,
      options: JSON.parse(question.options),
      timeLimitSeconds: question.time_limit_seconds,
      startedAt,
    });
  res.json({ ok: true, startedAt });
});

adminRouter.post("/questions/:id/reveal", (req, res) => {
  const question = db.prepare("SELECT * FROM quiz_questions WHERE id = ?").get(req.params.id) as any;
  if (!question) return res.status(404).json({ error: "Pergunta não encontrada" });
  const responses = db.prepare("SELECT * FROM quiz_responses WHERE question_id = ?").all(question.id) as any[];
  const optionCounts = (JSON.parse(question.options) as string[]).map(
    (_, idx) => responses.filter((r) => r.selected_index === idx).length
  );
  const payload = {
    questionId: question.id,
    correctIndex: question.correct_index,
    optionCounts,
    totalResponses: responses.length,
    topScorers: db
      .prepare(
        `SELECT u.name, qr.points_earned FROM quiz_responses qr JOIN users u ON u.id = qr.user_id
         WHERE qr.question_id = ? ORDER BY qr.points_earned DESC LIMIT 5`
      )
      .all(question.id),
  };
  getIO().to(activityRoom(question.activity_id)).emit("quiz:question:reveal", payload);
  res.json(payload);
});

// ---------- Survey questions ----------
adminRouter.post("/activities/:id/survey-questions", (req, res) => {
  const { question, type = "rating", options = [] } = req.body;
  const countRow = db.prepare("SELECT COUNT(*) as c FROM survey_questions WHERE activity_id = ?").get(req.params.id) as {
    c: number;
  };
  const r = db
    .prepare("INSERT INTO survey_questions (activity_id, question, type, options, order_index) VALUES (?, ?, ?, ?, ?)")
    .run(req.params.id, question, type, JSON.stringify(options), countRow.c);
  res.status(201).json({ id: r.lastInsertRowid });
});
adminRouter.delete("/survey-questions/:id", (req, res) => {
  db.prepare("DELETE FROM survey_questions WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- Live results / dashboard ----------
adminRouter.get("/sessions/:id/live", (req, res) => {
  const sessionId = Number(req.params.id);
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId) as any;
  if (!session) return res.status(404).json({ error: "Encontro não encontrado" });

  const enrolled = db.prepare("SELECT COUNT(*) as c FROM enrollments WHERE class_id = ?").get(session.class_id) as {
    c: number;
  };
  const checkins = db.prepare("SELECT COUNT(*) as c FROM checkins WHERE session_id = ?").get(sessionId) as { c: number };
  const checkouts = db.prepare("SELECT COUNT(*) as c FROM checkouts WHERE session_id = ?").get(sessionId) as {
    c: number;
  };
  const activities = db.prepare("SELECT * FROM activities WHERE session_id = ? ORDER BY order_index").all(sessionId) as any[];

  const activityStats = activities.map((a) => {
    let count = 0;
    if (a.type === "wordcloud") count = (db.prepare("SELECT COUNT(*) as c FROM wordcloud_entries WHERE activity_id = ?").get(a.id) as any).c;
    else if (a.type === "dynamic") count = (db.prepare("SELECT COUNT(*) as c FROM dynamic_completions WHERE activity_id = ?").get(a.id) as any).c;
    else if (a.type === "quiz") count = (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM quiz_responses qr JOIN quiz_questions qq ON qq.id = qr.question_id WHERE qq.activity_id = ?").get(a.id) as any).c;
    else if (a.type === "survey") count = (db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM survey_responses sr JOIN survey_questions sq ON sq.id = sr.survey_question_id WHERE sq.activity_id = ?").get(a.id) as any).c;
    else if (a.type === "checkin") count = (db.prepare("SELECT COUNT(*) as c FROM checkins WHERE activity_id = ?").get(a.id) as any).c;
    else if (a.type === "checkout") count = (db.prepare("SELECT COUNT(*) as c FROM checkouts WHERE activity_id = ?").get(a.id) as any).c;
    return { id: a.id, type: a.type, name: a.name, status: a.status, count };
  });

  const mostActive = db
    .prepare(
      `SELECT u.name, u.avatar_color, COALESCE(SUM(pl.points),0) as total
       FROM users u LEFT JOIN points_ledger pl ON pl.user_id = u.id AND pl.session_id = ?
       WHERE u.role = 'participant' GROUP BY u.id HAVING total > 0 ORDER BY total DESC LIMIT 5`
    )
    .all(sessionId);

  res.json({
    session,
    enrolled: enrolled.c,
    checkins: checkins.c,
    checkouts: checkouts.c,
    activities: activityStats,
    ranking: getRanking({ sessionId }),
    mostActive,
  });
});

adminRouter.get("/activities/:id/wordcloud-data", (req, res) => {
  const rows = db
    .prepare(
      `SELECT LOWER(TRIM(word)) as w, COUNT(*) as count FROM wordcloud_entries WHERE activity_id = ? GROUP BY w ORDER BY count DESC`
    )
    .all(req.params.id);
  res.json(rows);
});

adminRouter.get("/settings", (_req, res) => {
  res.json(getSettings());
});
adminRouter.put("/settings", (req, res) => {
  db.prepare("INSERT INTO settings (id, default_points) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET default_points = excluded.default_points").run(
    JSON.stringify(req.body)
  );
  res.json({ ok: true });
});

// ---------- Users ----------
adminRouter.get("/users", (req, res) => {
  const { q } = req.query as { q?: string };
  if (q) {
    res.json(
      db
        .prepare("SELECT id, name, email, role, avatar_color FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY name")
        .all(`%${q}%`, `%${q}%`)
    );
  } else {
    res.json(db.prepare("SELECT id, name, email, role, avatar_color FROM users ORDER BY name").all());
  }
});

// ---------- Reports ----------
adminRouter.get("/reports/class/:id", (req, res) => {
  const classId = req.params.id;
  const participants = db
    .prepare(
      `SELECT u.id, u.name, u.email, COALESCE(SUM(pl.points),0) as total_points,
        (SELECT COUNT(*) FROM checkins c JOIN sessions s ON s.id = c.session_id WHERE s.class_id = ? AND c.user_id = u.id) as checkins_count
       FROM users u
       JOIN enrollments e ON e.user_id = u.id AND e.class_id = ?
       LEFT JOIN points_ledger pl ON pl.user_id = u.id AND pl.class_id = ?
       GROUP BY u.id ORDER BY total_points DESC`
    )
    .all(classId, classId, classId);
  const sessionsCount = (db.prepare("SELECT COUNT(*) as c FROM sessions WHERE class_id = ?").get(classId) as any).c;
  res.json({ participants, sessionsCount });
});
