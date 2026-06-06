# 📄 PaperHub — Premium University Exam Preparation

> **"A premium university exam preparation environment."** — Designed to feel like VS Code for descriptive and written university examinations.

PaperHub transforms scattered PDFs, disorganized WhatsApp PYQs, and random Drives into a topic-wise, syllabus-aware preparation suite. Powered by **Groq AI** low-latency step-by-step solutions, **Llama 4 Scout Vision** OCR grading, and a distraction-free exam sandbox, PaperHub is engineered to give students the ultimate university prep workflow.

---

## 🌟 Core Product Features

### 1. 🎓 Syllabus-Aware Preparation
- Prep mapped exactly to the university structure: **Colleges** → **Branches** → **Semesters** → **Subjects** → **Units** → **Topics**.
- Prevents syllabus drift when subjects move across branches or semesters by anchoring questions to specific topics rather than static papers.

### 2. 📝 Practice & Test Arenas
- **Practice Mode**: Browse question banks with instant step-by-step solution generators, interactive hints, and a persistent AI doubts assistant drawer scoped to the current question context.
- **Test Mode**: A premium multi-select Combined Subject tests builder. Users can configure a test spanning multiple subjects, choose the scope (Full Syllabus, Unit-wise with subject collapsible accordion trees, or Topic-wise with nested unit/topic checkbox pill structures), and customize duration and question counts dynamically matched with the live question bank.

### 3. 🤖 Multimodal AI Grading Sandbox
- **Dynamic File Ingestion**: Upload handwritten answer sheets with strict client/server validations (formats: `JPG`, `PNG`, `WEBP`; size: up to **10 MB** per page).
- **Dynamic Page Limit**: Limits uploads to **3 pages per question** (capped at a maximum of **30 pages total**) to protect database bounds.
- **Sequential OCR Batching**: The server groups documents into batches of 5 to run vision OCR analysis, avoiding API payload limits. Results are consolidated, picking the student's highest-graded attempts, and synthesized into performance reports.

### 4. 📊 Scoreboard & Integrity Analytics
- **SVG Score Circle**: An animated circular tracker indicating overall performance.
- **Pacing Analytics**: Automatically tags exam speed (e.g. *Blitz*, *Optimal*, *Deliberate*) based on time spent per question.
- **Academic Trust Index**: Tracks focus violations (tab switches, focus losses, fullscreen exits) and scores integrity out of 100%.

### 5. 🖨️ High-Contrast Print & PDF Engine
- Custom print media overrides (`@media print`) ensure that when exporting reports or printing from Dark Mode, KaTeX formulas and text colors render in solid high-contrast black (`#111111`) on standard white backgrounds, eliminating overlapping text or hidden layouts.

---

## 🔒 Launch Hardening & Beta Stabilization

We implemented the following features to prepare PaperHub for 100–500 active beta users:

### 1. 📈 Real & Dynamic Progression Stats
- Replaced all hardcoded/mock progress statistics (e.g., the mockup `48%` circle and `58 Questions Available`) with dynamic calculations.
- Solved counts and percentages are fetched from `/api/subjects/[subjectId]/heatmap` and computed against total unit-level question counts in real-time.
- User profile statistics (attempts, correct questions, accuracy, and challenges) are populated via `/api/users/analytics`.

### 2. 🏫 Onboarding Recovery (College Requests)
- Added an onboarding escape hatch: if a student's college is not pre-loaded, they can request to add it from the onboarding interface.
- Created an **Admin College Requests Queue** where administrators can review, approve, or reject submissions, instantly updating the global college directory.

### 3. 🛡️ Upload Security Layer (Magic Bytes Validation)
- Secured file uploads by verifying binary magic headers (magic bytes) on the server instead of relying on spoofable MIME types or file extensions:
  - `%PDF-` verification for PDFs.
  - `PK..` verification for ZIP archives.
  - Standard byte sequences for images (`JPG`, `PNG`, `WEBP`).

### 4. 📸 Client-Side Photo Compression
- Solved high-latency uploads of high-resolution student answer photos: answer sheets are drawn onto an HTML5 Canvas, scaled (max width/height 1600px), and compressed to JPEG format (0.75 quality) in the browser before network transfer.

### 5. 🔁 Resilient Vision OCR Retries
- Created a robust retry layer (`groqRetry`) utilizing exponential backoff (up to 3 attempts) for Llama 4 Vision OCR grading API calls to mitigate network jitter or rate limits.
- On permanent failure, the session status transitions to `'failed_eval'`, preserving the student's work for manual verifier review.

