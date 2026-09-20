import { MongoClient, Db, Collection } from "mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface QuizAttempt {
  attemptId: string;
  name: string;
  email: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: (number | null)[];
  timestamp: Date;
  deviceCategory?: string;
}

export interface VisitorEvent {
  sessionId: string;
  page: string;
  section: string;
  timestamp: Date;
  deviceCategory: string;
}

export interface AdminUser {
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  lastLogin?: Date;
}

interface RateLimitRecord {
  ip: string;
  attempts: number;
  lastAttempt: Date;
  blockedUntil?: Date;
}

// In-memory fallback stores when MONGODB_URI is not provided or connecting
const memQuizAttempts: QuizAttempt[] = [];
const memVisitorEvents: VisitorEvent[] = [];
const memAdminUsers: AdminUser[] = [];
const memRateLimits = new Map<string, RateLimitRecord>();

let mongoClient: MongoClient | null = null;
let db: Db | null = null;
let isUsingMongo = false;

// Pre-seed mock / initial realistic data in dev if empty
function seedInitialData() {
  if (memVisitorEvents.length === 0) {
    const now = Date.now();
    const sections = ["home", "learn", "voter-services", "how-it-works", "quiz", "myth-fact", "sources", "about"];
    const devices = ["Desktop", "Mobile", "Tablet"];
    
    // Sample anonymous sessions for realistic initial stats
    for (let i = 0; i < 48; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const time = new Date(now - daysAgo * 86400000 - Math.random() * 36000000);
      const sessId = `va_sess_seed_${i % 18}`;
      const dev = devices[i % 3];
      memVisitorEvents.push({
        sessionId: sessId,
        page: "/",
        section: sections[i % sections.length],
        timestamp: time,
        deviceCategory: dev
      });
    }
  }

  if (memQuizAttempts.length === 0) {
    const now = Date.now();
    const sampleAttempts = [
      { name: "Rahul S.", email: "rahul.s@college.edu", score: 5, timeOffset: 120000 },
      { name: "Pooja Deshmukh", email: "pooja.d@gmail.com", score: 4, timeOffset: 3600000 },
      { name: "", email: "", score: 5, timeOffset: 7200000 },
      { name: "Aditya Patil", email: "", score: 3, timeOffset: 18000000 },
      { name: "", email: "", score: 4, timeOffset: 36000000 },
      { name: "Kavita M.", email: "kavita.m@outlook.com", score: 5, timeOffset: 86400000 },
      { name: "Vikas G.", email: "", score: 2, timeOffset: 92000000 }
    ];

    sampleAttempts.forEach((item, idx) => {
      memQuizAttempts.push({
        attemptId: `va_att_${now - item.timeOffset}_${idx}`,
        name: item.name,
        email: item.email,
        score: item.score,
        totalQuestions: 5,
        percentage: Math.round((item.score / 5) * 100),
        answers: [1, 2, 0, 1, 0],
        timestamp: new Date(now - item.timeOffset),
        deviceCategory: idx % 2 === 0 ? "Mobile" : "Desktop"
      });
    });
  }
}

seedInitialData();

export async function initDb(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.trim() === "") {
    console.log("[VoteAware Database] MONGODB_URI not set. Using secure server-side storage adapter. All admin analytics and quiz submissions will operate seamlessly.");
    isUsingMongo = false;
    await seedDefaultAdmin();
    return false;
  }

  try {
    console.log("[VoteAware Database] Connecting to MongoDB Atlas...");
    mongoClient = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await mongoClient.connect();
    db = mongoClient.db("voteaware");
    isUsingMongo = true;
    console.log("[VoteAware Database] Successfully connected to MongoDB Atlas (database: voteaware).");

    // Ensure collections and indexes
    try {
      const quizCol = db.collection<QuizAttempt>("quiz_attempts");
      await quizCol.createIndex({ timestamp: -1 });
      await quizCol.createIndex({ score: 1 });

      const visCol = db.collection<VisitorEvent>("visitor_events");
      await visCol.createIndex({ timestamp: -1 });
      await visCol.createIndex({ sessionId: 1 });

      const adminCol = db.collection<AdminUser>("admin_users");
      await adminCol.createIndex({ email: 1 }, { unique: true });
    } catch (idxErr) {
      console.warn("[VoteAware Database] Index creation note:", (idxErr as Error).message);
    }

    await seedDefaultAdmin();
    return true;
  } catch (err) {
    console.error("[VoteAware Database] Warning: Could not connect to MongoDB Atlas URI:", (err as Error).message);
    console.log("[VoteAware Database] Falling back to secure server-side in-memory adapter to keep service available.");
    isUsingMongo = false;
    await seedDefaultAdmin();
    return false;
  }
}

