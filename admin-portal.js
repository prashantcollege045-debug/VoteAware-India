/**
 * VoteAware India - Private Admin Portal Client Logic
 * Handles Admin Authentication, Session Verification, Dashboard Rendering, and CSV Export
 */

const state = {
  token: localStorage.getItem("voteaware_admin_token") || "",
  admin: null,
  recentAttempts: [],
  scoreFilter: "all"
};

// ============================================================================
// DOM References
// ============================================================================
const loginContainer = document.getElementById("adminLoginContainer");
const dashboardContainer = document.getElementById("adminDashboardContainer");
const loginForm = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const loginAlertBox = document.getElementById("loginAlertBox");
const btnLoginSubmit = document.getElementById("btnLoginSubmit");
const btnLogout = document.getElementById("btnLogout");
const btnRefreshData = document.getElementById("btnRefreshData");
const btnExportCsv = document.getElementById("btnExportCsv");
const scoreFilterSelect = document.getElementById("scoreFilterSelect");

// Metric Elements
const metricTotalVisitors = document.getElementById("metricTotalVisitors");
const metricUniqueVisitors = document.getElementById("metricUniqueVisitors");
const metricTotalQuiz = document.getElementById("metricTotalQuiz");
const metricAvgScore = document.getElementById("metricAvgScore");
const metricAvgPercent = document.getElementById("metricAvgPercent");
const metricTodayVisitors = document.getElementById("metricTodayVisitors");
const metricTodayQuiz = document.getElementById("metricTodayQuiz");
const dbStatusText = document.getElementById("dbStatusText");
const dbStatusBadge = document.getElementById("dbStatusBadge");
const adminUserEmail = document.getElementById("adminUserEmail");
const lastRefreshedTime = document.getElementById("lastRefreshedTime");

// ============================================================================
// API Helper (with automatic Authorization header)
// ============================================================================
async function adminFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Session expired or unauthorized
    handleUnauthorized();
    throw new Error("Unauthorized");
  }

  return res;
}

function handleUnauthorized() {
  state.token = "";
  state.admin = null;
  localStorage.removeItem("voteaware_admin_token");
  showLoginView();
}

function showLoginView() {
  if (dashboardContainer) dashboardContainer.style.display = "none";
  if (loginContainer) loginContainer.style.display = "flex";
}

function showDashboardView() {
  if (loginContainer) loginContainer.style.display = "none";
  if (dashboardContainer) dashboardContainer.style.display = "flex";
}

function showAlert(message, isError = true) {
  if (!loginAlertBox) return;
  loginAlertBox.textContent = message;
  loginAlertBox.className = `alert-box ${isError ? "alert-error" : "alert-success"}`;
  loginAlertBox.style.display = "block";
}

function hideAlert() {
  if (loginAlertBox) loginAlertBox.style.display = "none";
}

// ============================================================================
// Authentication & Session
// ============================================================================
async function checkAuthSession() {
  if (!state.token) {
    showLoginView();
    return;
  }

  try {
    const res = await adminFetch("/api/admin/me");
    if (res.ok) {
      const data = await res.json();
      state.admin = data.admin;
      if (adminUserEmail && data.admin) {
        adminUserEmail.textContent = data.admin.email;
      }
      if (data.dbStatus) {
        updateDbStatus(data.dbStatus);
      }
      showDashboardView();
      await loadDashboardData();
    } else {
      showLoginView();
    }
  } catch (err) {
    showLoginView();
  }
}

function updateDbStatus(status) {
  if (!dbStatusText || !dbStatusBadge) return;
  if (status.isUsingMongo) {
    dbStatusText.textContent = "MongoDB Atlas Connected";
    dbStatusBadge.className = "admin-badge admin-badge-success";
  } else {
    dbStatusText.textContent = "Server Storage (Active)";
    dbStatusBadge.className = "admin-badge admin-badge-warning";
  }
}

async function handleLogin(e) {
  e.preventDefault();
  hideAlert();

  const email = emailInput ? emailInput.value.trim() : "";
  const password = passwordInput ? passwordInput.value : "";

  if (!email || !password) {
    showAlert("Please enter both email and password.");
    return;
  }

  if (btnLoginSubmit) {
    btnLoginSubmit.disabled = true;
    btnLoginSubmit.textContent = "Verifying...";
  }

  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      state.token = data.token;
      state.admin = data.admin;
      localStorage.setItem("voteaware_admin_token", data.token);

      if (adminUserEmail && data.admin) {
        adminUserEmail.textContent = data.admin.email;
      }

      showDashboardView();
      await loadDashboardData();
    } else if (res.status === 429) {
      showAlert(data.message || "Too many failed attempts. Please wait 15 minutes.");
    } else {
      showAlert(data.message || "Invalid email or password.");
    }
  } catch (err) {
    showAlert("Network or server connection failed. Please check your connection.");
  } finally {
    if (btnLoginSubmit) {
      btnLoginSubmit.disabled = false;
      btnLoginSubmit.textContent = "Sign In to Portal";
    }
  }
}

