import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import {
  initDb,
  getOverviewMetrics,
  getQuizAnalytics,
  getVisitorAnalytics,
  saveQuizAttempt,
  recordVisitorEvent,
  getAllQuizAttemptsForExport,
  findAdminUser,
  updateAdminLastLogin,
  checkRateLimit,
  recordFailedLogin,
  resetRateLimit,
  getDatabaseStatus
} from "./server/db";

dotenv.config();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "voteaware_civic_platform_secure_jwt_token_key_2025";

interface AuthenticatedRequest extends Request {
  admin?: {
    email: string;
    role: string;
  };
}

async function startServer() {
  const app = express();

  // Trust proxy for accurate client IP identification (e.g. behind reverse proxy / Cloud Run)
  app.set("trust proxy", true);

  app.use(express.json({ limit: "500kb" }));
  app.use(express.urlencoded({ extended: true, limit: "500kb" }));
  app.use(cookieParser());

  // Security Headers (No exposure of server internals)
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.removeHeader("X-Powered-By");
    next();
  });

  // Helper to resolve client IP
  function getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.socket.remoteAddress || "127.0.0.1";
  }

  // --------------------------------------------------------------------------
  // Admin Authentication Middleware
  // --------------------------------------------------------------------------
  function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else if (req.cookies && req.cookies.voteaware_admin_token) {
      token = req.cookies.voteaware_admin_token;
    }

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Admin authentication required to access this resource."
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string; role: string };
      req.admin = decoded;
      next();
    } catch (err) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Session expired or invalid token. Please sign in again."
      });
    }
  }

  // --------------------------------------------------------------------------
  // Public API Endpoints
  // --------------------------------------------------------------------------

  // Anonymous Visitor Event Tracking
  app.post("/api/analytics/track", async (req: Request, res: Response) => {
    try {
      const { sessionId, page, section, deviceCategory } = req.body;
      await recordVisitorEvent({
        sessionId: String(sessionId || "anon"),
        page: String(page || "/"),
        section: String(section || "home"),
        deviceCategory: String(deviceCategory || "Desktop")
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to log event" });
    }
  });

  // Public Quiz Attempt Submission (Optional Name & Email)
  app.post("/api/quiz/submit", async (req: Request, res: Response) => {
    try {
      const { name, email, score, totalQuestions, answers, deviceCategory } = req.body;

      // Ensure no sensitive or unexpected personal fields are processed
      const safeScore = typeof score === "number" ? score : 0;
      const safeTotal = typeof totalQuestions === "number" ? totalQuestions : 5;

      const attempt = await saveQuizAttempt({
        name: typeof name === "string" ? name : "",
        email: typeof email === "string" ? email : "",
        score: safeScore,
        totalQuestions: safeTotal,
        answers: Array.isArray(answers) ? answers : [],
        deviceCategory: typeof deviceCategory === "string" ? deviceCategory : "Desktop"
      });

      res.status(201).json({
        success: true,
        attemptId: attempt.attemptId,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        message: "Quiz attempt saved successfully for project analysis."
      });
    } catch (err) {
      console.error("[Quiz Submission Error]", err);
      res.status(500).json({ error: "Failed to record quiz response" });
    }
  });

  // --------------------------------------------------------------------------
  // Admin Authentication Endpoints
  // --------------------------------------------------------------------------

  // Admin Login with Rate Limiting
  app.post("/api/admin/login", async (req: Request, res: Response) => {
    try {
      const ip = getClientIp(req);
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      // 1. Rate Limiting Check (Max 5 attempts per 15 min window)
      const limitCheck = await checkRateLimit(ip);
      if (!limitCheck.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          message: `Too many failed login attempts from this network. Please try again after ${limitCheck.retryAfterMinutes || 15} minutes.`
        });
      }

      // 2. Validate Credentials against DB / Env
      const admin = await findAdminUser(email);
      if (!admin) {
        await recordFailedLogin(ip);
        return res.status(401).json({
          error: "Invalid credentials",
          message: "Incorrect administrator email or password."
        });
      }

      const isPasswordValid = bcrypt.compareSync(password, admin.passwordHash);
      if (!isPasswordValid) {
        await recordFailedLogin(ip);
        return res.status(401).json({
          error: "Invalid credentials",
          message: "Incorrect administrator email or password."
        });
      }

      // 3. Reset rate limiting on successful authentication
      await resetRateLimit(ip);
      await updateAdminLastLogin(admin.email);

      // 4. Generate signed session token (8 hours)
      const token = jwt.sign(
        { email: admin.email, role: admin.role },
        JWT_SECRET,
        { expiresIn: "8h" }
      );

      // 5. Set secure HTTP-only cookie
      res.cookie("voteaware_admin_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 8 * 3600 * 1000
      });

      return res.json({
        success: true,
        token,
        admin: {
          email: admin.email,
          role: admin.role
        },
        message: "Administrator authentication successful."
      });
    } catch (err) {
      console.error("[Admin Login Error]", err);
      return res.status(500).json({ error: "Internal server error during authentication." });
    }
  });

  // Admin Logout
  app.post("/api/admin/logout", (_req: Request, res: Response) => {
    res.clearCookie("voteaware_admin_token");
    res.json({ success: true, message: "Logged out successfully." });
  });

  // Admin Session Verification
  app.get("/api/admin/me", requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      authenticated: true,
      admin: req.admin,
      dbStatus: getDatabaseStatus()
    });
  });

  // --------------------------------------------------------------------------
  // Protected Admin Data & Analytics Endpoints
  // --------------------------------------------------------------------------

  // Overview metrics (Totals, Today's stats, Averages)
  app.get("/api/admin/overview", requireAdminAuth, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const overview = await getOverviewMetrics();
      res.json(overview);
    } catch (err) {
      console.error("[Admin Overview Error]", err);
      res.status(500).json({ error: "Failed to retrieve overview metrics" });
    }
  });

  // Quiz Analytics & Recent Attempts
  app.get("/api/admin/quiz-analytics", requireAdminAuth, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const analytics = await getQuizAnalytics();
      res.json(analytics);
    } catch (err) {
      console.error("[Quiz Analytics Error]", err);
      res.status(500).json({ error: "Failed to retrieve quiz analytics" });
    }
  });

  // Visitor Analytics & Popular Sections
  app.get("/api/admin/visitor-analytics", requireAdminAuth, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const analytics = await getVisitorAnalytics();
      res.json(analytics);
    } catch (err) {
      console.error("[Visitor Analytics Error]", err);
      res.status(500).json({ error: "Failed to retrieve visitor analytics" });
    }
  });

  // Export Quiz Responses as CSV (Protected)
  app.get("/api/admin/quiz/export-csv", requireAdminAuth, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const attempts = await getAllQuizAttemptsForExport();

      // Format CSV Header
      const header = ["Attempt ID", "Participant Name", "Participant Email", "Score", "Total Questions", "Percentage (%)", "Device Category", "Completion Date (UTC)"];
      
      const rows = attempts.map(att => [
        `"${att.attemptId.replace(/"/g, '""')}"`,
        `"${(att.name || "Anonymous").replace(/"/g, '""')}"`,
        `"${(att.email || "Not Provided").replace(/"/g, '""')}"`,
        att.score,
        att.totalQuestions,
        `${att.percentage}%`,
        `"${(att.deviceCategory || "Desktop").replace(/"/g, '""')}"`,
        `"${new Date(att.timestamp).toISOString()}"`
      ]);

      const csvContent = [header.join(","), ...rows.map(r => r.join(","))].join("\r\n");

      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="voteaware_quiz_responses_${timestamp}.csv"`);
      res.status(200).send(csvContent);
    } catch (err) {
      console.error("[CSV Export Error]", err);
      res.status(500).json({ error: "Failed to export quiz data" });
    }
  });

  // --------------------------------------------------------------------------
  // Private Admin Route handling
  // --------------------------------------------------------------------------
  app.get("/admin-portal", (_req, res) => {
    if (process.env.NODE_ENV !== "production") {
      res.redirect("/admin-portal.html");
    } else {
      res.sendFile(path.join(process.cwd(), "dist", "admin-portal.html"));
    }
  });

  // --------------------------------------------------------------------------
  // Vite Integration (Dev Middleware / Production Static Fallback)
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Initialize Database asynchronously
  await initDb();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[VoteAware India] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server Start Failed]", err);
  process.exit(1);
});