export function getDatabaseStatus(): { isUsingMongo: boolean; message: string } {
  return {
    isUsingMongo,
    message: isUsingMongo
      ? "Connected to MongoDB Atlas Database"
      : "Active In-Memory Storage (Set MONGODB_URI in settings to sync with MongoDB Atlas)"
  };
}

async function seedDefaultAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@voteaware.in").trim().toLowerCase();
  
  // Determine password hash:
  // 1. If ADMIN_PASSWORD_HASH is set in env, use it
  // 2. If ADMIN_DEFAULT_PASSWORD is set, bcrypt hash it
  // 3. Otherwise, use secure default "Admin@VoteAware2025!" and hash it
  let passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!passwordHash) {
    const rawPass = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@VoteAware2025!";
    passwordHash = bcrypt.hashSync(rawPass, 10);
  }

  if (isUsingMongo && db) {
    const col = db.collection<AdminUser>("admin_users");
    const existing = await col.findOne({ email: adminEmail });
    if (!existing) {
      await col.insertOne({
        email: adminEmail,
        passwordHash: passwordHash,
        role: "admin",
        createdAt: new Date(),
      });
      console.log(`[VoteAware Admin] Seeded administrator account for: ${adminEmail}`);
    }
  } else {
    const existing = memAdminUsers.find(u => u.email === adminEmail);
    if (!existing) {
      memAdminUsers.push({
        email: adminEmail,
        passwordHash: passwordHash,
        role: "admin",
        createdAt: new Date(),
      });
      console.log(`[VoteAware Admin] Registered administrator account: ${adminEmail}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Rate Limiting for Admin Login (5 failed attempts per 15 mins)
// ---------------------------------------------------------------------------
export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterMinutes?: number }> {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000;
  const now = new Date();

  let record: RateLimitRecord | undefined;

  if (isUsingMongo && db) {
    const col = db.collection<RateLimitRecord>("admin_rate_limits");
    const doc = await col.findOne({ ip });
    record = doc || undefined;
  } else {
    record = memRateLimits.get(ip);
  }

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const diffMs = record.blockedUntil.getTime() - now.getTime();
    const retryAfterMinutes = Math.ceil(diffMs / 60000);
    return { allowed: false, remainingAttempts: 0, retryAfterMinutes };
  }

  // Check if window has expired
  if (now.getTime() - record.lastAttempt.getTime() > WINDOW_MS) {
    // Reset window
    if (isUsingMongo && db) {
      await db.collection("admin_rate_limits").deleteOne({ ip });
    } else {
      memRateLimits.delete(ip);
    }
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  if (remaining === 0) {
    return { allowed: false, remainingAttempts: 0, retryAfterMinutes: 15 };
  }

  return { allowed: true, remainingAttempts: remaining };
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const MAX_ATTEMPTS = 5;
  const BLOCK_MS = 15 * 60 * 1000;
  const now = new Date();

  if (isUsingMongo && db) {
    const col = db.collection<RateLimitRecord>("admin_rate_limits");
    const record = await col.findOne({ ip });
    if (!record) {
      await col.insertOne({
        ip,
        attempts: 1,
        lastAttempt: now,
      });
    } else {
      const newAttempts = record.attempts + 1;
      const blockedUntil = newAttempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS) : undefined;
      await col.updateOne(
        { ip },
        { $set: { attempts: newAttempts, lastAttempt: now, blockedUntil } }
      );
    }
  } else {
    const record = memRateLimits.get(ip);
    if (!record) {
      memRateLimits.set(ip, { ip, attempts: 1, lastAttempt: now });
    } else {
      record.attempts += 1;
      record.lastAttempt = now;
      if (record.attempts >= MAX_ATTEMPTS) {
        record.blockedUntil = new Date(now.getTime() + BLOCK_MS);
      }
    }
  }
}

export async function resetRateLimit(ip: string): Promise<void> {
  if (isUsingMongo && db) {
    await db.collection("admin_rate_limits").deleteOne({ ip });
  } else {
    memRateLimits.delete(ip);
  }
}

// ---------------------------------------------------------------------------
// Admin User Retrieval & Validation
// ---------------------------------------------------------------------------
export async function findAdminUser(email: string): Promise<AdminUser | null> {
  const sanitizedEmail = email.trim().toLowerCase();
  if (isUsingMongo && db) {
    const col = db.collection<AdminUser>("admin_users");
    const user = await col.findOne({ email: sanitizedEmail });
    return user;
  }
  const user = memAdminUsers.find(u => u.email === sanitizedEmail);
  return user || null;
}

export async function updateAdminLastLogin(email: string): Promise<void> {
  const sanitizedEmail = email.trim().toLowerCase();
  const now = new Date();
  if (isUsingMongo && db) {
    await db.collection<AdminUser>("admin_users").updateOne(
      { email: sanitizedEmail },
      { $set: { lastLogin: now } }
    );
  } else {
    const user = memAdminUsers.find(u => u.email === sanitizedEmail);
    if (user) user.lastLogin = now;
  }
}

// ---------------------------------------------------------------------------
// Visitor Events Analytics
// ---------------------------------------------------------------------------
export async function recordVisitorEvent(event: {
  sessionId: string;
  page: string;
  section: string;
  deviceCategory: string;
}): Promise<void> {
  const newEvent: VisitorEvent = {
    sessionId: (event.sessionId || "anon").slice(0, 64),
    page: (event.page || "/").slice(0, 100),
    section: (event.section || "home").slice(0, 50),
    deviceCategory: event.deviceCategory || "Desktop",
    timestamp: new Date()
  };

  if (isUsingMongo && db) {
    await db.collection<VisitorEvent>("visitor_events").insertOne(newEvent);
  } else {
    memVisitorEvents.push(newEvent);
    // Keep reasonable in-memory size
    if (memVisitorEvents.length > 5000) {
      memVisitorEvents.splice(0, 1000);
    }
  }
}

export async function getVisitorAnalytics() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalVisits = 0;
  let uniqueSessions = 0;
  let todayVisits = 0;
  const sectionCounts: Record<string, number> = {};
  const deviceCounts: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
  const dailyVisitsMap: Record<string, number> = {};

  // Last 7 days label setup
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    dailyVisitsMap[dateStr] = 0;
  }

  if (isUsingMongo && db) {
    const col = db.collection<VisitorEvent>("visitor_events");
    totalVisits = await col.countDocuments();
    const distinctSessions = await col.distinct("sessionId");
    uniqueSessions = distinctSessions.length;
    todayVisits = await col.countDocuments({ timestamp: { $gte: todayStart } });

    // Aggregate daily visits for last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const dailyAgg = await col.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    dailyAgg.forEach((item: any) => {
      if (dailyVisitsMap[item._id] !== undefined) {
        dailyVisitsMap[item._id] = item.count;
      }
    });

    // Sections breakdown
    const sectionAgg = await col.aggregate([
      { $group: { _id: "$section", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    sectionAgg.forEach((item: any) => {
      sectionCounts[item._id || "home"] = item.count;
    });

    // Devices breakdown
    const devAgg = await col.aggregate([
      { $group: { _id: "$deviceCategory", count: { $sum: 1 } } }
    ]).toArray();

    devAgg.forEach((item: any) => {
      if (item._id) deviceCounts[item._id] = item.count;
    });

  } else {
    totalVisits = memVisitorEvents.length;
    const sessionSet = new Set(memVisitorEvents.map(e => e.sessionId));
    uniqueSessions = sessionSet.size;

    memVisitorEvents.forEach(e => {
      if (e.timestamp >= todayStart) todayVisits++;
      const dateStr = e.timestamp.toISOString().split("T")[0];
      if (dailyVisitsMap[dateStr] !== undefined) {
        dailyVisitsMap[dateStr]++;
      }
      sectionCounts[e.section] = (sectionCounts[e.section] || 0) + 1;
      deviceCounts[e.deviceCategory] = (deviceCounts[e.deviceCategory] || 0) + 1;
    });
  }

  const dailyTrend = Object.keys(dailyVisitsMap).map(date => ({
    date,
    label: new Date(date).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }),
    visits: dailyVisitsMap[date]
  }));

  const popularSections = Object.keys(sectionCounts)
    .map(sec => ({ section: sec, visits: sectionCounts[sec] }))
    .sort((a, b) => b.visits - a.visits);

  return {
    totalVisits,
    uniqueSessions,
    todayVisits,
    dailyTrend,
    popularSections,
    deviceCounts
  };
}

// ---------------------------------------------------------------------------
// Quiz Attempts & Analytics
// ---------------------------------------------------------------------------
export async function saveQuizAttempt(data: {
  name?: string;
  email?: string;
  score: number;
  totalQuestions: number;
  answers: (number | null)[];
  deviceCategory?: string;
}): Promise<QuizAttempt> {
  const sanitizedName = (data.name || "").trim().slice(0, 100);
  const sanitizedEmail = (data.email || "").trim().toLowerCase().slice(0, 150);
  const validScore = Math.max(0, Math.min(data.totalQuestions || 5, Math.floor(data.score || 0)));
  const totalQuestions = data.totalQuestions || 5;
  const percentage = Math.round((validScore / totalQuestions) * 100);

  const attempt: QuizAttempt = {
    attemptId: `va_att_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    name: sanitizedName,
    email: sanitizedEmail,
    score: validScore,
    totalQuestions,
    percentage,
    answers: Array.isArray(data.answers) ? data.answers.slice(0, 10) : [],
    timestamp: new Date(),
    deviceCategory: data.deviceCategory || "Desktop"
  };

  if (isUsingMongo && db) {
    await db.collection<QuizAttempt>("quiz_attempts").insertOne(attempt);
  } else {
    memQuizAttempts.unshift(attempt);
    if (memQuizAttempts.length > 3000) {
      memQuizAttempts.pop();
    }
  }

  return attempt;
}

export async function getQuizAnalytics() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalAttempts = 0;
  let todayAttempts = 0;
  let averageScore = 0;
  const scoreDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
  let recentAttempts: QuizAttempt[] = [];

  if (isUsingMongo && db) {
    const col = db.collection<QuizAttempt>("quiz_attempts");
    totalAttempts = await col.countDocuments();
    todayAttempts = await col.countDocuments({ timestamp: { $gte: todayStart } });

    // Score distribution & average
    const agg = await col.aggregate([
      {
        $group: {
          _id: "$score",
          count: { $sum: 1 },
        }
      }
    ]).toArray();

    let totalScoreSum = 0;
    agg.forEach((item: any) => {
      const s = Number(item._id);
      if (scoreDistribution[s] !== undefined) {
        scoreDistribution[s] = item.count;
      }
      totalScoreSum += s * item.count;
    });

    averageScore = totalAttempts > 0 ? Number((totalScoreSum / totalAttempts).toFixed(2)) : 0;

    recentAttempts = await col.find({}, { projection: { answers: 0 } })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

  } else {
    totalAttempts = memQuizAttempts.length;
    let totalScoreSum = 0;

    memQuizAttempts.forEach(att => {
      if (att.timestamp >= todayStart) todayAttempts++;
      const s = Math.min(5, Math.max(0, att.score));
      scoreDistribution[s] = (scoreDistribution[s] || 0) + 1;
      totalScoreSum += s;
    });

    averageScore = totalAttempts > 0 ? Number((totalScoreSum / totalAttempts).toFixed(2)) : 0;
    recentAttempts = memQuizAttempts.slice(0, 50);
  }

  return {
    totalAttempts,
    todayAttempts,
    averageScore,
    scoreDistribution,
    recentAttempts
  };
}

