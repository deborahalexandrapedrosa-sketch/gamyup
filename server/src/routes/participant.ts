import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../auth";
import { getIO, sessionRoom, activityRoom } from "../io";
import { addPoints, totalPointsForUser, currentLevel, evaluateAchievements, getSettings, getRanking } from "../scoring";

export const participantRouter = Router();
participantRouter.use(authMiddleware);

function getActivityByToken(token: string) {
  const activity = db
    .prepare(
      `SELECT a.*, s.class_id as class_id, s.date as session_date, s.start_time as session_start_time,
              s.checkin_tolerance_minutes as checkin_tolerance_minutes, s.name as session_name, s.status as session_status
       FROM activities a JOIN sessions s ON s.id = a.session_id
       WHERE a.qr_token = ?`
    )
    .get(token) as any;
  return activity;
}

// ---------- Dashboard ----------
participantRouter.get("/me/dashboard", (req, res) => {
  const userId = req.user!.id;
  const total = totalPointsForUser(userId);
  const { current, next } = currentLevel(total);
  const ranking = getRanking({});
  const position = ranking.find((r) => r.id === userId)?.position ?? null;

  const enrolledClasses = db
    .prepare(
      `SELECT c.id, c.name, t.name as training_name FROM enrollments e
       JOIN classes c ON c.id = e.class_id JOIN trainings t ON t.id = c.training_id
       WHERE e.user_id = ?`
    )
    .all(userId) as any[];

  const nextSession = db
    .prepare(
      `SELECT s.*, c.name as class_name, t.name as training_name FROM sessions s
       JOIN classes c ON c.id = s.class_id JOIN trainings t ON t.id = c.training_id
       JOIN enrollments e ON e.class_id = c.id
       WHERE e.user_id = ? AND s.status != 'closed'
       ORDER BY s.date ASC, s.start_time ASC LIMIT 1`
    )
    .get(userId);

  const sessionsAttended = (
    db.prepare("SELECT COUNT(DISTINCT session_id) as c FROM checkins WHERE user_id = ?").get(userId) as any
  ).c;

  const activitiesCompleted =
    (db.prepare("SELECT COUNT(*) as c FROM quiz_responses WHERE user_id = ?").get(userId) as any).c +
    (db.prepare("SELECT COUNT(*) as c FROM wordcloud_entries WHERE user_id = ?").get(userId) as any).c +
    (db.prepare("SELECT COUNT(*) as c FROM dynamic_completions WHERE user_id = ?").get(userId) as any).c;

  const totalSessionsInPrograms = enrolledClasses.length
    ? (db
        .prepare(
          `SELECT COUNT(*) as c FROM sessions s WHERE s.class_id IN (${enrolledClasses.map(() => "?").join(",") || "0"})`
        )
        .get(...enrolledClasses.map((c) => c.id)) as any).c
    : 0;

  const achievementsUnlocked = db
    .prepare(
      `SELECT a.code, a.name, a.description, a.icon, ua.unlocked_at FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = ? ORDER BY ua.unlocked_at DESC`
    )
    .all(userId);

  res.json({
    totalPoints: total,
    level: current,
    nextLevel: next,
    rankingPosition: position,
    participationPercent: totalSessionsInPrograms ? Math.round((sessionsAttended / totalSessionsInPrograms) * 100) : 0,
    sessionsAttended,
    totalSessionsInPrograms,
    activitiesCompleted,
    nextSession,
    achievementsUnlocked,
    classes: enrolledClasses,
  });
});

participantRouter.get("/me/history", (req, res) => {
  const userId = req.user!.id;
  const ledger = db
    .prepare(
      `SELECT pl.*, s.name as session_name FROM points_ledger pl LEFT JOIN sessions s ON s.id = pl.session_id
       WHERE pl.user_id = ? ORDER BY pl.created_at DESC LIMIT 200`
    )
    .all(userId);
  const sessions = db
    .prepare(
      `SELECT s.id, s.name, s.date, c.checkin_time, c.status as checkin_status, co.checkout_time
       FROM sessions s
       JOIN enrollments e ON e.class_id = s.class_id AND e.user_id = ?
       LEFT JOIN checkins c ON c.session_id = s.id AND c.user_id = ?
       LEFT JOIN checkouts co ON co.session_id = s.id AND co.user_id = ?
       ORDER BY s.date DESC`
    )
    .all(userId, userId, userId);
  res.json({ ledger, sessions });
});

