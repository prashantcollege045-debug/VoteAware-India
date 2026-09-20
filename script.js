/**
 * VoteAware India – Voter Awareness Program Using Digital Platform
 * Independent College Community Engagement Project (CEP)
 * Pure Vanilla JavaScript with Multi-Language Support (English, Hindi, Marathi)
 */

import {
  TRANSLATIONS,
  MYTH_TRANSLATIONS,
  QUIZ_TRANSLATIONS,
  SERVICE_TRANSLATIONS,
  ELIGIBILITY_TRANSLATIONS
} from "./translations.js";

// ============================================================================
// Centralized Project Configuration
// ============================================================================
const CONFIG = {
  project: {
    name: "VoteAware India",
    subTitle: "Voter Awareness Program Using Digital Platform",
    category: "College Community Engagement Project (CEP)",
    academicYear: "2024-2025",
    neutralityStatement: "This educational platform is strictly non-partisan and does not endorse or promote any political party or candidate.",
    verificationNote: "Information should be verified with current official ECI instructions."
  },

  officialUrls: {
    votersPortal: "https://voters.eci.gov.in/",
    electoralSearch: "https://electoralsearch.eci.gov.in/",
    eciPortal: "https://www.eci.gov.in/",
    evmVvpat: "https://www.eci.gov.in/evm-vvpat",
    helpline: "1950"
  },

  qualifyingDates: ["1st January", "1st April", "1st July", "1st October"]
};

// ============================================================================
// State Management
// ============================================================================
const state = {
  theme: localStorage.getItem("voteaware_theme") || "light",
  language: localStorage.getItem("voteaware_lang") || "en",
  activeFinderKey: "register",
  lastEligibilityData: null,
  quiz: {
    currentIndex: 0,
    score: 0,
    userAnswers: [null, null, null, null, null],
    answered: false,
    isComplete: false,
    participant: { name: "", email: "" }
  }
};

// Quiz feedback result messages by language
const QUIZ_RESULT_MESSAGES = {
  en: {
    perfect: "Outstanding! You answered all 5 questions correctly and have a clear understanding of basic voting rules and procedures in India.",
    good: (score, total) => `Good effort! You answered ${score} out of ${total} correctly. Review the sections on electoral rolls and EVMs to strengthen your civic knowledge.`,
    retry: (score, total) => `You answered ${score} out of ${total} correctly. Explore the educational sections above to learn more about the voting process in India, then retake the quiz!`
  },
  hi: {
    perfect: "उत्कृष्ट! आपने सभी 5 प्रश्नों के सही उत्तर दिए हैं और आपको भारत में मतदान के बुनियादी नियमों और प्रक्रियाओं की स्पष्ट समझ है।",
    good: (score, total) => `शानदार प्रयास! आपने ${total} में से ${score} प्रश्नों के सही उत्तर दिए। अपनी चुनावी समझ को और मजबूत करने के लिए मतदाता सूची और EVM से जुड़े अनुभागों को पढ़ें।`,
    retry: (score, total) => `आपने ${total} में से ${score} प्रश्नों के सही उत्तर दिए। भारत में मतदान प्रक्रिया के बारे में अधिक जानने के लिए ऊपर दिए गए शैक्षिक अनुभागों को पढ़ें, फिर पुनः प्रयास करें!`
  },
  mr: {
    perfect: "उत्कृष्ट कामगिरी! आपण सर्व 5 प्रश्नांची अचूक उत्तरे दिली असून आपल्याला भारतातील मतदान नियमांची व कार्यपद्धतीची सखोल माहिती आहे.",
    good: (score, total) => `छान प्रयत्न! आपण ${total} पैकी ${score} प्रश्नांची अचूक उत्तरे दिली. आपले नागरिकत्व ज्ञान अधिक दृढ करण्यासाठी मतदार यादी व EVM वरील माहिती पुन्हा वाचा.`,
    retry: (score, total) => `आपण ${total} पैकी ${score} प्रश्नांची उत्तरे दिली. भारतातील मतदान प्रक्रियेविषयी अधिक जाणून घेण्यासाठी वरील माहिती वाचा आणि पुन्हा प्रश्नमंजुषा सोडवा!`
  }
};