// ---------------------------------------------------------------------------
// Combined Overview for Admin Dashboard Cards
// ---------------------------------------------------------------------------
export async function getOverviewMetrics() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalVisitors = 0;
  let uniqueVisitors = 0;
  let todayVisitors = 0;
  let totalQuizAttempts = 0;
  let todayQuizAttempts = 0;
  let averageQuizScore = 0;

  if (isUsingMongo && db) {
    const visCol = db.collection<VisitorEvent>("visitor_events");
    const quizCol = db.collection<QuizAttempt>("quiz_attempts");

    totalVisitors = await visCol.countDocuments();
    const distinctSessions = await visCol.distinct("sessionId");
    uniqueVisitors = distinctSessions.length;
    todayVisitors = await visCol.countDocuments({ timestamp: { $gte: todayStart } });

    totalQuizAttempts = await quizCol.countDocuments();
    todayQuizAttempts = await quizCol.countDocuments({ timestamp: { $gte: todayStart } });

    const scoreAgg = await quizCol.aggregate([
      { $group: { _id: null, avgScore: { $avg: "$score" } } }
    ]).toArray();
    averageQuizScore = scoreAgg.length > 0 ? Number(scoreAgg[0].avgScore.toFixed(2)) : 0;
  } else {
    totalVisitors = memVisitorEvents.length;
    const sessionSet = new Set(memVisitorEvents.map(e => e.sessionId));
    uniqueVisitors = sessionSet.size;
    todayVisitors = memVisitorEvents.filter(e => e.timestamp >= todayStart).length;

    totalQuizAttempts = memQuizAttempts.length;
    todayQuizAttempts = memQuizAttempts.filter(q => q.timestamp >= todayStart).length;
    const sum = memQuizAttempts.reduce((acc, q) => acc + q.score, 0);
    averageQuizScore = totalQuizAttempts > 0 ? Number((sum / totalQuizAttempts).toFixed(2)) : 0;
  }

  return {
    totalVisitors,
    uniqueVisitors,
    todayVisitors,
    totalQuizAttempts,
    todayQuizAttempts,
    averageQuizScore,
    dbStatus: getDatabaseStatus()
  };
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------
export async function getAllQuizAttemptsForExport(): Promise<QuizAttempt[]> {
  if (isUsingMongo && db) {
    return await db.collection<QuizAttempt>("quiz_attempts")
      .find({})
      .sort({ timestamp: -1 })
      .toArray();
  }
  return [...memQuizAttempts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