participantRouter.get("/me/trainings", (req, res) => {
  const userId = req.user!.id;
  const rows = db
    .prepare(
      `SELECT c.id as class_id, c.name as class_name, t.name as training_name, p.name as program_name
       FROM enrollments e
       JOIN classes c ON c.id = e.class_id
       JOIN trainings t ON t.id = c.training_id
       LEFT JOIN programs p ON p.id = t.program_id
       WHERE e.user_id = ?`
    )
    .all(userId) as any[];
  const withSessions = rows.map((r) => ({
    ...r,
    sessions: db.prepare("SELECT * FROM sessions WHERE class_id = ? ORDER BY date, start_time").all(r.class_id),
  }));
  res.json(withSessions);
});

// ---------- Achievements / Levels ----------
participantRouter.get("/achievements", (req, res) => {
  const userId = req.user!.id;
  const all = db.prepare("SELECT * FROM achievements").all() as any[];
  const unlocked = new Set(
    (db.prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?").all(userId) as any[]).map(
      (r) => r.achievement_id
    )
  );
  res.json(all.map((a) => ({ ...a, unlocked: unlocked.has(a.id) })));
});
participantRouter.get("/levels", (_req, res) => {
  res.json(db.prepare("SELECT * FROM levels ORDER BY order_index").all());
});

// ---------- Ranking ----------
participantRouter.get("/ranking", (req, res) => {
  const { scope, id } = req.query as { scope?: string; id?: string };
  if (scope === "session" && id) return res.json(getRanking({ sessionId: Number(id) }));
  if (scope === "class" && id) return res.json(getRanking({ classId: Number(id) }));
  if (scope === "training" && id) return res.json(getRanking({ trainingId: Number(id) }));
  res.json(getRanking({}));
});

// ---------- Activity resolution (QR entrypoint) ----------
participantRouter.get("/activity/:token", (req, res) => {
  const userId = req.user!.id;
  const activity = getActivityByToken(req.params.token);
  if (!activity) return res.status(404).json({ error: "Atividade não encontrada" });

  const enrolled = db
    .prepare("SELECT 1 FROM enrollments WHERE class_id = ? AND user_id = ?")
    .get(activity.class_id, userId);
  if (!enrolled) return res.status(403).json({ error: "Você não está matriculado nesta turma" });

  const base = {
    id: activity.id,
    session_id: activity.session_id,
    type: activity.type,
    name: activity.name,
    description: activity.description,
    status: activity.status,
    config: JSON.parse(activity.config || "{}"),
    points_config: JSON.parse(activity.points_config || "{}"),
  };

  if (activity.type === "checkin") {
    const already = db.prepare("SELECT * FROM checkins WHERE session_id = ? AND user_id = ?").get(activity.session_id, userId);
    return res.json({ ...base, already, sessionDate: activity.session_date, sessionStart: activity.session_start_time });
  }
  if (activity.type === "checkout") {
    const already = db.prepare("SELECT * FROM checkouts WHERE session_id = ? AND user_id = ?").get(activity.session_id, userId);
    return res.json({ ...base, already });
  }
  if (activity.type === "quiz") {
    const questions = db
      .prepare("SELECT id, question, type, options, time_limit_seconds, order_index FROM quiz_questions WHERE activity_id = ? ORDER BY order_index")
      .all(activity.id)
      .map((q: any) => ({ ...q, options: JSON.parse(q.options) }));
    const answered = db
      .prepare(
        `SELECT question_id FROM quiz_responses WHERE user_id = ? AND question_id IN (SELECT id FROM quiz_questions WHERE activity_id = ?)`
      )
      .all(userId, activity.id)
      .map((r: any) => r.question_id);
    return res.json({ ...base, questions, answeredQuestionIds: answered });
  }
  if (activity.type === "wordcloud") {
    const myWords = db.prepare("SELECT word FROM wordcloud_entries WHERE activity_id = ? AND user_id = ?").all(activity.id, userId);
    const words = db
      .prepare(`SELECT LOWER(TRIM(word)) as w, COUNT(*) as count FROM wordcloud_entries WHERE activity_id = ? GROUP BY w ORDER BY count DESC`)
      .all(activity.id);
    return res.json({ ...base, myWords, words });
  }
  if (activity.type === "dynamic") {
    const already = db.prepare("SELECT * FROM dynamic_completions WHERE activity_id = ? AND user_id = ?").get(activity.id, userId);
    return res.json({ ...base, already });
  }
  if (activity.type === "survey") {
    const questions = db
      .prepare("SELECT * FROM survey_questions WHERE activity_id = ? ORDER BY order_index")
      .all(activity.id)
      .map((q: any) => ({ ...q, options: JSON.parse(q.options) }));
    const answered = db
      .prepare(
        `SELECT survey_question_id FROM survey_responses WHERE user_id = ? AND survey_question_id IN (SELECT id FROM survey_questions WHERE activity_id = ?)`
      )
      .all(userId, activity.id)
      .map((r: any) => r.survey_question_id);
    return res.json({ ...base, questions, answeredQuestionIds: answered });
  }
  res.json(base);
});