// ============================================================================
// Multi-Language Management (en, hi, mr)
// ============================================================================
function initLanguage() {
  const langSelect = document.getElementById("langSelect");
  const mobileLangBtns = document.querySelectorAll(".mobile-lang-btn");

  // Synchronize language dropdown
  if (langSelect) {
    langSelect.value = state.language;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }

  // Mobile drawer language buttons
  mobileLangBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const selectedLang = btn.dataset.lang;
      if (selectedLang) {
        setLanguage(selectedLang);
      }
    });
  });

  // Apply current language on initial load
  setLanguage(state.language, false);
}

function setLanguage(lang, persist = true) {
  if (!TRANSLATIONS[lang]) {
    lang = "en";
  }

  state.language = lang;
  if (persist) {
    localStorage.setItem("voteaware_lang", lang);
  }

  // Update HTML root attributes
  document.documentElement.lang = lang;
  document.documentElement.setAttribute("data-lang", lang);

  // Update page title
  const t = TRANSLATIONS[lang];
  if (t && t.page_title) {
    document.title = t.page_title;
  }

  // Sync desktop select
  const langSelect = document.getElementById("langSelect");
  if (langSelect && langSelect.value !== lang) {
    langSelect.value = lang;
  }

  // Sync mobile buttons
  const mobileLangBtns = document.querySelectorAll(".mobile-lang-btn");
  mobileLangBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  // Translate static text nodes with data-i18n
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t && t[key] !== undefined) {
      el.textContent = t[key];
    }
  });

  // Translate HTML nodes with data-i18n-html
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    if (t && t[key] !== undefined) {
      el.innerHTML = t[key];
    }
  });

  // Translate titles with data-i18n-title
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (t && t[key] !== undefined) {
      el.setAttribute("title", t[key]);
    }
  });

  // Translate ARIA labels with data-i18n-aria
  document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const key = el.getAttribute("data-i18n-aria");
    if (t && t[key] !== undefined) {
      el.setAttribute("aria-label", t[key]);
    }
  });

  // Update dynamic Service Finder active card
  updateServiceView(state.activeFinderKey);

  // Update Checklist progress label
  updateChecklistProgress();

  // Re-render Quiz in the new language
  if (state.quiz.isComplete) {
    showQuizResults();
  } else {
    renderQuizQuestion();
  }

  // Re-render Eligibility result if user had previously evaluated
  if (state.lastEligibilityData) {
    renderEligibilityResult(state.lastEligibilityData);
  }
}

// ============================================================================
// Theme Toggle (Light / Dark Mode)
// ============================================================================
function initTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  updateThemeIcons();

  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      state.theme = state.theme === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", state.theme);
      localStorage.setItem("voteaware_theme", state.theme);
      updateThemeIcons();
    });
  }
}

function updateThemeIcons() {
  const sunIcon = document.querySelector(".theme-icon-light") || document.querySelector(".sun-icon");
  const moonIcon = document.querySelector(".theme-icon-dark") || document.querySelector(".moon-icon");
  if (!sunIcon || !moonIcon) return;

  if (state.theme === "dark") {
    sunIcon.style.display = "none";
    moonIcon.style.display = "inline-block";
  } else {
    sunIcon.style.display = "inline-block";
    moonIcon.style.display = "none";
  }
}