async function handleLogout() {
  try {
    await fetch("/api/admin/logout", { method: "POST" });
  } catch (e) {
    // Ignore network fail on logout
  }
  state.token = "";
  state.admin = null;
  localStorage.removeItem("voteaware_admin_token");
  showLoginView();
}

// ============================================================================
// Load Dashboard Data (Overview, Quiz Analytics, Visitor Analytics)
// ============================================================================
async function loadDashboardData() {
  if (lastRefreshedTime) {
    lastRefreshedTime.textContent = "Refreshing...";
  }

  try {
    const [overviewRes, quizRes, visitorRes] = await Promise.all([
      adminFetch("/api/admin/overview"),
      adminFetch("/api/admin/quiz-analytics"),
      adminFetch("/api/admin/visitor-analytics")
    ]);

    if (overviewRes.ok) {
      const overview = await overviewRes.json();
      renderOverview(overview);
    }

    if (quizRes.ok) {
      const quizData = await quizRes.json();
      renderQuizAnalytics(quizData);
    }

    if (visitorRes.ok) {
      const visitorData = await visitorRes.json();
      renderVisitorAnalytics(visitorData);
    }

    if (lastRefreshedTime) {
      const now = new Date();
      lastRefreshedTime.textContent = `Updated: ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    }
  } catch (err) {
    console.error("[Dashboard Load Error]", err);
  }
}

function renderOverview(data) {
  if (metricTotalVisitors) metricTotalVisitors.textContent = data.totalVisitors.toLocaleString("en-IN");
  if (metricUniqueVisitors) metricUniqueVisitors.textContent = data.uniqueVisitors.toLocaleString("en-IN");
  if (metricTotalQuiz) metricTotalQuiz.textContent = data.totalQuizAttempts.toLocaleString("en-IN");
  if (metricAvgScore) {
    metricAvgScore.innerHTML = `${data.averageQuizScore.toFixed(1)}<span style="font-size: 1.1rem; font-weight: 500; color: var(--text-muted);"> / 5</span>`;
  }
  if (metricAvgPercent) {
    const pct = Math.round((data.averageQuizScore / 5) * 100);
    metricAvgPercent.textContent = `${pct}% Overall Accuracy`;
  }
  if (metricTodayVisitors) metricTodayVisitors.textContent = data.todayVisitors.toLocaleString("en-IN");
  if (metricTodayQuiz) metricTodayQuiz.textContent = data.todayQuizAttempts.toLocaleString("en-IN");

  if (data.dbStatus) {
    updateDbStatus(data.dbStatus);
  }
}

function renderQuizAnalytics(data) {
  const dist = data.scoreDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
  const total = Math.max(1, data.totalAttempts);

  for (let s = 5; s >= 0; s--) {
    const count = dist[s] || 0;
    const pct = Math.round((count / total) * 100);
    const barEl = document.getElementById(`bar${s}`);
    const countEl = document.getElementById(`count${s}`);

    if (barEl) barEl.style.width = `${pct}%`;
    if (countEl) countEl.textContent = `${count} (${pct}%)`;
  }

  // Store and render recent attempts
  state.recentAttempts = data.recentAttempts || [];
  renderRecentAttemptsTable();
}

function renderVisitorAnalytics(data) {
  // Render daily trend
  const trendContainer = document.getElementById("dailyTrendContainer");
  if (trendContainer && Array.isArray(data.dailyTrend)) {
    trendContainer.innerHTML = "";
    const maxVisits = Math.max(1, ...data.dailyTrend.map(d => d.visits));

    data.dailyTrend.forEach(item => {
      const heightPct = Math.max(8, Math.round((item.visits / maxVisits) * 100));
      const col = document.createElement("div");
      col.className = "trend-col";
      col.innerHTML = `
        <div class="trend-count">${item.visits}</div>
        <div class="trend-bar" style="height: ${heightPct}%;"></div>
        <div class="trend-date">${item.label.split(",")[0]}</div>
      `;
      trendContainer.appendChild(col);
    });
  }

  // Render popular sections
  const sectionsList = document.getElementById("popularSectionsList");
  if (sectionsList && Array.isArray(data.popularSections)) {
    sectionsList.innerHTML = "";
    const topSections = data.popularSections.slice(0, 5);
    const maxSecVisits = Math.max(1, ...topSections.map(s => s.visits));

    const sectionLabels = {
      home: "Home / Hero Section",
      learn: "Learn & Article 326",
      "voter-services": "Smart Voter Services Finder",
      "how-it-works": "How Voting Works (EVM / VVPAT)",
      quiz: "Voter Awareness Quiz",
      "myth-fact": "Myth vs Fact Verified Directory",
      sources: "Official ECI Sources & Portals",
      about: "About CEP Project"
    };

    topSections.forEach(s => {
      const label = sectionLabels[s.section] || s.section;
      const pct = Math.round((s.visits / maxSecVisits) * 100);

      const row = document.createElement("div");
      row.style.marginBottom = "0.4rem";
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.2rem;">
          <span>${label}</span>
          <span>${s.visits} visits</span>
        </div>
        <div style="height:6px; background:var(--bg-secondary); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${pct}%; background:var(--civic-saffron); border-radius:3px;"></div>
        </div>
      `;
      sectionsList.appendChild(row);
    });
  }
}