function afterScoreUpdate(userId: number, sessionId: number | null) {
  const unlocked = evaluateAchievements(userId);
  if (sessionId) {
    getIO().to(sessionRoom(sessionId)).emit("ranking:update", { sessionId });
  }
  return unlocked;
}

// ---------- Check-in ----------
participantRouter.post("/checkin/:token", (req, res) => {
  const userId = req.user!.id;
  const activity = getActivityByToken(req.params.token);
  if (!activity || activity.type !== "checkin") return res.status(404).json({ error: "Atividade de check-in não encontrada" });
  if (activity.status !== "open") return res.status(400).json({ error: "Check-in não está aberto no momento" });

  const existing = db.prepare("SELECT * FROM checkins WHERE session_id = ? AND user_id = ?").get(activity.session_id, userId);
  if (existing) return res.status(409).json({ error: "Você já fez check-in neste encontro", checkin: existing });

  const start = new Date(`${activity.session_date}T${activity.session_start_time}:00`);
  const now = new Date();
  const toleranceMs = (activity.checkin_tolerance_minutes || 0) * 60000;
  let status: "early" | "on_time" | "late";
  if (now.getTime() < start.getTime()) status = "early";
  else if (now.getTime() <= start.getTime() + toleranceMs) status = "on_time";
  else status = "late";

  const pointsConfig = { ...getSettings(), ...JSON.parse(activity.points_config || "{}") };
  const pointsMap: any = { early: pointsConfig.early ?? pointsConfig.checkin_early, on_time: pointsConfig.on_time ?? pointsConfig.checkin_on_time, late: pointsConfig.late ?? pointsConfig.checkin_late };
  const points = pointsMap[status] ?? 0;

  db.prepare(
    "INSERT INTO checkins (session_id, activity_id, user_id, status, points_earned) VALUES (?, ?, ?, ?, ?)"
  ).run(activity.session_id, activity.id, userId, status, points);

  addPoints({ userId, classId: activity.class_id, sessionId: activity.session_id, activityId: activity.id, source: "checkin", points, description: `Check-in (${status})` });

  const count = (db.prepare("SELECT COUNT(*) as c FROM checkins WHERE session_id = ?").get(activity.session_id) as any).c;
  getIO().to(sessionRoom(activity.session_id)).emit("checkin:new", { sessionId: activity.session_id, count, userName: req.user!.name, status });

  const unlocked = afterScoreUpdate(userId, activity.session_id);
  res.status(201).json({ status, points, totalPoints: totalPointsForUser(userId), unlockedAchievements: unlocked });
});