// ============================================================================
// Accessibility Controls: Font Size Scaling & High Contrast Mode
// ============================================================================
function initAccessibility() {
  const btnDec = document.getElementById("btnTextDec");
  const btnNorm = document.getElementById("btnTextNorm");
  const btnInc = document.getElementById("btnTextInc");
  const btnContrast = document.getElementById("btnContrastToggle");

  const fontSizes = ["small", "normal", "large", "larger"];
  let currentFontIndex = 1; // "normal"

  function updateFontSize(index) {
    currentFontIndex = Math.max(0, Math.min(fontSizes.length - 1, index));
    const size = fontSizes[currentFontIndex];
    document.documentElement.setAttribute("data-font-size", size);
    localStorage.setItem("voteaware_font_size", size);

    if (btnDec) btnDec.classList.toggle("active", currentFontIndex === 0);
    if (btnNorm) btnNorm.classList.toggle("active", currentFontIndex === 1);
    if (btnInc) btnInc.classList.toggle("active", currentFontIndex >= 2);
  }

  const savedFontSize = localStorage.getItem("voteaware_font_size");
  if (savedFontSize) {
    const idx = fontSizes.indexOf(savedFontSize);
    if (idx !== -1) updateFontSize(idx);
  }

  if (btnDec) btnDec.addEventListener("click", () => updateFontSize(currentFontIndex - 1));
  if (btnNorm) btnNorm.addEventListener("click", () => updateFontSize(1));
  if (btnInc) btnInc.addEventListener("click", () => updateFontSize(currentFontIndex + 1));

  // High contrast mode
  let isHighContrast = localStorage.getItem("voteaware_contrast") === "high";
  function applyContrast(enable) {
    if (enable) {
      document.documentElement.setAttribute("data-contrast", "high");
      if (btnContrast) btnContrast.classList.add("active");
    } else {
      document.documentElement.removeAttribute("data-contrast");
      if (btnContrast) btnContrast.classList.remove("active");
    }
    localStorage.setItem("voteaware_contrast", enable ? "high" : "normal");
  }

  if (isHighContrast) applyContrast(true);

  if (btnContrast) {
    btnContrast.addEventListener("click", () => {
      isHighContrast = !isHighContrast;
      applyContrast(isHighContrast);
    });
  }
}

// ============================================================================
// Smart Service Finder ("What do you need today?")
// ============================================================================
function initHomeServiceFinder() {
  const pills = document.querySelectorAll(".finder-pill-btn");
  const select = document.getElementById("homeNeedSelect");

  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      const need = pill.dataset.need;
      if (need) {
        state.activeFinderKey = need;
        updateServiceView(need);
      }
    });
  });

  if (select) {
    select.addEventListener("change", () => {
      state.activeFinderKey = select.value;
      updateServiceView(select.value);
    });
  }

  updateServiceView(state.activeFinderKey);
}

function updateServiceView(key) {
  const resultLead = document.getElementById("finderResultLead");
  const resultDesc = document.getElementById("finderResultDesc");
  const resultLink = document.getElementById("finderResultLink");
  const pills = document.querySelectorAll(".finder-pill-btn");
  const select = document.getElementById("homeNeedSelect");

  if (!resultLead || !resultDesc || !resultLink) return;

  const currentLang = state.language || "en";
  const localizedServices = SERVICE_TRANSLATIONS[currentLang] || SERVICE_TRANSLATIONS.en;
  const data = localizedServices[key] || SERVICE_TRANSLATIONS.en[key];
  if (!data) return;

  resultLead.textContent = data.lead;
  resultDesc.textContent = data.desc;
  resultLink.href = data.url;
  resultLink.textContent = data.btnText;

  if (data.url.startsWith("http")) {
    resultLink.setAttribute("target", "_blank");
    resultLink.setAttribute("rel", "noopener noreferrer");
  } else {
    resultLink.removeAttribute("target");
    resultLink.removeAttribute("rel");
  }

  pills.forEach(p => {
    p.classList.toggle("active", p.dataset.need === key);
  });

  if (select && select.value !== key) {
    select.value = key;
  }
}

// ============================================================================
// Before You Vote Checklist
// ============================================================================
function initChecklist() {
  const checkboxes = document.querySelectorAll(".checklist-checkbox");
  const resetBtn = document.getElementById("btnResetChecklist");

  // Restore saved state
  try {
    const saved = JSON.parse(localStorage.getItem("voteaware_checklist") || "[]");
    if (Array.isArray(saved)) {
      checkboxes.forEach((cb, i) => {
        if (saved[i]) cb.checked = true;
      });
    }
  } catch (e) {
    // Ignore invalid storage
  }

  checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
      saveChecklistState();
      updateChecklistProgress();
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      checkboxes.forEach(cb => { cb.checked = false; });
      saveChecklistState();
      updateChecklistProgress();
    });
  }

  updateChecklistProgress();
}

function saveChecklistState() {
  const checkboxes = document.querySelectorAll(".checklist-checkbox");
  const states = Array.from(checkboxes).map(cb => cb.checked);
  localStorage.setItem("voteaware_checklist", JSON.stringify(states));
}

