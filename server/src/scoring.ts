import { db } from "./db";

export const DEFAULT_POINTS = {
  checkin_early: 20,
  checkin_on_time: 15,
  checkin_late: 5,
  checkout: 10,
  quiz_correct: 100,
  quiz_speed_bonus_max: 20,
  wordcloud_participation: 30,
  dynamic_completion: 50,
  survey_response: 20,
};

export function getSettings(): typeof DEFAULT_POINTS {
  const row = db.prepare("SELECT default_points FROM settings WHERE id = 1").get() as
    | { default_points: string }
    | undefined;
  if (!row) return DEFAULT_POINTS;
  try {
    return { ...DEFAULT_POINTS, ...JSON.parse(row.default_points) };
  } catch {
    return DEFAULT_POINTS;
  }
}

export function addPoints(opts: {
  userId: number;
  classId?: number | null;
  sessionId?: number | null;
  activityId?: number | null;
  source: string;
  points: number;
  description?: string;
}) {
  db.prepare(
    `INSERT INTO points_ledger (user_id, class_id, session_id, activity_id, source, points, description)
     VALUES (@userId, @classId, @sessionId, @activityId, @source, @points, @description)`
  ).run({
    userId: opts.userId,
    classId: opts.classId ?? null,
    sessionId: opts.sessionId ?? null,
    activityId: opts.activityId ?? null,
    source: opts.source,
    points: opts.points,
    description: opts.description ?? "",
  });
}

export function totalPointsForUser(userId: number, scope?: { classId?: number; sessionId?: number; trainingId?: number }) {
  if (scope?.sessionId) {
    const row = db
      .prepare("SELECT COALESCE(SUM(points),0) as total FROM points_ledger WHERE user_id = ? AND session_id = ?")
      .get(userId, scope.sessionId) as { total: number };
    return row.total;
  }
  if (scope?.classId) {
    const row = db
      .prepare("SELECT COALESCE(SUM(points),0) as total FROM points_ledger WHERE user_id = ? AND class_id = ?")
      .get(userId, scope.classId) as { total: number };
    return row.total;
  }
  if (scope?.trainingId) {
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(pl.points),0) as total FROM points_ledger pl
         JOIN classes c ON c.id = pl.class_id
         WHERE pl.user_id = ? AND c.training_id = ?`
      )
      .get(userId, scope.trainingId) as { total: number };
    return row.total;
  }
  const row = db.prepare("SELECT COALESCE(SUM(points),0) as total FROM points_ledger WHERE user_id = ?").get(userId) as {
    total: number;
  };
  return row.total;
}

export function getRanking(scope: { sessionId?: number; classId?: number; trainingId?: number }) {
  let rows: Array<{ id: number; name: string; avatar_color: string; total: number }>;
  if (scope.sessionId) {
    rows = db
      .prepare(
        `SELECT u.id, u.name, u.avatar_color, COALESCE(SUM(pl.points),0) as total
         FROM users u
         LEFT JOIN points_ledger pl ON pl.user_id = u.id AND pl.session_id = ?
         WHERE u.role = 'participant'
         GROUP BY u.id
         HAVING total > 0
         ORDER BY total DESC`
      )
      .all(scope.sessionId) as any;
  } else if (scope.classId) {
    rows = db
      .prepare(
        `SELECT u.id, u.name, u.avatar_color, COALESCE(SUM(pl.points),0) as total
         FROM users u
         LEFT JOIN points_ledger pl ON pl.user_id = u.id AND pl.class_id = ?
         WHERE u.role = 'participant'
         GROUP BY u.id
         HAVING total > 0
         ORDER BY total DESC`
      )
      .all(scope.classId) as any;
  } else if (scope.trainingId) {
    rows = db
      .prepare(
        `SELECT u.id, u.name, u.avatar_color, COALESCE(SUM(pl.points),0) as total
         FROM users u
         LEFT JOIN points_ledger pl ON pl.user_id = u.id
         LEFT JOIN classes c ON c.id = pl.class_id AND c.training_id = ?
         WHERE u.role = 'participant'
         GROUP BY u.id
         HAVING total > 0
         ORDER BY total DESC`
      )
      .all(scope.trainingId) as any;
  } else {
    rows = db
      .prepare(
        `SELECT u.id, u.name, u.avatar_color, COALESCE(SUM(pl.points),0) as total
         FROM users u
         LEFT JOIN points_ledger pl ON pl.user_id = u.id
         WHERE u.role = 'participant'
         GROUP BY u.id
         HAVING total > 0
         ORDER BY total DESC`
      )
      .all() as any;
  }
  return rows.map((r, i) => ({ position: i + 1, ...r }));
}

export function getLevels() {
  return db.prepare("SELECT * FROM levels ORDER BY order_index ASC").all() as Array<{
    id: number;
    name: string;
    min_points: number;
    order_index: number;
  }>;
}

export function currentLevel(points: number) {
  const levels = getLevels();
  let current = levels[0];
  let next: typeof levels[0] | undefined;
  for (let i = 0; i < levels.length; i++) {
    if (points >= levels[i].min_points) {
      current = levels[i];
      next = levels[i + 1];
    }
  }
  return { current, next };
}

const ACHIEVEMENT_EVALUATORS: Record<string, (userId: number, value: number) => boolean> = {
  first_checkin: (userId) => {
    const row = db.prepare("SELECT COUNT(*) as c FROM checkins WHERE user_id = ?").get(userId) as { c: number };
    return row.c >= 1;
  },
  points_threshold: (userId, value) => totalPointsForUser(userId) >= value,
  ontime_streak: (userId, value) => {
    const row = db
      .prepare("SELECT COUNT(*) as c FROM checkins WHERE user_id = ? AND status IN ('on_time','early')")
      .get(userId) as { c: number };
    return row.c >= value;
  },
  activities_count: (userId, value) => {
    const quiz = db.prepare("SELECT COUNT(*) as c FROM quiz_responses WHERE user_id = ?").get(userId) as { c: number };
    const word = db.prepare("SELECT COUNT(*) as c FROM wordcloud_entries WHERE user_id = ?").get(userId) as { c: number };
    const dyn = db.prepare("SELECT COUNT(*) as c FROM dynamic_completions WHERE user_id = ?").get(userId) as { c: number };
    const surv = db
      .prepare("SELECT COUNT(DISTINCT survey_question_id) as c FROM survey_responses WHERE user_id = ?")
      .get(userId) as { c: number };
    return quiz.c + word.c + dyn.c + surv.c >= value;
  },
  quiz_accuracy: (userId, value) => {
    const row = db
      .prepare(
        "SELECT COUNT(*) as total, SUM(correct) as correct FROM quiz_responses WHERE user_id = ?"
      )
      .get(userId) as { total: number; correct: number | null };
    if (!row.total || row.total < 5) return false;
    return ((row.correct || 0) / row.total) * 100 >= value;
  },
};

export function evaluateAchievements(userId: number) {
  const achievements = db.prepare("SELECT * FROM achievements").all() as Array<{
    id: number;
    code: string;
    criteria_type: string;
    criteria_value: number;
  }>;
  const unlockedNow: string[] = [];
  for (const a of achievements) {
    const already = db
      .prepare("SELECT 1 FROM user_achievements WHERE user_id = ? AND achievement_id = ?")
      .get(userId, a.id);
    if (already) continue;
    const evaluator = ACHIEVEMENT_EVALUATORS[a.criteria_type];
    if (evaluator && evaluator(userId, a.criteria_value)) {
      db.prepare("INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)").run(userId, a.id);
      unlockedNow.push(a.code);
    }
  }
  return unlockedNow;
}