// ---------- Check-out ----------
participantRouter.post("/checkout/:token", (req, res) => {
  const userId = req.user!.id;
  const activity = getActivityByToken(req.params.token);
  if (!activity || activity.type !== "checkout") return res.status(404).json({ error: "Atividade de check-out não encontrada" });
  if (activity.status !== "open") return res.status(400).json({ error: "Check-out não está aberto no momento" });

  const existing = db.prepare("SELECT * FROM checkouts WHERE session_id = ? AND user_id = ?").get(activity.session_id, userId);
  if (existing) return res.status(409).json({ error: "Você já fez check-out neste encontro" });

  const pointsConfig = { ...getSettings(), ...JSON.parse(activity.points_config || "{}") };
  const points = pointsConfig.points ?? pointsConfig.checkout ?? 10;

  db.prepare("INSERT INTO checkouts (session_id, activity_id, user_id, points_earned) VALUES (?, ?, ?, ?)").run(
    activity.session_id,
    activity.id,
    userId,
    points
  );
  addPoints({ userId, classId: activity.class_id, sessionId: activity.session_id, activityId: activity.id, source: "checkout", points, description: "Check-out" });

  const unlocked = afterScoreUpdate(userId, activity.session_id);
  const totalPoints = totalPointsForUser(userId);
  const ranking = getRanking({ sessionId: activity.session_id });
  const position = ranking.find((r) => r.id === userId)?.position ?? null;

  res.status(201).json({ points, totalPoints, position, unlockedAchievements: unlocked });
});