function updateChecklistProgress() {
  const countEl = document.getElementById("checklistProgressCount");
  if (!countEl) return;

  const checkboxes = document.querySelectorAll(".checklist-checkbox");
  const total = checkboxes.length || 6;
  const checked = Array.from(checkboxes).filter(cb => cb.checked).length;

  const lang = state.language || "en";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const template = t.checklist_status_tmpl || "Ready for Polling Day: {checked} of 6 steps checked";

  countEl.textContent = template.replace("{checked}", checked);
}

// ============================================================================
// Mobile Menu Navigation
// ============================================================================
function initMobileMenu() {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const drawer = document.getElementById("mobileNavDrawer");
  if (!menuBtn || !drawer) return;

  function closeDrawer() {
    menuBtn.setAttribute("aria-expanded", "false");
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function openDrawer() {
    menuBtn.setAttribute("aria-expanded", "true");
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isExpanded = menuBtn.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  // Close drawer when any mobile link is clicked
  const mobileLinks = drawer.querySelectorAll(".mobile-nav-link");
  mobileLinks.forEach(link => {
    link.addEventListener("click", () => {
      closeDrawer();
    });
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (drawer.classList.contains("open") && !drawer.contains(e.target) && !menuBtn.contains(e.target)) {
      closeDrawer();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
      menuBtn.focus();
    }
  });

  // Reset if window resized to desktop
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024 && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });
}

// ============================================================================
// Navigation Active State Tracking
// ============================================================================
function initActiveNavigation() {
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll(".desktop-nav .nav-link");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach(link => {
            if (link.getAttribute("href") === `#${id}`) {
              link.classList.add("active");
            } else {
              link.classList.remove("active");
            }
          });
        }
      });
    },
    { threshold: 0.3 }
  );

  sections.forEach(section => observer.observe(section));
}

