<div align="center">

<h1>⚡ RYcode</h1>

<p><strong>AI 驱动的交互式编程学习平台</strong></p>

<p>导入任意教材 → AI 自动出题 → Monaco 编辑器作答 → AI 深度批改 → 记忆薄弱点强化</p>

<p>
  <a href="README_en.md">English</a> | 简体中文
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

## ✨ 功能特性

- 🧠 **AI 智能出题** — 根据教材内容和用户薄弱点自动生成个性化练习题（简单/中等/困难三档）
- 📝 **Monaco 代码编辑器** — VS Code 同款编辑器，支持语法高亮、自动补全、真实文件系统
- 🔄 **实时代码执行** — 集成 Judge0，支持 Python / JavaScript / Java / C++ / Go 等主流语言
- 📊 **AI 深度批改** — 正确性、效率、可读性三维评分 + 优化建议 + 参考代码
- 💬 **AI 对话答疑** — 提交后可向 AI 追问，深度理解错误原因
- 📚 **多源教材导入** — 支持 URL（廖雪峰等）/ PDF / Markdown / GitHub 仓库一键导入
- 🎯 **记忆式学习** — 追踪薄弱知识点，下次出题自动针对性强化
- 🔑 **多模型支持** — Gemini / OpenAI / Claude / DeepSeek / Ollama 等，可在设置页自由配置

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/rycode.git
cd rycode

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key（至少配置一个 AI 提供商）

# 初始化数据库
npx prisma migrate dev

# 启动开发服务器（前端 + 后端同时启动）
npm run dev
```

浏览器访问 [http://localhost:5173](http://localhost:5173)

> 也可以在应用内「设置」页面配置 AI API Key，无需重启服务器。

### 环境变量说明

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | SQLite 数据库路径 | ✅ |
| `JWT_SECRET` | JWT 签名密钥（生产环境请修改） | ✅ |
| `GEMINI_API_KEY` | Google Gemini API Key | ⬜ 至少一个 |
| `OPENAI_API_KEY` | OpenAI API Key | ⬜ 至少一个 |
| `ANTHROPIC_API_KEY` | Anthropic Claude API Key | ⬜ 至少一个 |
| `JUDGE0_API_KEY` | Judge0 代码执行（[免费申请](https://rapidapi.com/judge0-official/api/judge0-ce)） | ⬜ 可选 |

## 🛠️ 技术栈

**前端**
- React 18 + TypeScript + Vite
- Tailwind CSS（自定义 Editorial Synth-Dark 设计系统）
- Monaco Editor（VS Code 同款编辑器内核）
- Framer Motion + Recharts

**后端**
- Express.js + TypeScript（ESM）
- Prisma ORM + SQLite
- JWT 认证 + AES-256 密钥加密存储

**AI 集成**
- 统一 Adapter 层，支持 Gemini / OpenAI / Claude
- 兼容任意 OpenAI 格式接口（DeepSeek、SiliconFlow、Ollama 等）
- 支持用户自定义默认 Provider

## 📋 Roadmap

- [x] AI 智能出题（简单/中等/困难）
- [x] Monaco 编辑器 + 真实文件系统
- [x] AI 代码批改 + 对话答疑
- [x] 多源教材导入（URL/PDF/MD/GitHub）
- [x] 多 AI 提供商 + 自定义 Provider
- [x] Judge0 代码执行引擎
- [x] 薄弱点记忆与个性化出题
- [ ] 移动端适配
- [ ] 多用户协作 / 班级模式
- [ ] VS Code 插件

## 📄 License

[MIT](./LICENSE) © 2025 RYcode
