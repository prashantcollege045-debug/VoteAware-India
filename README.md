# VoteAware India – Voter Awareness Program Using Digital Platform
**College Community Engagement Project (CEP) — Phase 1**

VoteAware India is a modern, responsive, accessible, and strictly non-partisan digital voter-awareness platform developed as a College Community Engagement Project (CEP). The platform educates young voters, students, and first-time electors about the constitutional framework, electoral procedures, digital voter services, and technical integrity of Indian democratic elections.

---

## 1. What Was Created

A lightweight, high-performance web application constructed entirely with **semantic HTML5**, **pure CSS3**, and **vanilla modern JavaScript**, without relying on heavy external frontend frameworks:

- **`index.html`**: A fully structured single-page application entry point containing all 17 specified sections, complete with accessibility skip links, ARIA labels, semantic landmark elements, OpenGraph metadata, and custom SVG civic illustrations.
- **`style.css`**: A comprehensive design system supporting light mode and high-contrast dark mode using CSS custom properties, responsive mobile-first typography, fluid layouts, custom interactive components, and a specialized `@media print` certificate stylesheet.
- **`script.js`**: Core client-side architecture driven by a centralized `CONFIG` object. Implements interactive date-of-birth age calculations with qualifying date evaluation, state-managed 12-question quiz engine with instant pedagogical explanations, 7 learning modules with local progress tracking, dynamic myth vs. fact filtering, sanitized XSS-proof digital pledge generator, in-app survey validation, and a live keyword search overlay.
- **`README.md`**: Detailed technical and institutional documentation for academic review.

---

## 2. How to Run It

### Standard Development Server
The project is configured with Vite for instant static file serving on port 3000:

```bash
# Install dependencies (if not already installed)
npm install

# Start the local development server (binds to port 3000)
npm run dev
```

### Static Execution
Because the application is written in standard HTML5, CSS3, and modern JavaScript, `index.html` can also be previewed by opening it directly in any modern web browser or serving it via any standard static HTTP server (e.g. `npx serve .`, `python3 -m http.server 3000`, or GitHub Pages).

### Production Build
```bash
npm run build
```
The production bundle will be generated into the `dist/` directory.

---

## 3. Features Completed (Phase 1)

### Centralized Architecture
- **`CONFIG` Object**: Centralizes project metadata, official Election Commission of India (ECI) URLs, statutory qualifying dates, multilingual dictionaries, quiz questions, myth busters, and learning modules.

