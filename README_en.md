<div align="center">

<h1>⚡ RYcode</h1>

<p><strong>AI-powered Interactive Coding Tutor</strong></p>

<p>Import any textbook → AI generates exercises → Code in Monaco Editor → AI reviews & scores → Adaptive learning from your weak points</p>

<p>
  <a href="README.md">简体中文</a> | English
</p>

<p>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Monaco_Editor-0067B8?style=flat-square&logo=visual-studio-code&logoColor=white" alt="Monaco">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License">
</p>

</div>

---

## ✨ Features

- 🧠 **AI Problem Generation** — Automatically generates personalized exercises (easy/medium/hard) based on textbook content and your weak points
- 📝 **Monaco Code Editor** — VS Code's editor engine with syntax highlighting, autocomplete, and real filesystem
- 🔄 **Real Code Execution** — Judge0 integration supports Python, JavaScript, Java, C++, Go and more
- 📊 **AI Deep Review** — Three-dimensional scoring (correctness/efficiency/readability) + optimization suggestions + reference code
- 💬 **AI Q&A Chat** — Ask follow-up questions after submission to deeply understand your mistakes
- 📚 **Multi-source Import** — Import from URL (e.g. tutorials), PDF, Markdown, or GitHub repositories
- 🎯 **Memory Learning** — Tracks weak knowledge points and automatically targets them in future exercises
- 🔑 **Multi-model Support** — Gemini / OpenAI / Claude / DeepSeek / Ollama — configure any OpenAI-compatible provider

## 🚀 Quick Start

### Option 1: One-click Launch (Recommended)

> Only requires [Node.js 18+](https://nodejs.org)

1. Download and unzip this repo ([Download ZIP](https://github.com/1635754172a-spec/rycode/archive/refs/heads/main.zip))
2. Double-click `start.bat`
3. First run auto-installs dependencies and initializes the database — browser opens automatically

For all subsequent runs, just double-click `start.bat`.

### Option 2: Developer Mode

```bash
# Clone the repository
git clone https://github.com/1635754172a-spec/rycode.git
cd rycode

# Install dependencies + initialize database
npm install && npm run setup

# Start development server (frontend + backend)
npm run dev:all
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `*_API_KEY` | AI provider key (Gemini / OpenAI / Claude etc. — also configurable in the app's Settings page) | ⬜ At least one |
| `JUDGE0_API_KEY` | Judge0 code execution engine ([free on RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce)) | ⬜ Optional |
| `DATABASE_URL` | SQLite path, defaults to `file:./dev.db` — no change needed | ✅ |

## 📖 How It Works

### 1. Import a Textbook
Go to **Catalog** → click **Import** → paste a tutorial URL (e.g. `https://www.liaoxuefeng.com/wiki/1016959663602400`) or upload a PDF/Markdown file. RYcode will:
- Extract the table of contents with AI
- Organize lessons into units
- Fetch actual lesson content in the background for richer exercises

### 2. Generate Exercises
Click **Generate Task** on any lesson. AI generates 3 exercises simultaneously:
- 🟢 **Easy** — Covers basic concepts from the lesson
- 🟡 **Medium** — Applies concepts with moderate complexity  
- 🔴 **Hard** — Challenges with edge cases and optimization

Weak points from previous submissions automatically influence the exercise content.

### 3. Code & Run
The Monaco Editor provides a full IDE experience:
- Real filesystem — files persist between sessions
- Run code instantly with the **Run** button (Judge0)
- See stdout/stderr output in the terminal panel
- Syntax highlighting for Python, JS, TypeScript, Java, C++, Go

### 4. AI Review
Click **Submit for Review**. AI analyzes your code against the problem:
- **Correctness** (50%) — Logic accuracy, test case handling
- **Efficiency** (30%) — Time/space complexity
- **Readability** (20%) — Naming, structure, comments
- Provides optimized reference code
- Identifies weak knowledge points for future targeting

### 5. Chat with AI
After review, expand the **Ask AI** panel to have a multi-turn conversation about your submission. Ask things like:
- "Why is my loop inefficient?"
- "Can you explain the optimized solution?"
- "What edge cases did I miss?"

## 🛠️ Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS (custom Editorial Synth-Dark design system)
- Monaco Editor (VS Code's editor engine)
- Framer Motion + Recharts

**Backend**
- Express.js + TypeScript (ESM)
- Prisma ORM + SQLite
- JWT authentication + AES-256 encrypted key storage

**AI Integration**
- Unified Adapter layer supporting Gemini / OpenAI / Claude
- Compatible with any OpenAI-format API (DeepSeek, SiliconFlow, Ollama, etc.)
- User-configurable default provider

## 📄 License

[MIT](./LICENSE) © 2025 RYcode