// ============================================================================
// Simple Eligibility Checker
// ============================================================================
function initEligibilityChecker() {
  const btnCheck = document.getElementById("btnCheckEligibilitySubmit");
  const dobInput = document.getElementById("dobInput");
  const resultBox = document.getElementById("eligibilityResult");

  if (!btnCheck || !dobInput || !resultBox) return;

  // Set maximum selectable date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dobInput.setAttribute("max", `${yyyy}-${mm}-${dd}`);

  btnCheck.addEventListener("click", () => {
    const dobValue = dobInput.value;
    const currentLang = state.language || "en";
    const eDict = ELIGIBILITY_TRANSLATIONS[currentLang] || ELIGIBILITY_TRANSLATIONS.en;

    if (!dobValue) {
      alert(eDict.alert_no_dob || "Please select your date of birth.");
      dobInput.focus();
      return;
    }

    const birthDate = new Date(dobValue);
    if (isNaN(birthDate.getTime())) {
      alert(eDict.alert_invalid_dob || "Please enter a valid date.");
      return;
    }

    // Exact age calculation
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    state.lastEligibilityData = { years, months, days };
    renderEligibilityResult(state.lastEligibilityData);
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function renderEligibilityResult({ years, months, days }) {
  const resultBox = document.getElementById("eligibilityResult");
  const ageDisplay = document.getElementById("eligibilityAgeDisplay");
  const badge = document.getElementById("eligibilityStatusBadge");
  const message = document.getElementById("eligibilityMessage");
  const actions = document.getElementById("eligibilityActions");

  if (!resultBox || !ageDisplay || !badge || !message || !actions) return;

  const currentLang = state.language || "en";
  const eDict = ELIGIBILITY_TRANSLATIONS[currentLang] || ELIGIBILITY_TRANSLATIONS.en;

  resultBox.style.display = "block";
  ageDisplay.textContent = eDict.calculated_age_tmpl
    .replace("{years}", years)
    .replace("{months}", months)
    .replace("{days}", days);

  if (years >= 18) {
    badge.textContent = eDict.badge_eligible;
    badge.style.backgroundColor = "var(--civic-green-light)";
    badge.style.color = "var(--civic-green)";
    message.innerHTML = eDict.msg_eligible;
    actions.innerHTML = `
      <a href="https://voters.eci.gov.in/" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">${eDict.action_form6}</a>
      <a href="https://electoralsearch.eci.gov.in/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">${eDict.action_roll}</a>
    `;
  } else if (years === 17) {
    badge.textContent = eDict.badge_advance;
    badge.style.backgroundColor = "var(--civic-saffron-light)";
    badge.style.color = "var(--civic-saffron)";
    message.innerHTML = eDict.msg_advance;
    actions.innerHTML = `
      <a href="https://voters.eci.gov.in/" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">${eDict.action_advance}</a>
    `;
  } else {
    const yearsLeft = Math.max(1, 17 - years);
    badge.textContent = eDict.badge_underage;
    badge.style.backgroundColor = "var(--bg-tertiary)";
    badge.style.color = "var(--text-secondary)";
    message.innerHTML = eDict.msg_underage_tmpl.replace("{yearsLeft}", yearsLeft);
    actions.innerHTML = `
      <a href="#how-it-works" class="btn btn-secondary btn-sm">${eDict.action_how_it_works}</a>
      <a href="#quiz" class="btn btn-outline btn-sm">${eDict.action_take_quiz}</a>
    `;
  }
}

// ============================================================================
// 5-Question Quick Voter Awareness Quiz (Multilingual)
// ============================================================================
function initQuiz() {
  const btnStart = document.getElementById("btnStartQuiz");
  const btnSkip = document.getElementById("btnSkipInfo");
  const btnNext = document.getElementById("btnQuizNext");
  const btnRestart = document.getElementById("btnRestartQuiz");
  const introView = document.getElementById("quizIntroView");
  const activeView = document.getElementById("quizActiveView");
  const inputName = document.getElementById("quizParticipantName");
  const inputEmail = document.getElementById("quizParticipantEmail");

  const startQuizFlow = (isAnonymous = false) => {
    if (isAnonymous) {
      state.quiz.participant = { name: "", email: "" };
    } else {
      const n = inputName ? inputName.value.trim() : "";
      const e = inputEmail ? inputEmail.value.trim() : "";
      state.quiz.participant = { name: n, email: e };
    }

    if (introView) introView.style.display = "none";
    if (activeView) activeView.style.display = "block";
    renderQuizQuestion();
  };

  if (btnStart) {
    btnStart.addEventListener("click", () => startQuizFlow(false));
  }

  if (btnSkip) {
    btnSkip.addEventListener("click", () => startQuizFlow(true));
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      const currentLang = state.language || "en";
      const qList = QUIZ_TRANSLATIONS[currentLang] || QUIZ_TRANSLATIONS.en;
      const totalQuestions = qList.length;

      if (state.quiz.currentIndex < totalQuestions - 1) {
        state.quiz.currentIndex++;
        state.quiz.answered = false;
        renderQuizQuestion();
      } else {
        state.quiz.isComplete = true;
        showQuizResults();
      }
    });
  }

  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      state.quiz.currentIndex = 0;
      state.quiz.score = 0;
      state.quiz.userAnswers = [null, null, null, null, null];
      state.quiz.answered = false;
      state.quiz.isComplete = false;

      const resultsView = document.getElementById("quizResultsView");
      if (resultsView && activeView) {
        resultsView.classList.remove("visible");
        resultsView.style.display = "none";
        activeView.style.display = "block";
      }

      renderQuizQuestion();
    });
  }
}