// ---------- Quiz answer ----------
participantRouter.post("/activity/:token/quiz-answer", (req, res) => {
  const userId = req.user!.id;
  const { question_id, selected_index, response_time_ms } = req.body;
  const activity = getActivityByToken(req.params.token);
  if (!activity || activity.type !== "quiz") return res.status(404).json({ error: "Quiz não encontrado" });

  const question = db.prepare("SELECT * FROM quiz_questions WHERE id = ? AND activity_id = ?").get(question_id, activity.id) as any;
  if (!question) return res.status(404).json({ error: "Pergunta não encontrada" });

  const existing = db.prepare("SELECT 1 FROM quiz_responses WHERE question_id = ? AND user_id = ?").get(question_id, userId);
  if (existing) return res.status(409).json({ error: "Você já respondeu esta pergunta" });

  const correct = Number(selected_index) === question.correct_index;
  let points = 0;
  if (correct) {
    const timeLimitMs = question.time_limit_seconds * 1000;
    const clampedTime = Math.max(0, Math.min(response_time_ms ?? timeLimitMs, timeLimitMs));
    const speedRatio = 1 - clampedTime / timeLimitMs;
    const bonus = Math.round(question.speed_bonus_max * Math.max(0, speedRatio));
    points = question.points + bonus;
  }

  db.prepare(
    "INSERT INTO quiz_responses (question_id, user_id, selected_index, correct, response_time_ms, points_earned) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(question_id, userId, selected_index, correct ? 1 : 0, response_time_ms ?? 0, points);

  if (points > 0) {
    addPoints({ userId, classId: activity.class_id, sessionId: activity.session_id, activityId: activity.id, source: "quiz", points, description: `Quiz: ${question.question.slice(0, 40)}` });
  }

  const answeredCount = (db.prepare("SELECT COUNT(*) as c FROM quiz_responses WHERE question_id = ?").get(question_id) as any).c;
  getIO().to(activityRoom(activity.id)).emit("quiz:answer:count", { questionId: question_id, count: answeredCount });

  const unlocked = afterScoreUpdate(userId, activity.session_id);
  res.status(201).json({ correct, points, totalPoints: totalPointsForUser(userId), unlockedAchievements: unlocked });
});

// ---------- Wordcloud ----------
participantRouter.post("/activity/:token/wordcloud", (req, res) => {
  const userId = req.user!.id;
  const { word } = req.body;
  const activity = getActivityByToken(req.params.token);
  if (!activity || activity.type !== "wordcloud") return res.status(404).json({ error: "Atividade não encontrada" });
  if (activity.status !== "open") return res.status(400).json({ error: "Atividade não está aberta no momento" });
  if (!word || !word.trim()) return res.status(400).json({ error: "Palavra vazia" });

  const config = JSON.parse(activity.config || "{}");
  const maxChars = config.max_chars ?? 30;
  const trimmed = word.trim().slice(0, maxChars);

  const priorCount = (
    db.prepare("SELECT COUNT(*) as c FROM wordcloud_entries WHERE activity_id = ? AND user_id = ?").get(activity.id, userId) as any
  ).c;
  if (!config.allow_multiple && priorCount >= 1) {
    return res.status(409).json({ error: "Você já enviou sua palavra para esta atividade" });
  }

  const anonymous = !!config.anonymous;
  db.prepare("INSERT INTO wordcloud_entries (activity_id, user_id, word) VALUES (?, ?, ?)").run(
    activity.id,
    anonymous ? null : userId,
    trimmed
  );

  let points = 0;
  if (priorCount === 0) {
    const pointsConfig = { ...getSettings(), ...JSON.parse(activity.points_config || "{}") };
    points = pointsConfig.per_word ?? pointsConfig.wordcloud_participation ?? 30;
    addPoints({ userId, classId: activity.class_id, sessionId: activity.session_id, activityId: activity.id, source: "wordcloud", points, description: "Chuva de palavras" });
  }

  const words = db
    .prepare(`SELECT LOWER(TRIM(word)) as w, COUNT(*) as count FROM wordcloud_entries WHERE activity_id = ? GROUP BY w ORDER BY count DESC`)
    .all(activity.id);
  getIO().to(activityRoom(activity.id)).emit("wordcloud:update", { activityId: activity.id, words });

  const unlocked = afterScoreUpdate(userId, activity.session_id);
  res.status(201).json({ points, totalPoints: totalPointsForUser(userId), unlockedAchievements: unlocked });
});

// ---------- Dynamic ----------
participantRouter.post("/activity/:token/dynamic-complete", (req, res) => {
  const userId = req.user!.id;
  const activity = getActivityByToken(req.params.token);
  if (!activity || activity.type !== "dynamic") return res.status(404).json({ error: "Dinâmica não encontrada" });
  if (activity.status !== "open") return res.status(400).json({ error: "Dinâmica não está aberta no momento" });

  const existing = db.prepare("SELECT 1 FROM dynamic_completions WHERE activity_id = ? AND user_id = ?").get(activity.id, userId);
  if (existing) return res.status(409).json({ error: "Você já concluiu esta dinâmica" });

  const pointsConfig = { ...getSettings(), ...JSON.parse(activity.points_config || "{}") };
  const points = pointsConfig.completion ?? pointsConfig.dynamic_completion ?? 50;

  db.prepare("INSERT INTO dynamic_completions (activity_id, user_id, points_earned) VALUES (?, ?, ?)").run(activity.id, userId, points);
  addPoints({ userId, classId: activity.class_id, sessionId: activity.session_id, activityId: activity.id, source: "dynamic", points, description: activity.name });

  const count = (db.prepare("SELECT COUNT(*) as c FROM dynamic_completions WHERE activity_id = ?").get(activity.id) as any).c;
  getIO().to(sessionRoom(activity.session_id)).emit("dynamic:update", { activityId: activity.id, count });

  const unlocked = afterScoreUpdate(userId, activity.session_id);
  res.status(201).json({ points, totalPoints: totalPointsForUser(userId), unlockedAchievements: unlocked });
});

// ---------- Survey ----------
participantRouter.post("/activity/:token/survey", (req, res) => {
  const userId = req.user!.id;
  const { answers } = req.body as { answers: Array<{ question_id: number; answer_text?: string; answer_rating?: number }> };
  const activity = getActivityByToken(req.params.token);
  if (!activity || activity.type !== "survey") return res.status(404).json({ error: "Pesquisa não encontrada" });
  if (activity.status !== "open") return res.status(400).json({ error: "Pesquisa não está aberta no momento" });

  const priorCount = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM survey_responses WHERE user_id = ? AND survey_question_id IN (SELECT id FROM survey_questions WHERE activity_id = ?)`
      )
      .get(userId, activity.id) as any
  ).c;

  const insert = db.prepare(
    "INSERT OR REPLACE INTO survey_responses (survey_question_id, user_id, answer_text, answer_rating) VALUES (?, ?, ?, ?)"
  );
  for (const a of answers) {
    insert.run(a.question_id, userId, a.answer_text ?? null, a.answer_rating ?? null);
  }

  let points = 0;
  if (priorCount === 0) {
    const pointsConfig = { ...getSettings(), ...JSON.parse(activity.points_config || "{}") };
    points = pointsConfig.per_response ?? pointsConfig.survey_response ?? 20;
    addPoints({ userId, classId: activity.class_id, sessionId: activity.session_id, activityId: activity.id, source: "survey", points, description: "Pesquisa rápida" });
  }

  const unlocked = afterScoreUpdate(userId, activity.session_id);
  res.status(201).json({ points, totalPoints: totalPointsForUser(userId), unlockedAchievements: unlocked });
});
