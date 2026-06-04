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
- **Test Mode**: A distraction-free onboarding wizard (Coverage Selection, Evaluation Type, Time Modes) that generates custom test sheets from live database question counts.

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
│   ├── api/
│   │   ├── ai/
│   │   │   ├── chat/          # Syllabus-scoped Q&A chat (Groq Llama 8B)
│   │   │   ├── solve/         # Step-by-step solution generation + caching
│   │   │   ├── explain-step/  # Per-step deep explanation (Groq Llama 70B)
│   │   │   └── evaluate/      # Llama 4 Vision exam OCR batching & grading endpoint
│   │   ├── onboarding/        # Onboarding branch/college persistence
│   │   ├── sessions/          # Practice/test session logs and anti-cheat tracking
│   │   └── subjects/          # Subject metadata & dynamic question counts
│   ├── onboarding/            # College/Branch/Semester selection flows
│   ├── subjects/
│   │   └── [subjectId]/
│   │       ├── page.tsx       # Subject dashboard (units, topics, repeated PYQ logs)
│   │       ├── practice/      # Practice mode carousel, hints, and AI drawer
│   │       └── test/          # Test wizard, distraction-free environment, upload, and summaries
│   └── globals.css            # Cozy typography tokens and dark-mode gradients
├── components/
│   ├── math-markdown.tsx      # Multi-parser markdown + KaTeX renderer with Mermaid sanitizer
│   ├── theme-provider.tsx     # Theme switcher engine
│   └── theme-toggle.tsx       # Light / Dark mode UI toggle
├── lib/
│   ├── db.ts                  # Singleton Mongoose DB connector
│   ├── groq.ts                # Groq AI initializer & enablement checks
│   ├── sanitizeLaTeX.ts       # Server & client LaTeX OCR validation and format correction
│   ├── generatePDF.ts         # Human-readable LaTeX format rules for plain text output
│   └── seedData.ts            # Seed database dataset (Colleges, branches, subjects, questions)
├── models/                    # Mongoose schemas (Session, Chat, Subject, Question...)
├── scripts/
│   └── seed.ts                # Database seeding script (run once on start)
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