function renderRecentAttemptsTable() {
  const tbody = document.getElementById("quizResponsesTableBody");
  const badgeCount = document.getElementById("quizBadgeCount");
  if (!tbody) return;

  const filtered = state.recentAttempts.filter(att => {
    if (state.scoreFilter === "all") return true;
    return att.score === Number(state.scoreFilter);
  });

  if (badgeCount) {
    badgeCount.textContent = `${filtered.length} of ${state.recentAttempts.length} records`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No quiz responses recorded matching this filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(att => {
    const formattedDate = new Date(att.timestamp).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });

    const nameDisplay = att.name ? escapeHtml(att.name) : '<span style="color:var(--text-muted); font-style:italic;">Anonymous</span>';
    const emailDisplay = att.email ? escapeHtml(att.email) : '<span style="color:var(--text-muted); font-style:italic;">—</span>';

    let scoreBadgeColor = "#15803D; background:#DCFCE7; border:1px solid #BBF7D0;";
    if (att.score <= 2) scoreBadgeColor = "#DC2626; background:#FEF2F2; border:1px solid #FECACA;";
    else if (att.score <= 3) scoreBadgeColor = "#B45309; background:#FEF3C7; border:1px solid #FDE68A;";

    return `
      <tr>
        <td style="font-family:monospace; font-size:0.775rem; color:var(--text-muted);">${escapeHtml(att.attemptId)}</td>
        <td style="font-weight:600; color:var(--text-primary);">${nameDisplay}</td>
        <td>${emailDisplay}</td>
        <td>
          <span style="display:inline-block; padding:0.2rem 0.5rem; border-radius:9999px; font-weight:700; font-size:0.775rem; color:${scoreBadgeColor}">
            ${att.score} / ${att.totalQuestions}
          </span>
        </td>
        <td style="font-weight:600;">${att.percentage}%</td>
        <td><span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(att.deviceCategory || "Desktop")}</span></td>
        <td style="font-size:0.825rem; white-space:nowrap;">${formattedDate}</td>
      </tr>
    `;
  }).join("");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// CSV Export Functionality
// ============================================================================
async function handleCsvExport() {
  if (!btnExportCsv) return;
  const originalText = btnExportCsv.innerHTML;
  btnExportCsv.disabled = true;
  btnExportCsv.innerHTML = `Downloading CSV...`;

  try {
    const res = await adminFetch("/api/admin/quiz/export-csv");
    if (!res.ok) {
      throw new Error("Failed to export");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    const todayStr = new Date().toISOString().slice(0, 10);
    a.download = `voteaware_quiz_responses_${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    alert("Could not export quiz responses. Please ensure you are authenticated.");
  } finally {
    btnExportCsv.disabled = false;
    btnExportCsv.innerHTML = originalText;
  }
}

// ============================================================================
// Event Listeners
// ============================================================================
if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

if (btnLogout) {
  btnLogout.addEventListener("click", handleLogout);
}

if (btnRefreshData) {
  btnRefreshData.addEventListener("click", loadDashboardData);
}

if (btnExportCsv) {
  btnExportCsv.addEventListener("click", handleCsvExport);
}

if (scoreFilterSelect) {
  scoreFilterSelect.addEventListener("change", (e) => {
    state.scoreFilter = e.target.value;
    renderRecentAttemptsTable();
  });
}

// Initial session check
document.addEventListener("DOMContentLoaded", checkAuthSession);