### Core Sections & Modules
1. **Home / Hero**: High-impact civic greeting (*“Ek Ungli. Ek Vote. Ek Responsible Citizen.”*), overview of civic participation, quick action buttons, and a custom geometric SVG civic illustration depicting ballot verification and democratic duty.
2. **Why Voter Awareness Matters**: Core democratic pillars: Constitutional Foundation (Article 326), Youth Representation, Countering Disinformation, and Ethical Informed Voting.
3. **Eligibility Checker**: Real-time Date of Birth calculator displaying exact age in years, months, and days. Evaluates 18+ eligibility as well as 17+ advance application provisions under the 2021 Amendment Act across four qualifying dates (1st Jan, 1st Apr, 1st Jul, 1st Oct). Displays statutory disclaimers and official portal buttons.
4. **Registration Guide**: 8-step visual walkthrough from eligibility to electoral roll verification, complemented by an ECI Form Guide (Forms 6, 6A, 7, and 8) and document checklist.
5. **How Voting Works**: Detailed 7-stage polling station guide from roll verification, queue protocol, polling officers' inking and signature steps, enclosed voting compartment, 7-second VVPAT verification, and exit.
6. **EVM & VVPAT**: Interactive architectural breakdown with custom vector diagrams detailing the Control Unit (CU), Ballot Unit (BU), tamper-evident standalone design, and the 7-second visual audit slip verification of the VVPAT.
7. **Voter Rights & Responsibilities**: Tabbed comparison detailing constitutional rights (Secret Ballot, Candidate KYC / Form 26, NOTA, PwD accessibility) alongside civic duties (early roll checking, rejecting inducements, debunking fake news, maintaining station discipline).
8. **Myth vs Fact Repository**: 12 categorized, evidence-based cards debunking misconceptions surrounding EPIC card vs. roll entry, 17+ advance applications, EVM hacking myths, hostel student registration, VVPAT slips, and alternative photo IDs.
9. **Official Voter Services Dashboard**: Direct, verified links to official ECI services (Form 6, Electoral Search, Application Tracking, e-EPIC download, KYC app, and National Helpline 1950).
10. **Learning Hub**: 7 modular micro-courses with key takeaways, expandable deep dives, and an interactive progress bar saved in `localStorage`.
11. **Interactive Quiz**: 12 politically neutral multiple-choice questions (4 options each) featuring single-question display, dynamic progress indicator, immediate color-coded feedback, pedagogical explanations, score percentage, and review/retry modes.
12. **Awareness Activities Timeline**: CEP project roadmap documenting pre-awareness surveys, digital platform deployment, and upcoming campus sessions. Strictly adheres to data rules: *"Data will be updated after project activity."*
13. **Awareness Survey**: 5-part interactive civic survey assessing youth electoral readiness, accompanied by neutral submission feedback and the compliance notice: *"No verified data available yet."*
14. **Digital Voter Pledge**: Generates a personalized Certificate of Civic Commitment inspired by the National Voters' Day pledge. Features strict XSS sanitization, randomized verification reference code, instant printing (`window.print()` formatted for diplomas), and native share/clipboard integration.
15. **About Project**: Institutional documentation of the college Community Engagement Project (CEP), student team charter, academic year, and strict non-partisan declaration.
16. **Contact & Support**: Student academic feedback form alongside official national voter helplines (Toll-Free 1950 and ECI New Delhi headquarters).
17. **Footer**: Neutrality statements, navigation anchors, official ECI disclaimers, and copyright information.

### Cross-Cutting Functionalities
- **Multilingual Support**: Live language switcher supporting **English**, **Hindi (हिंदी)**, and **Marathi (मराठी)**.
- **Theme Modes**: Full Light and Dark Mode toggle with automatic system preference detection and `localStorage` persistence.
- **Live Search Overlay**: Modal search filter with keyboard shortcut (`Ctrl+K` or `/`) allowing instant full-text searching across modules, myths, FAQs, and services.
- **Accessibility & Security**: Adheres to WCAG AA color contrast, responsive touch targets (44px+), visible focus rings, full keyboard accessibility, zero external CDNs, and complete absence of unsanitized `innerHTML` on user input.

---

## 4. Known Limitations (Phase 1)

1. **Client-Side Persistence Only**: In accordance with the Phase 1 specification, user quiz scores, module completion states, and dark mode preferences are stored locally via browser `localStorage`. No cloud database is connected yet.
2. **Mock Survey Collection**: Survey responses are validated and processed client-side with a feedback confirmation; they are not yet synced to a centralized MongoDB cluster or analytics dashboard.
3. **No Dynamic ECI API Verification**: Real-time EPIC lookup or electoral roll data is not directly fetched via automated APIs because the Election Commission of India requires CAPTCHA verification and OTP authentication; the platform directs users to the official portal (`voters.eci.gov.in`).

---

## 5. What Will Be Added in Phase 2

- **Backend & Database Integration**: Express.js REST API coupled with MongoDB for storing aggregated, anonymous campus survey responses and activity impact statistics.
- **Institutional Student Authentication**: College SSO / email login for students to track participation in NSS / NCC / CEP voter awareness drives.
- **AI-Powered Multilingual Civic Chatbot**: Neutral, retrieval-augmented AI assistant powered by the Gemini API to answer questions on constituency boundaries, polling dates, and candidate affidavit summaries without political bias.
- **Campus Ambassador Leaderboard**: Gamified awareness drive allowing student volunteers to organize hostel-level registration sessions.
- **Automated Survey Analytics Dashboard**: Live charts displaying aggregate before-and-after awareness percentages across college departments.