function renderQuizQuestion() {
  const currentLang = state.language || "en";
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const qList = QUIZ_TRANSLATIONS[currentLang] || QUIZ_TRANSLATIONS.en;
  const qData = qList[state.quiz.currentIndex];
  if (!qData) return;

  const qNumber = document.getElementById("quizQuestionNumber");
  const scorePill = document.getElementById("quizScorePill");
  const qText = document.getElementById("quizQuestionText");
  const optionsList = document.getElementById("quizOptionsList");
  const expBox = document.getElementById("quizExplanationBox");
  const btnNext = document.getElementById("btnQuizNext");
  const hintText = document.getElementById("quizHintText");

  if (!qText || !optionsList) return;

  const totalQuestions = qList.length;
  if (qNumber) {
    const progTmpl = t.quiz_question_progress_tmpl || "Question {current} of {total}";
    qNumber.textContent = progTmpl
      .replace("{current}", state.quiz.currentIndex + 1)
      .replace("{total}", totalQuestions);
  }

  if (scorePill) {
    const scoreTmpl = t.quiz_score_tmpl || "Score: {score}";
    scorePill.textContent = scoreTmpl.replace("{score}", state.quiz.score);
  }

  qText.textContent = qData.question;

  const existingAnswer = state.quiz.userAnswers[state.quiz.currentIndex];
  const hasAnswered = existingAnswer !== null && existingAnswer !== undefined;
  state.quiz.answered = hasAnswered;

  optionsList.innerHTML = "";
  const prefixes = ["A", "B", "C", "D"];

  qData.options.forEach((optText, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-option-btn";
    btn.innerHTML = `
      <span class="quiz-option-prefix">${prefixes[index]}</span>
      <span class="quiz-option-text">${optText}</span>
    `;

    if (hasAnswered) {
      btn.disabled = true;
      if (index === qData.correctIndex) {
        btn.classList.add("correct");
      } else if (index === existingAnswer) {
        btn.classList.add("incorrect");
      }
    } else {
      btn.addEventListener("click", () => handleOptionClick(index, btn, qData));
    }

    optionsList.appendChild(btn);
  });

  if (hasAnswered) {
    displayFeedback(existingAnswer === qData.correctIndex, qData);
    if (btnNext) {
      btnNext.style.display = "inline-flex";
      btnNext.textContent = state.quiz.currentIndex === totalQuestions - 1
        ? (t.btn_quiz_submit || "Submit Quiz")
        : (t.btn_quiz_next || "Next");
    }
    if (hintText) hintText.style.display = "none";
  } else {
    if (expBox) {
      expBox.classList.remove("visible");
      expBox.style.display = "none";
    }
    if (btnNext) btnNext.style.display = "none";
    if (hintText) {
      hintText.style.display = "inline";
      hintText.textContent = t.quiz_hint_default || "Choose one option to proceed.";
    }
  }
}

function handleOptionClick(selectedIndex, clickedBtn, qData) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;
  state.quiz.userAnswers[state.quiz.currentIndex] = selectedIndex;

  const isCorrect = selectedIndex === qData.correctIndex;
  if (isCorrect) {
    state.quiz.score++;
  }

  const currentLang = state.language || "en";
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const scorePill = document.getElementById("quizScorePill");
  if (scorePill) {
    const scoreTmpl = t.quiz_score_tmpl || "Score: {score}";
    scorePill.textContent = scoreTmpl.replace("{score}", state.quiz.score);
  }

  const allBtns = document.querySelectorAll(".quiz-option-btn");
  allBtns.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === qData.correctIndex) {
      btn.classList.add("correct");
    } else if (idx === selectedIndex && !isCorrect) {
      btn.classList.add("incorrect");
    }
  });

  displayFeedback(isCorrect, qData);

  const btnNext = document.getElementById("btnQuizNext");
  const hintText = document.getElementById("quizHintText");
  const qList = QUIZ_TRANSLATIONS[currentLang] || QUIZ_TRANSLATIONS.en;
  const totalQuestions = qList.length;

  if (btnNext) {
    btnNext.style.display = "inline-flex";
    btnNext.textContent = state.quiz.currentIndex === totalQuestions - 1
      ? (t.btn_quiz_submit || "Submit Quiz")
      : (t.btn_quiz_next || "Next");
  }
  if (hintText) hintText.style.display = "none";
}

function displayFeedback(isCorrect, qData) {
  const expBox = document.getElementById("quizExplanationBox");
  const title = document.getElementById("quizFeedbackTitle");
  const text = document.getElementById("quizExplanationText");

  if (!expBox || !title || !text) return;

  const currentLang = state.language || "en";
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const prefixes = ["A", "B", "C", "D"];

  if (isCorrect) {
    title.textContent = t.quiz_feedback_correct || "✓ Correct Answer!";
    title.style.color = "var(--civic-green)";
  } else {
    const incorrectTmpl = t.quiz_feedback_incorrect || "✗ Incorrect. Correct Answer: Option {option}";
    title.textContent = incorrectTmpl.replace("{option}", prefixes[qData.correctIndex]);
    title.style.color = "var(--civic-red)";
  }

  text.textContent = qData.explanation;
  expBox.classList.add("visible");
  expBox.style.display = "block";
}

