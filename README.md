# 📄 PaperHub-web

> **"A premium university exam preparation environment."** — Designed to feel like VS Code for exam prep.

PaperHub is a university-focused, structured exam preparation platform specifically designed for descriptive/written university examinations. It transforms scattered PDFs, WhatsApp past year papers (PYQs), and random Drives into a topic-wise, structured, syllabus-aware preparation hub with AI-assisted step-by-step solutions.

---

## ✨ Features

- **🎓 Syllabus-Aware Topic Structure**: No more searching through giant files. Prep is mapped directly to semesters, branches, subjects, units, and specific concepts.
- **✍️ Descriptive Exam Workflows**: Built specifically for written, descriptive, and step-oriented university examinations (not just MCQs).
- **💡 Step-by-Step AI Solutions**: Solutions are generated to match university standards using Llama-3.3-70b via the Groq API.
- **🔍 "Explain This Step" Interaction**: Hover over complex derivations or logical jumps to view contextual micro-explanations in clean popovers without losing your place.
- **📝 Exam/Test Mode**: A distraction-free, full-screen environment with a timer and subtle tab-switching (focus interruption) alerts.
- **🌗 Cozy Design System**: Warm peach off-white backgrounds in Light Mode (`#FFF8F4`) and clean dark charcoal colors in Dark Mode (`#121212`), tailored for long study sessions.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/), [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) with [Mongoose ODM](https://mongoosejs.com/)
- **AI Core**: [Groq SDK](https://github.com/groq/groq-typescript) (`llama-3.3-70b-versatile`)
- **Formatting**: [React Markdown](https://github.com/remarkjs/react-markdown), [KaTeX](https://katex.org/) (for mathematical formulas/equations)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) and a running [MongoDB](https://www.mongodb.com/) instance (local or Atlas cluster).

### 2. Clone and Install
```bash
git clone https://github.com/thepriyanshumishra/PaperHub-web.git
cd PaperHub-web
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```

### 4. Seed the Database
Seed the database with sample university colleges, branches, subjects, and past year questions:
```bash
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📂 Project Structure

```
├── app/                  # Next.js App Router (pages & API endpoints)
│   ├── api/              # API routes (solving, explanation, chat, onboarding, sessions)
│   ├── onboarding/       # Onboarding flow pages
│   ├── subjects/         # Subject preparation, practice, and test modes
│   └── globals.css       # Global styles & theme colors
├── components/           # Reusable UI components (Theme, Math Markdown renderers)
├── lib/                  # Database connections, Groq client, seed dataset
├── models/               # Mongoose Schema models (College, Branch, Subject, Question, Session, Chat)
├── scripts/              # Seed utility scripts
├── tailwind.config.ts    # Tailwind styling configurations
└── tsconfig.json         # TypeScript configuration
```