### 6. ⛓️ ACID Mongoose Transactions
- Multi-document write operations (awarding XP, logging learning activities, updating streak counters, and incrementing topic-wise solved progress) are wrapped in atomic MongoDB sessions to prevent partial writes.

### 7. 🧼 Anti-XSS Sanitizer
- Integrated dual-layer HTML stripping and character-escaping sanitizer before writing feedback messages, profile data, or custom suggestions to MongoDB, neutralizing HTML and script injection vectors.

### 8. ⚡ In-Memory Cache Optimization
- Introduced an in-memory TTL caching mechanism to optimize read performance and prevent database thrashing:
  - **Leaderboard Cache**: Caches scoped rankings for 2 minutes.
  - **Recommendations Cache**: Caches AI study suggestions for 5 minutes.

### 9. 🚦 Quotas & Burst Rate Limiting
- Protected our LLM/Vision APIs from quota exhaustion. Custom rate limiters track and enforce burst and daily quotas:
  - **AI Chat**: 10 requests/min burst, 100 requests/day.
  - **AI Evaluation**: 50 evaluations/day.
  - Reaching limits yields standard `HTTP 429 Too Many Requests` status codes.

### 10. 📊 System Monitor Dashboard
- Added a high-level operational monitor panel for platform administrators to track system health, user count trends, DAU metrics, feedback categorizations, audit logs, and performance latency scores.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Core Framework** | Next.js 14 (App Router, Server Components) |
| **Styling & Motion** | Tailwind CSS + Framer Motion (Translucent glass overlays & cozy theme colors) |
| **Icons** | Lucide React |
| **Database** | MongoDB Atlas + Mongoose 9 ODM (Singleton DB connection caching) |
| **AI Integration** | Groq SDK (Llama 3.3 70B & Llama 4 Vision) |
| **Math & Formatting** | KaTeX (rendered via `remark-math` and `rehype-katex`) |
| **Code Syntax** | Prism syntax highlighting via `react-syntax-highlighter` |

---

## 📂 Project Architecture

```
paperhub-web/
├── app/
├── components/
├── lib/
├── models/
├── Raw Questions/             # Ingestion directory containing syllabus questions
├── scripts/
│   ├── seed.ts                # Database seeding script (seeds verified questions)
│   └── runBenchmarks.ts       # AI evaluation benchmark tests
├── tailwind.config.ts         # Custom palette configuration
└── tsconfig.json
```

---

## 🤖 AI Models & Integration Routing

All core AI components utilize Groq API endpoints for low-latency feedback:

| Feature / Route | Target Model | Caching Behavior | Fallback Model |
|---|---|---|---|
| **Solution Generator** (`GET /api/ai/solve`) | `llama-3.3-70b-versatile` | ✅ MongoDB cached (`question.cachedSolution`) | `llama-3.1-8b-instant` |
| **Single-Step Breakdown** (`POST /api/ai/explain-step`) | `llama-3.3-70b-versatile` | ❌ Live execution (No cache) | `llama-3.1-8b-instant` |
| **Syllabus doubts Drawer** (`POST /api/ai/chat`) | `llama-3.1-8b-instant` | ❌ Live conversation | None |
| **OCR Multimodal Evaluator** (`POST /api/ai/evaluate`) | `meta-llama/llama-4-scout-17b-16e-instruct` | ❌ sequential batching of 5 images | None |

---

## 🎨 Brand Design Tokens

PaperHub features a custom color system in `globals.css` that reduces eye strain during long-hours exam preps:

*   **Light Theme**: Off-white, peach-tinted warm cream backgrounds (`#FFF8F4` / `#FFF6F1`) combined with primary accents (`#E07A5F`).
*   **Dark Theme**: Midnight-violet velvet backgrounds (`#05040a` / `#0c0b16`) combined with electric indigo accents (`#7c66ff`).
*   **Typography**: Headings rendered in `Outfit` display font; interfaces utilize `Inter` sans-serif; code is parsed in `JetBrains Mono` / `Prism`.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+
- A running **MongoDB** cluster (Atlas or Local)
- A **Groq API Key**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/thepriyanshumishra/PaperHub-web.git
cd PaperHub-web

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env.local` file in your root directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/paperhub?retryWrites=true&w=majority
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Database Setup & Seeding
Populate your database with the university subject trees and standard exam questions:
```bash
npx tsx scripts/seed.ts
```

### 5. Running locally
Start the development server with optimized Turbo compilation:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## 📜 Development Scripts

*   `npm run dev` — Starts Next.js dev server with hot reloading.
*   `npm run build` — Compiles the optimized production distribution build.
*   `npm run lint` — Runs ESLint checks.
*   `npx tsx scripts/seed.ts` — Seeds database with course structures and questions.