function showQuizResults() {
  const activeView = document.getElementById("quizActiveView");
  const resultsView = document.getElementById("quizResultsView");
  const finalScoreVal = document.getElementById("finalScoreVal");
  const finalScoreTotal = document.getElementById("finalScoreTotal");
  const feedbackTitle = document.getElementById("finalFeedbackTitle");
  const feedbackMsg = document.getElementById("finalFeedbackMsg");
  const btnRestart = document.getElementById("btnRestartQuiz");

  if (!activeView || !resultsView) return;

  activeView.style.display = "none";
  resultsView.style.display = "flex";
  resultsView.classList.add("visible");

  const currentLang = state.language || "en";
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const qList = QUIZ_TRANSLATIONS[currentLang] || QUIZ_TRANSLATIONS.en;
  const total = qList.length;
  const score = state.quiz.score;

  if (finalScoreVal) finalScoreVal.textContent = score;
  if (finalScoreTotal) finalScoreTotal.textContent = t.quiz_score_out_of || "OUT OF 5";

  const scoreTmpl = t.quiz_your_score_tmpl || "Your Score: {score}/{total}";
  if (feedbackTitle) feedbackTitle.textContent = scoreTmpl.replace("{score}", score).replace("{total}", total);

  const msgGroup = QUIZ_RESULT_MESSAGES[currentLang] || QUIZ_RESULT_MESSAGES.en;
  if (feedbackMsg) {
    if (score === total) {
      feedbackMsg.textContent = msgGroup.perfect;
    } else if (score >= 3) {
      feedbackMsg.textContent = typeof msgGroup.good === "function" ? msgGroup.good(score, total) : msgGroup.good;
    } else {
      feedbackMsg.textContent = typeof msgGroup.retry === "function" ? msgGroup.retry(score, total) : msgGroup.retry;
    }
  }

  if (btnRestart) {
    btnRestart.textContent = t.btn_quiz_retake || "Retake Quiz";
  }

  // Save quiz attempt for project-level analysis (Optional details)
  try {
    const getDeviceCategory = () => {
      if (window.innerWidth < 768) return "Mobile";
      if (window.innerWidth < 1024) return "Tablet";
      return "Desktop";
    };

    fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.quiz.participant.name || "",
        email: state.quiz.participant.email || "",
        score: state.quiz.score,
        totalQuestions: total,
        answers: state.quiz.userAnswers,
        deviceCategory: getDeviceCategory()
      })
    }).catch(() => {});
  } catch (err) {
    // Fail silently without disrupting user experience
  }
}

// ============================================================================
// Smooth Scrolling Helper for Navigation Buttons
// ============================================================================
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      const targetId = link.getAttribute("href");
      if (targetId === "#" || targetId === "") return;
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    });
  });
}

// ============================================================================
// Privacy-Conscious Anonymous Visitor Analytics
// ============================================================================
function initVisitorAnalytics() {
  let sessionId = sessionStorage.getItem("voteaware_session_id");
  if (!sessionId) {
    sessionId = "va_s_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    sessionStorage.setItem("voteaware_session_id", sessionId);
  }

  const getDeviceCategory = () => {
    if (window.innerWidth < 768) return "Mobile";
    if (window.innerWidth < 1024) return "Tablet";
    return "Desktop";
  };

  // Track initial page visit
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        page: window.location.pathname,
        section: "home",
        deviceCategory: getDeviceCategory()
      }),
      keepalive: true
    }).catch(() => {});
  } catch (e) {}

  // Track educational section visits using IntersectionObserver
  const trackedSections = new Set(["home"]);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          if (id && !trackedSections.has(id)) {
            trackedSections.add(id);
            try {
              fetch("/api/analytics/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId,
                  page: window.location.pathname,
                  section: id,
                  deviceCategory: getDeviceCategory()
                }),
                keepalive: true
              }).catch(() => {});
            } catch (err) {}
          }
        }
      });
    }, { threshold: 0.35 });

    document.querySelectorAll("main section[id]").forEach(sec => observer.observe(sec));
  }
}

// ============================================================================
// Application Bootstrap
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initAccessibility();
  initHomeServiceFinder();
  initChecklist();
  initMobileMenu();
  initActiveNavigation();
  initEligibilityChecker();
  initQuiz();
  initSmoothScroll();
  initLanguage();
  initVisitorAnalytics();
});
