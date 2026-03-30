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
git clone https://github.com/1635754172a-spec/rycode.git
cd rycode

# 安装依赖
npm install

# 初始化数据库（自动创建 SQLite 文件，无需安装数据库）
npm run setup

# 启动开发服务器（前端 + 后端同时启动）
npm run dev:all
```

浏览器访问 [http://localhost:5173](http://localhost:5173)

### 环境变量说明

| 变量 | 说明 | 必填 |
|------|------|------|
| `*_API_KEY` | AI 提供商 API Key（Gemini / OpenAI / Claude 等，也可在应用设置页添加） | ⬜ 至少一个 |
| `JUDGE0_API_KEY` | Judge0 代码执行引擎（[RapidAPI 免费申请](https://rapidapi.com/judge0-official/api/judge0-ce)） | ⬜ 可选 |
| `DATABASE_URL` | SQLite 数据库路径，默认 `file:./dev.db`，无需修改 | ✅ |

## 📖 核心功能详解

### 1. 教材导入
进入**教材目录** → 点击**导入** → 粘贴教程 URL（如 `https://www.liaoxuefeng.com/wiki/1016959663602400`）或上传 PDF/Markdown 文件。RYcode 将：
- 用 AI 提取目录结构，自动组织成章节/课时
- 后台并发抓取每个课时的真实内容（廖雪峰等 gitsite 站点）
- 内容存入数据库，供 AI 出题时参考

### 2. 生成练习题
点击任意课时的**生成任务**，AI 同时生成 3 道题：
- 🟢 **简单** — 课时基础概念直接应用
- 🟡 **中等** — 结合实际场景，需要一定设计
- 🔴 **困难** — 边界情况、性能优化、综合运用

历史提交中识别出的薄弱点会自动注入 prompt，出题更有针对性。

### 3. 编写与运行代码
Monaco 编辑器提供完整 IDE 体验：
- **真实文件系统** — 文件持久化，切换页面不丢失
- **一键运行** — Judge0 引擎执行，显示 stdout/stderr
- **多语言支持** — Python、JavaScript、TypeScript、Java、C++、Go
- **题目侧边栏** — 可折叠的题目描述 + 分层提示

### 4. AI 深度批改
点击**提交评审**，AI 从三个维度评分：
- **正确性**（权重 50%）— 逻辑准确，边界处理
- **效率**（权重 30%）— 时间/空间复杂度
- **可读性**（权重 20%）— 命名、注释、代码结构

同时返回优化版参考代码，并记录薄弱知识点供后续强化。

### 5. AI 对话答疑
批改完成后，展开底部**向 AI 提问**面板，多轮追问：
- 「为什么我的循环效率低？」
- 「解释一下优化后的方案」
- 「我还遗漏了哪些边界情况？」

### 6. 记忆与强化
- 每次批改后 AI 识别薄弱点（如「递归优化」「边界处理」）并存入数据库
- 生成下一道题时，自动加入薄弱点提示
- 首页展示 Top 5 薄弱点 + 过去 7 天评分趋势

## 🛠️ 技术栈

**前端**
- React 18 + TypeScript + Vite
- Tailwind CSS（自定义 Editorial Synth-Dark 设计系统）
- Monaco Editor（VS Code 同款编辑器内核）
- Framer Motion + Recharts

**后端**
- Express.js + TypeScript（ESM）
- Prisma ORM + SQLite（零配置本地数据库）
- JWT 认证 + AES-256 密钥加密存储

**AI 集成**
- 统一 Adapter 层，支持 Gemini / OpenAI / Claude
- 兼容任意 OpenAI 格式接口（DeepSeek、SiliconFlow、Ollama、阿里云百炼等）
- 设置页面可随时添加/切换默认 Provider

## 📄 License

[MIT](./LICENSE) © 2025 RYcode
